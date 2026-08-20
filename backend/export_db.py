"""Export SalesMind MongoDB collections to JSON backup files.

Usage:
  python export_db.py [--uri "mongodb://..."] [--db salesmind] [--out ./data_backup]
"""
import os
import sys
import json
import argparse
from pathlib import Path
from bson import json_util
from pymongo import MongoClient

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


def export_database(uri: str, db_name: str, out_dir: Path):
    print(f"[SalesMind Backup] Connecting to source database: {db_name} ...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]

    try:
        client.admin.command("ping")
        print("[SalesMind Backup] Successfully connected to MongoDB.")
    except Exception as e:
        print(f"[SalesMind Backup] Connection failed: {e}")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    summary = {}

    for col_name in COLLECTIONS:
        col = db[col_name]
        docs = list(col.find({}))
        file_path = out_dir / f"{col_name}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(json.loads(json_util.dumps(docs)), f, indent=2)
        summary[col_name] = len(docs)
        print(f"  [OK] Exported {len(docs):>4} documents from '{col_name}' -> {file_path.name}")

    manifest_path = out_dir / "backup_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "database": db_name,
            "collections": summary,
            "total_documents": sum(summary.values()),
        }, f, indent=2)

    print(f"\n[SalesMind Backup] Completed! Total documents exported: {sum(summary.values())}")
    print(f"[SalesMind Backup] Output saved to: {out_dir.resolve()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export SalesMind MongoDB collections")
    parser.add_argument("--uri", default=os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
                        help="MongoDB Connection URI")
    parser.add_argument("--db", default=os.environ.get("MONGODB_DATABASE") or os.environ.get("DB_NAME", "salesmind"),
                        help="Database Name")
    parser.add_argument("--out", default=str(Path(__file__).parent / "data_backup"),
                        help="Output directory for JSON backup files")

    args = parser.parse_args()
    export_database(args.uri, args.db, Path(args.out))
