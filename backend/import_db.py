"""Import SalesMind JSON backup files to MongoDB Atlas (or any target MongoDB database).

Usage:
  python import_db.py [--uri "mongodb+srv://..."] [--db salesmind] [--data-dir ./data_backup] [--upsert]
"""
import os
import sys
import json
import argparse
from pathlib import Path
from bson import json_util
from pymongo import MongoClient, ReplaceOne, ASCENDING

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

COLLECTIONS = [
    "users",
    "workspaces",
    "fields",
    "records",
    "activities",
    "audit_logs",
    "invites",
    "sequences",
    "enrollments",
    "messages",
    "login_attempts"
]


def ensure_indexes(db):
    print("[SalesMind Import] Ensuring indexes on target database...")
    db.users.create_index("email", unique=True)
    db.login_attempts.create_index("identifier")
    db.fields.create_index([("workspace_id", ASCENDING), ("object_type", ASCENDING)])
    db.records.create_index([("workspace_id", ASCENDING), ("object_type", ASCENDING)])
    db.audit_logs.create_index([("workspace_id", ASCENDING)])
    db.enrollments.create_index([("status", ASCENDING), ("next_run_at", ASCENDING)])
    db.enrollments.create_index([("sequence_id", ASCENDING)])
    print("[SalesMind Import] Indexes verified successfully.")


def import_database(uri: str, db_name: str, data_dir: Path, upsert: bool = True):
    print(f"[SalesMind Import] Connecting to target database: {db_name} ...")
    kwargs = {"serverSelectionTimeoutMS": 10000}
    if uri.startswith("mongodb+srv://") or "ssl=true" in uri.lower():
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass
    client = MongoClient(uri, **kwargs)
    db = client[db_name]

    try:
        client.admin.command("ping")
        print("[SalesMind Import] Successfully connected to target MongoDB database.")
    except Exception as e:
        print(f"[SalesMind Import] Connection failed: {e}")
        sys.exit(1)

    ensure_indexes(db)

    total_imported = 0
    for col_name in COLLECTIONS:
        file_path = data_dir / f"{col_name}.json"
        if not file_path.exists():
            continue

        with open(file_path, "r", encoding="utf-8") as f:
            raw_docs = json.load(f)
            docs = json_util.loads(json.dumps(raw_docs))

        if not docs:
            print(f"  - '{col_name}': 0 documents found in backup, skipping.")
            continue

        col = db[col_name]
        if upsert:
            operations = [
                ReplaceOne({"_id": doc["_id"]}, doc, upsert=True)
                for doc in docs
            ]
            result = col.bulk_write(operations, ordered=False)
            upserted_count = (result.upserted_count or 0) + (result.modified_count or 0) + (result.matched_count or 0)
            print(f"  [OK] Processed {len(docs):>4} documents for '{col_name}' (matched/upserted: {upserted_count})")
            total_imported += len(docs)
        else:
            inserted = 0
            for doc in docs:
                try:
                    col.insert_one(doc)
                    inserted += 1
                except Exception:
                    pass  # Skip if already exists
            print(f"  [OK] Inserted {inserted:>4} new documents for '{col_name}'")
            total_imported += inserted

    print(f"\n[SalesMind Import] Completed successfully! Total documents processed: {total_imported}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import SalesMind JSON backup to MongoDB")
    parser.add_argument("--uri", default=os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
                        help="Target MongoDB Connection URI (e.g. mongodb+srv://...)")
    parser.add_argument("--db", default=os.environ.get("MONGODB_DATABASE") or os.environ.get("DB_NAME", "salesmind"),
                        help="Target Database Name")
    parser.add_argument("--data-dir", default=str(Path(__file__).parent / "data_backup"),
                        help="Path to directory containing JSON backup files")
    parser.add_argument("--no-upsert", action="store_true", help="Insert only, do not upsert existing records")

    args = parser.parse_args()
    import_database(args.uri, args.db, Path(args.data_dir), upsert=not args.no_upsert)
