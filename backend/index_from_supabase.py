"""
index_from_supabase.py - Pull PDFs from Supabase Storage -> Index into pgvector

Scans the 'biotech-pdfs' bucket for class_9/, class_10/, class_11/, class_12/ folders,
downloads each PDF, extracts text, chunks, embeds with Gemini, and inserts into pgvector.

Includes rate limiting to stay under the Gemini free-tier quota (100 req/min).
"""

import os
import sys
import time
import fitz  # PyMuPDF
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(override=True)

TABLE_NAME = "biotech_rag_chunks"
STORAGE_BUCKET = "biotech-pdfs"
CLASS_FOLDERS = ["class_9", "class_10", "class_11", "class_12"]

# No rate limiting needed for local HuggingFace embeddings
EMBED_BATCH_SIZE = 50


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)


def list_pdfs_in_folder(supabase: Client, folder: str) -> list[str]:
    try:
        files = supabase.storage.from_(STORAGE_BUCKET).list(folder)
        return [f["name"] for f in files if f["name"].lower().endswith(".pdf")]
    except Exception as e:
        print(f"  Warning: Could not list {folder}: {e}")
        return []


def download_pdf(supabase: Client, folder: str, filename: str) -> bytes:
    path = f"{folder}/{filename}"
    return supabase.storage.from_(STORAGE_BUCKET).download(path)


def extract_text(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    full_text = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        if text.strip():
            full_text.append(f"[Page {page_num}]\n{text}")
    doc.close()
    return "\n\n".join(full_text)


def chunk_text(text: str, chapter: str, class_level: str, source_pdf: str) -> list[dict]:
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


def guess_chapter(filename: str) -> str:
    name = Path(filename).stem
    name = name.replace("_", " ").replace("-", " ")
    return name.title()


def already_indexed(supabase: Client, source_pdf: str, class_level: str) -> bool:
    """Check if this PDF is already indexed (skip duplicates on re-run)."""
    try:
        res = supabase.table(TABLE_NAME)\
            .select("id", count="exact")\
            .eq("source_pdf", source_pdf)\
            .eq("class_level", class_level)\
            .limit(1)\
            .execute()
        return res.count > 0
    except:
        return False


def index_chunks(chunks: list[dict], supabase: Client) -> int:
    """Embed and insert chunks."""
    embeddings_model = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    total_inserted = 0

    # Process in small batches to avoid rate limits
    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start:start + EMBED_BATCH_SIZE]
        batch_num = start // EMBED_BATCH_SIZE + 1
        total_batches = (len(chunks) + EMBED_BATCH_SIZE - 1) // EMBED_BATCH_SIZE

        print(f"           Batch {batch_num}/{total_batches} ({len(batch)} chunks)...", end=" ")

        # Generate embeddings for this batch
        texts = [c["content_chunk"] for c in batch]
        embeddings = embeddings_model.embed_documents(texts)

        for i, chunk in enumerate(batch):
            chunk["embedding"] = embeddings[i]

        # Insert into Supabase
        supabase.table(TABLE_NAME).insert(batch).execute()
        total_inserted += len(batch)
        print("OK")

    return total_inserted


def main():
    # Only need Supabase environment variables now
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set in .env")
        sys.exit(1)

    supabase = get_supabase_client()

    print("=" * 60)
    print("  BioGenie - Index PDFs from Supabase Storage (Local Embeddings)")
    print("=" * 60)

    total_chunks = 0
    total_pdfs = 0
    skipped = 0

    for folder in CLASS_FOLDERS:
        class_level = folder.replace("class_", "")
        pdfs = list_pdfs_in_folder(supabase, folder)

        if not pdfs:
            print(f"\n[{folder}] No PDFs found, skipping.")
            continue

        print(f"\n[{folder}] Found {len(pdfs)} PDF(s)")

        for filename in pdfs:
            chapter = guess_chapter(filename)

            # Skip if already indexed
            if already_indexed(supabase, filename, class_level):
                print(f"  SKIP (already indexed): {filename}")
                skipped += 1
                continue

            print(f"\n  Processing: {filename}")
            print(f"    Class: {class_level} | Chapter: {chapter}")

            # Download
            print(f"    [1/4] Downloading...")
            pdf_bytes = download_pdf(supabase, folder, filename)
            print(f"           {len(pdf_bytes)} bytes")

            # Extract
            print(f"    [2/4] Extracting text...")
            text = extract_text(pdf_bytes)
            if not text.strip():
                print(f"    SKIPPED: No extractable text")
                continue

            # Chunk
            print(f"    [3/4] Chunking...")
            chunks = chunk_text(text, chapter=chapter, class_level=class_level, source_pdf=filename)
            print(f"           {len(chunks)} chunks")

            # Embed + insert
            print(f"    [4/4] Embedding & inserting...")
            count = index_chunks(chunks, supabase)
            total_chunks += count
            total_pdfs += 1
            print(f"    DONE: {count} chunks indexed for {filename}")

    print(f"\n{'=' * 60}")
    print(f"  ALL DONE!")
    print(f"  Indexed: {total_pdfs} PDF(s), {total_chunks} total chunks")
    if skipped:
        print(f"  Skipped: {skipped} (already indexed)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
