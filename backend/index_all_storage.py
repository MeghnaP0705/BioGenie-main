import os
import tempfile
from supabase import create_client, Client
from dotenv import load_dotenv
from pdf_processor import index_pdf

load_dotenv(override=True)

BUCKET_NAME = "biotech-pdfs"
CLASSES = ['class_9', 'class_10', 'class_11', 'class_12']

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)

def index_all_from_storage():
    supabase = get_supabase_client()
    
    for class_level in CLASSES:
        print(f"\n--- Checking Storage for {class_level} ---")
        try:
            files = supabase.storage.from_(BUCKET_NAME).list(class_level)
            if not files:
                print(f"No files found in {class_level}")
                continue
                
            for f in files:
                filename = f['name']
                if not filename.lower().endswith('.pdf'):
                    continue
                
                # Check if already indexed (optional but good for performance)
                # For now, we'll just index it. pdf_processor will add to the table.
                
                filepath = f"{class_level}/{filename}"
                print(f"\nProcessing: {filepath}")
                
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp_path = tmp.name
                    try:
                        # Download from storage
                        res = supabase.storage.from_(BUCKET_NAME).download(filepath)
                        tmp.write(res)
                        tmp.close()
                        
                        # Index using existing pipeline
                        # We use the filename (without .pdf) as a temporary chapter name if not provided
                        chapter_name = filename.replace('.pdf', '').capitalize()
                        index_pdf(tmp_path, class_level.split('_')[-1], chapter_name)
                        
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
        except Exception as e:
            print(f"Error processing {class_level}: {e}")

if __name__ == "__main__":
    index_all_from_storage()
