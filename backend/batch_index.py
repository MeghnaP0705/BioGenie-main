"""
batch_index.py – Developer-only: Upload PDFs to Supabase Storage + Index into pgvector

USAGE:
    1. Create a folder: backend/pdfs/
    2. Put your Biotechnology PDFs inside it
    3. Run: python batch_index.py

The script will:
    - Upload each PDF to Supabase Storage (bucket: biotech-pdfs)
    - Extract text, chunk, embed (Gemini), and insert into Supabase pgvector
"""

import os
import sys
import fitz  # PyMuPDF
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(override=True)

TABLE_NAME = "biotech_rag_chunks"
STORAGE_BUCKET = "biotech-pdfs"
PDF_FOLDER = os.path.join(os.path.dirname(__file__), "pdfs")


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)


def ensure_storage_bucket(supabase: Client):
    """Create the storage bucket if it doesn't exist."""
    try:
        supabase.storage.get_bucket(STORAGE_BUCKET)
        print(f"   Storage bucket '{STORAGE_BUCKET}' exists")
    except Exception:
        try:
            supabase.storage.create_bucket(STORAGE_BUCKET, options={"public": False})
            print(f"   Created storage bucket '{STORAGE_BUCKET}'")
        except Exception as e:
            print(f"   Warning: Could not create bucket (may already exist): {e}")


def upload_to_storage(supabase: Client, pdf_path: str, filename: str):
    """Upload PDF file to Supabase Storage."""
    try:
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        # Upload to storage (overwrite if exists)
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=filename,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        print(f"   Uploaded to Supabase Storage: {STORAGE_BUCKET}/{filename}")
    except Exception as e:
        print(f"   Storage upload warning: {e}")


def extract_text(pdf_path: str) -> str:
    """Extract text from a local PDF file."""
    doc = fitz.open(pdf_path)
    full_text = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        if text.strip():
            full_text.append(f"[Page {page_num}]\n{text}")
    doc.close()
    return "\n\n".join(full_text)


def chunk_text(text: str, chapter: str, class_level: str, source_pdf: str) -> list[dict]:
    """Split text into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", ".", " "],
    )
    chunks = splitter.split_text(text)
    return [
        {
            "class_level": class_level,
            "chapter": chapter,
            "content_chunk": chunk,
            "source_pdf": source_pdf,
        }
        for chunk in chunks
    ]


def index_into_supabase(chunks: list[dict], supabase: Client):
    """Generate embeddings and insert into pgvector table."""
    embeddings_model = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    texts = [c["content_chunk"] for c in chunks]
    embeddings = embeddings_model.embed_documents(texts)

    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i]

    # Batch insert (50 rows at a time)
    batch_size = 50
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start:start + batch_size]
        supabase.table(TABLE_NAME).insert(batch).execute()

    return len(chunks)


def guess_chapter_name(filename: str) -> str:
    """Derive chapter name from filename by removing extension and common prefixes."""
    name = Path(filename).stem
    # Clean up common patterns
    name = name.replace("_", " ").replace("-", " ")
    return name.title()


def main():
    # Only need Supabase environment variables now
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set in .env")
        sys.exit(1)

    # Check if pdfs/ folder exists
    if not os.path.isdir(PDF_FOLDER):
        os.makedirs(PDF_FOLDER)
        print(f"Created folder: {PDF_FOLDER}")
        print(f"Please put your Biotechnology PDFs inside it, then re-run this script.")
        sys.exit(0)

    # Find all PDFs
    pdf_files = sorted([f for f in os.listdir(PDF_FOLDER) if f.lower().endswith(".pdf")])

    if not pdf_files:
        print(f"No PDF files found in: {PDF_FOLDER}")
        print("Please put your Biotechnology PDFs inside the 'pdfs/' folder.")
        sys.exit(0)

    print(f"╔══════════════════════════════════════════════════════════╗")
    print(f"║  BioGenie – Batch PDF Indexer (Developer Only)         ║")
    print(f"╚══════════════════════════════════════════════════════════╝")
    print(f"\nFound {len(pdf_files)} PDF(s) in: {PDF_FOLDER}\n")

    # Ask for class level
    class_level = input("Enter class level for ALL PDFs (9/10/11/12): ").strip()
    if class_level not in ("9", "10", "11", "12"):
        print("Invalid class level. Must be 9, 10, 11, or 12.")
        sys.exit(1)

    # Show preview
    print(f"\nPDFs to index (Class {class_level}):")
    for i, f in enumerate(pdf_files, 1):
        print(f"  {i}. {f}  →  Chapter: \"{guess_chapter_name(f)}\"")

    confirm = input(f"\nProceed with indexing? (y/n): ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        sys.exit(0)

    supabase = get_supabase_client()

    # Ensure storage bucket exists
    print(f"\n[Setup] Checking Supabase Storage...")
    ensure_storage_bucket(supabase)

    total_chunks = 0

    for i, filename in enumerate(pdf_files, 1):
        pdf_path = os.path.join(PDF_FOLDER, filename)
        chapter = guess_chapter_name(filename)

        print(f"\n{'='*60}")
        print(f"[{i}/{len(pdf_files)}] Processing: {filename}")
        print(f"  Class: {class_level} | Chapter: {chapter}")
        print(f"{'='*60}")

        # Step 1: Upload to Supabase Storage
        print(f"  [1/4] Uploading to Supabase Storage...")
        upload_to_storage(supabase, pdf_path, filename)

        # Step 2: Extract text
        print(f"  [2/4] Extracting text...")
        text = extract_text(pdf_path)
        if not text.strip():
            print(f"  ⚠ SKIPPED: No extractable text in {filename}")
            continue

        # Step 3: Chunk
        print(f"  [3/4] Chunking text...")
        chunks = chunk_text(text, chapter=chapter, class_level=class_level, source_pdf=filename)
        print(f"         → {len(chunks)} chunks")

        # Step 4: Embed + insert
        print(f"  [4/4] Generating embeddings & inserting into Supabase...")
        count = index_into_supabase(chunks, supabase)
        total_chunks += count
        print(f"  ✅ Done: {count} chunks indexed")

    print(f"\n{'='*60}")
    print(f"🎉 ALL DONE! Indexed {total_chunks} chunks from {len(pdf_files)} PDF(s)")
    print(f"   Table: {TABLE_NAME}")
    print(f"   Storage: {STORAGE_BUCKET}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
