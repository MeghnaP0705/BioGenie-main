"""
main.py – FastAPI entry point (Backend-Controlled RAG – No user uploads)
"""

import os
import fitz
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import AskRequest, AskResponse, HealthResponse, SummarizeResponse, TimetableRequest, TimetableResponse
from rag_engine import query_notes, summarize_notes, generate_timetable

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


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(
    text: str = Form(""), 
    file: UploadFile = File(None)
):
    """
    Summarizer endpoint: Accepts raw pasted text and/or a PDF file.
    Extracts text, strictly verifies it against textbook context, and summarizes it.
    """
    combined_text = text.strip()

    if file:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
        try:
            pdf_bytes = await file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            extracted = []
            for page in doc:
                page_text = page.get_text("text")
                if page_text.strip():
                    extracted.append(page_text)
            doc.close()
            combined_text += "\n" + "\n".join(extracted)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    if not combined_text.strip():
        raise HTTPException(status_code=400, detail="No text or valid PDF provided to summarize.")

    try:
        result = summarize_notes(combined_text)
        return SummarizeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@app.post("/generate-timetable", response_model=TimetableResponse)
async def timetable_endpoint(request: TimetableRequest):
    """
    Generates a day-by-day AI study timetable from today to the exam date.
    """
    if not request.exam_name.strip():
        raise HTTPException(status_code=400, detail="Exam name cannot be empty.")
    if not request.exam_date.strip():
        raise HTTPException(status_code=400, detail="Exam date cannot be empty.")

    try:
        result = generate_timetable(
            exam_name=request.exam_name,
            exam_date=request.exam_date,
            class_level=request.class_level or "11",
            daily_hours=request.daily_hours or 3,
        )
        return TimetableResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timetable generation failed: {str(e)}")
