"""
models.py – Pydantic request/response models (no upload model)
"""
from pydantic import BaseModel, Field
from typing import Optional


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
