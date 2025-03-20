from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime

class Question(BaseModel):
    """Model for an interview question."""
    question_id: str
    text: str
    time_limit_seconds: int = 60
    position: int
    
class InterviewLink(BaseModel):
    """Model for an interview link."""
    interview_id: str
    candidate_id: str
    job_id: str
    status: str = Field(default="pending", description="Status of the interview: pending, completed, reviewed")
    url: str
    questions: List[Question]
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool = True
    
class InterviewResponse(BaseModel):
    """Model for a candidate's response to an interview question."""
    question_id: str
    video_url: Optional[HttpUrl] = None
    audio_url: Optional[HttpUrl] = None
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    analysis: Optional[Dict[str, Any]] = None
    
class Interview(BaseModel):
    """Model for an interview."""
    interview_id: str
    candidate_id: str
    job_id: str
    status: str = Field(..., description="Status of the interview: pending, completed, reviewed")
    questions: List[Question]
    responses: Optional[List[InterviewResponse]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    feedback: Optional[str] = None