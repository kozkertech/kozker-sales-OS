"""Test and diagnose MongoDB Atlas connectivity and CRUD capabilities.

Usage:
  python test_atlas_connection.py [--uri "mongodb+srv://..."] [--db salesmind]
"""
import os
import sys
import time
import argparse
from datetime import datetime, timezone
from pymongo import MongoClient

# Ensure safe console output across all Windows terminal code pages
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def test_connection(uri: str, db_name: str):
    print("=" * 60)
    print(" SalesMind MongoDB Atlas Connectivity Diagnostic Tool")
    print("=" * 60)
    
    masked_uri = uri
    if "@" in uri:
        prefix = uri.split("@")[0]
        suffix = uri.split("@")[1]
        protocol = prefix.split("://")[0]
        masked_uri = f"{protocol}://****:****@{suffix}"
    
    print(f"Target URI: {masked_uri}")
    print(f"Database:   {db_name}")
    print("-" * 60)

    # 1. Check dnspython for SRV records
    if uri.startswith("mongodb+srv://"):
        try:
            import dns.resolver
            print("[OK] [DNS] dnspython library is available for SRV record resolution.")
        except ImportError:
            print("[FAIL] [DNS] dnspython is NOT installed. Install with: pip install dnspython")
            sys.exit(1)

    # 2. Establish connection & ping
    print("[1/4] Connecting to MongoDB...")
    start_time = time.time()
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
        info = client.server_info()
        latency = round((time.time() - start_time) * 1000, 2)
        print(f"[OK] [1/4] Connection successful! Ping Latency: {latency}ms")
        print(f"           MongoDB Server Version: {info.get('version')}")
    except Exception as e:
        print(f"[FAIL] [1/4] Failed to connect to MongoDB: {e}")
        print("\nTroubleshooting tips for MongoDB Atlas:")
        print("  1. Verify Network Access in Atlas: ensure your current IP or 0.0.0.0/0 is whitelisted.")
        print("  2. Verify Database User: ensure the username and password in the URI are correct and url-encoded if containing special chars.")
        print("  3. Verify the URI protocol: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority")
        sys.exit(1)

    db = client[db_name]

    # 3. Test Create & Read
    print("[2/4] Testing Write (Create) & Read operations...")
    test_col = db["__test_connectivity__"]
    test_doc = {
        "diagnostic_id": "salesmind_atlas_check",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "test": True
    }
    try:
        insert_res = test_col.insert_one(test_doc)
        inserted_id = insert_res.inserted_id
        print(f"[OK] [2/4] Document created with ID: {inserted_id}")
        
        fetched = test_col.find_one({"_id": inserted_id})
        assert fetched is not None and fetched["diagnostic_id"] == "salesmind_atlas_check"
        print("[OK] [2/4] Document verified via Read operation.")
    except Exception as e:
        print(f"[FAIL] [2/4] Write/Read operation failed: {e}")
        sys.exit(1)

    # 4. Test Update & Delete
    print("[3/4] Testing Update & Delete operations...")
    try:
        update_res = test_col.update_one(
            {"_id": inserted_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "verified": True}}
        )
        assert update_res.modified_count == 1
        print("[OK] [3/4] Document updated successfully.")

        delete_res = test_col.delete_one({"_id": inserted_id})
        assert delete_res.deleted_count == 1
        print("[OK] [3/4] Document deleted and cleanup verified.")
    except Exception as e:
        print(f"[FAIL] [3/4] Update/Delete operation failed: {e}")
        sys.exit(1)

    # 5. List Collections
    print("[4/4] Inspecting existing database collections...")
    try:
        collections = db.list_collection_names()
        print(f"[OK] [4/4] Found {len(collections)} collections in '{db_name}': {', '.join(collections) if collections else '(empty database)'}")
    except Exception as e:
        print(f"[FAIL] [4/4] Failed to list collections: {e}")

    print("-" * 60)
    print("[OK] All connectivity and CRUD diagnostics passed successfully!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test MongoDB Atlas connection")
    parser.add_argument("--uri", default=os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
                        help="MongoDB URI (e.g. mongodb+srv://...)")
    parser.add_argument("--db", default=os.environ.get("MONGODB_DATABASE") or os.environ.get("DB_NAME", "salesmind"),
                        help="Database Name")
    args = parser.parse_args()
    test_connection(args.uri, args.db)
