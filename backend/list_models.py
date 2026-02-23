"""Test Supabase connection and RPC directly"""
import os
from dotenv import load_dotenv
load_dotenv(override=True)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"SUPABASE_URL: {url}")
print(f"SUPABASE_SERVICE_ROLE_KEY: {key[:15]}... (len={len(key)})")

from supabase import create_client
supabase = create_client(url, key)

# Test 1: Simple table query
print("\n=== Test 1: Table select ===")
try:
    res = supabase.table("biotech_notes").select("id", count="exact").limit(1).execute()
    print(f"Success! Count: {res.count}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: RPC call
print("\n=== Test 2: RPC match_notes ===")
try:
    dummy_embedding = [0.0] * 3072
    res = supabase.rpc("match_notes", {
        "query_embedding": dummy_embedding,
        "match_threshold": 0.5,
        "match_count": 4,
        "p_class_level": None
    }).execute()
    print(f"Success! Results: {len(res.data)}")
except Exception as e:
    print(f"Error: {e}")
