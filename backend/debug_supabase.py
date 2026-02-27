import os
from pdf_processor import index_exists
from dotenv import load_dotenv

load_dotenv(override=True)

print(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")
print("Checking index_exists()...")
try:
    exists = index_exists()
    print(f"index_exists() returned: {exists}")
except Exception as e:
    print(f"index_exists() raised exception: {e}")
