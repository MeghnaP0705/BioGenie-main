"""
models.py – Pydantic request/response models (no upload model)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    class_level: Optional[str] = Field(default="general", description="e.g. '9', '10', '11', '12', 'general'")


class AskResponse(BaseModel):
    answer: str
    sources: list[str]
    injection_detected: bool = False


class HealthResponse(BaseModel):
    status: str
    index_ready: bool


class SummarizeResponse(BaseModel):
    summary: str
    sources: list[str]


class TimetableRequest(BaseModel):
    exam_name: str
    exam_date: str  # ISO format: YYYY-MM-DD
    class_level: Optional[str] = "general"
    weak_topics: Optional[List[str]] = []
    daily_hours: Optional[int] = 3


class TimetableResponse(BaseModel):
    plan: List[Any]  # List of {date, topic, activity_type, description}


class PptRequest(BaseModel):
    topic: str
    class_level: Optional[str] = "general"


class LessonPlanRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    duration_minutes: Optional[int] = Field(default=60, ge=15, le=180)
    class_level: Optional[str] = Field(default="general", description="e.g. '9', '10', '11', '12', 'general'")


class LessonPlanResponse(BaseModel):
    plan: str
    sources: list[str]
