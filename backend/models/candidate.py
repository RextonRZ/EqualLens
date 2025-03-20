from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime

class CandidateID(BaseModel):
    """Model for a candidate's ID."""
    id_number: str
    id_type: str = "IC"  # Default is IC (Identity Card)
    id_image_url: HttpUrl
    verified: bool = False
    
class CandidateBase(BaseModel):
    """Base model for a candidate."""
    email: EmailStr
    job_id: str
    resume_id: str
    
class Candidate(CandidateBase):
    """Model for a candidate."""
    candidate_id: str
    name: str
    created_at: datetime
    status: str = Field(..., description="Status of the candidate: applied, interview_scheduled, interviewed, hired, rejected")
    resume_url: HttpUrl
    interview_link: Optional[str] = None
    identification: Optional[CandidateID] = None
    interview_id: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[str] = None
    
class CandidateCreate(CandidateBase):
    """Model for creating a new candidate."""
    name: str
    
class CandidateUpdate(BaseModel):
    """Model for updating a candidate."""
    status: Optional[str] = None
    interview_link: Optional[str] = None
    interview_id: Optional[str] = None
    identification: Optional[CandidateID] = None