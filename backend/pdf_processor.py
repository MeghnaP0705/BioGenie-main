"""
pdf_processor.py – DEVELOPER-ONLY offline CLI tool for indexing PDFs into Supabase.

Usage:
    python pdf_processor.py --file notes.pdf --class 10 --chapter "Genetic Engineering"

This script is NOT exposed via the API. Only the developer runs it locally.
"""

import os
import sys
import argparse
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(override=True)

TABLE_NAME = "biotech_rag_chunks"


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a local PDF file."""
    doc = fitz.open(pdf_path)
    full_text = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        if text.strip():
            full_text.append(f"[Page {page_num}]\n{text}")
    doc.close()
    return "\n\n".join(full_text)


def chunk_text(text: str, chapter: str, class_level: str, source_pdf: str) -> list[dict]:
    """Split text into overlapping chunks for Supabase insertion."""
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


def index_pdf(pdf_path: str, class_level: str, chapter: str):
    """Full pipeline: extract → chunk → embed → Supabase insert."""

    filename = os.path.basename(pdf_path)
    print(f"[1/4] Extracting text from: {filename}")
    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        print("ERROR: PDF is empty or image-only (no extractable text).")
        sys.exit(1)

    print(f"[2/4] Chunking text...")
    chunks = chunk_text(text, chapter=chapter, class_level=class_level, source_pdf=filename)
    print(f"       → {len(chunks)} chunks created")

    print(f"[3/4] Generating embeddings locally via HuggingFace...")
    embeddings_model = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )
    texts = [c["content_chunk"] for c in chunks]
    embeddings = embeddings_model.embed_documents(texts)
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i]

    print(f"[4/4] Inserting into Supabase table '{TABLE_NAME}'...")
    supabase = get_supabase_client()
    # Insert in batches of 50 to avoid payload limits
    batch_size = 50
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start:start + batch_size]
        supabase.table(TABLE_NAME).insert(batch).execute()
        print(f"       → Inserted batch {start // batch_size + 1} ({len(batch)} rows)")

    print(f"\n✅ Done! Indexed {len(chunks)} chunks from '{filename}' "
          f"(Class {class_level}, Chapter: {chapter})")


def index_exists() -> bool:
    """Check if the RAG chunks table has any data (used by /health endpoint)."""
    try:
        supabase = get_supabase_client()
        res = supabase.table(TABLE_NAME).select("id", count="exact").limit(1).execute()
        return res.count > 0
    except:
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="BioGenie – Developer-only PDF indexing tool",
        epilog="Example: python pdf_processor.py --file biotech_ch5.pdf --class 10 --chapter 'Genetic Engineering'"
    )
    parser.add_argument("--file", required=True, help="Path to the PDF file")
    parser.add_argument("--class", dest="class_level", required=True, choices=["9", "10", "11", "12"],
                        help="Class level (9, 10, 11, or 12)")
    parser.add_argument("--chapter", required=True, help="Chapter name (e.g. 'Genetic Engineering')")

    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"ERROR: File not found: {args.file}")
        sys.exit(1)

    index_pdf(args.file, args.class_level, args.chapter)
