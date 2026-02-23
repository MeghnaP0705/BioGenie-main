"""
main.py – FastAPI entry point (Backend-Controlled RAG – No user uploads)
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import AskRequest, AskResponse, HealthResponse
from rag_engine import query_notes

# ─── Load environment ──────────────────────────────────────────────────────────
load_dotenv(override=True)

# ─── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="BioGenie – Backend-Controlled RAG API",
    description="Locked-down Biotechnology Notes Generator for Class 9-12. No user uploads. Read-only retrieval from developer-indexed PDFs.",
    version="3.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness probe. Reports whether the knowledge base has indexed chunks."""
    from pdf_processor import index_exists
    return HealthResponse(
        status="ok",
        index_ready=index_exists(),
    )


@app.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    Student endpoint: accepts a question and returns structured biotechnology notes
    generated strictly from developer-indexed PDFs via Supabase RAG.
    No external knowledge. No user uploads. Read-only retrieval.
    """

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = query_notes(
            question=question,
            class_level=request.class_level or "general"
        )
        return AskResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
