"""
main.py – FastAPI entry point (Backend-Controlled RAG – No user uploads)
"""

import os
import fitz
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from models import (AskRequest, AskResponse, HealthResponse, SummarizeResponse,
                    TimetableRequest, TimetableResponse, PptRequest,
                    LessonPlanRequest, LessonPlanResponse,
                    QuestionPaperRequest, QuestionPaperResponse, AnswerKeyResponse)
from rag_engine import (query_notes, summarize_notes, generate_timetable,
                        generate_ppt, generate_lesson_plan,
                        generate_question_paper, generate_answer_key)

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


@app.post("/generate-ppt")
async def ppt_endpoint(request: PptRequest):
    """
    Generates a PowerPoint (.pptx) from textbook content on the given topic.
    Returns the file as a downloadable stream.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    try:
        import io
        pptx_bytes = generate_ppt(
            topic=request.topic.strip(),
            class_level=request.class_level or "general",
        )
        filename = request.topic.strip().replace(" ", "_")[:50] + ".pptx"
        return StreamingResponse(
            io.BytesIO(pptx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-lesson-plan", response_model=LessonPlanResponse)
async def lesson_plan_endpoint(request: LessonPlanRequest):
    """
    Teacher endpoint: generates a structured, time-segmented lesson plan
    for a given topic using RAG from the indexed biotechnology textbooks.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    try:
        result = generate_lesson_plan(
            topic=request.topic.strip(),
            duration_minutes=request.duration_minutes or 60,
            class_level=request.class_level or "general",
        )
        return LessonPlanResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson plan generation failed: {str(e)}")


@app.post("/generate-question-paper", response_model=QuestionPaperResponse)
async def question_paper_endpoint(request: QuestionPaperRequest):
    """
    Teacher endpoint: generates a question paper / question bank
    from textbook content at the specified marks level.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    try:
        result = generate_question_paper(
            topic=request.topic.strip(),
            class_level=request.class_level or "general",
            marks_per_question=request.marks_per_question or 2,
            num_questions=request.num_questions or 10,
        )
        return QuestionPaperResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question paper generation failed: {str(e)}")


@app.post("/generate-answer-key", response_model=AnswerKeyResponse)
async def answer_key_endpoint(
    text: str = Form(""),
    file: UploadFile = File(None),
    class_level: str = Form("general"),
    marks_per_question: int = Form(2),
):
    """
    Teacher endpoint: generates answer key from pasted questions or uploaded PDF.
    Answers are generated strictly from indexed textbooks.
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
        raise HTTPException(status_code=400, detail="No questions provided. Paste text or upload a PDF.")

    try:
        result = generate_answer_key(
            questions_text=combined_text,
            class_level=class_level,
            marks_per_question=marks_per_question,
        )
        return AnswerKeyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer key generation failed: {str(e)}")
