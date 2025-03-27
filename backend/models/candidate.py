from pydantic import BaseModel, EmailStr, HttpUrl, Field
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
    
class Candidate(BaseModel):
    """Base model for candidate data."""
    candidateId: str
    extractedText: Optional[Dict[str, Any]] = None
    resumeUrl: Optional[str] = None

class CandidateCreate(CandidateBase):
    """Model for creating a new candidate."""
    pass

class Application(BaseModel):
    """Model for an application."""
    applicationId: str
    jobId: str
    candidateId: str
    applicationDate: datetime
    status: str = "new"

class CandidateResponse(CandidateBase):
    """Model for candidate data returned from API."""
    uploadedAt: Optional[datetime] = None
    storagePath: Optional[str] = None
    status: Optional[str] = None
    rank_score: Optional[Dict[str, float]] = None  
    reasoning: Optional[Dict[str, str]] = None  

    class Config:
        schema_extra = {
            "example": {
                "candidateId": "cand-00000001",
                "extractedText": {
                    "applicant_name": "John Doe",
                    "applicant_mail": "john.doe@example.com"
                },
                "resumeUrl": "https://storage.googleapis.com/bucket/resumes/resume1.pdf",
                "uploadedAt": "2023-06-15T10:30:00",
                "storagePath": "resumes/job-00000001/cand-00000001/resume.pdf",
                "status": "new",
                "rank_score": {"experience": 0.8, "skills": 0.9, "education": 0.7},
                "reasoning": {
                    "experience": "Strong experience in software development",
                    "skills": "Proficient in Python, Java, and C++",
                    "education": "Graduated with honors in Computer Science"
                }
            }
        }

class CandidateUpdate(BaseModel):
    """Model for updating an existing candidate."""
    email: Optional[EmailStr] = None
    job_id: Optional[str] = None
    resume_id: Optional[str] = None
    extractedText: Optional[Dict[str, Any]] = None
    resumeUrl: Optional[str] = None
    uploadedAt: Optional[datetime] = None
    storagePath: Optional[str] = None
    status: Optional[str] = None
    rank_score: Optional[Dict[str, float]] = None
    reasoning: Optional[Dict[str, str]] = None


class ApplicationResponse(Application):
    """Model for application data returned from API with candidate info."""
    candidateInfo: Optional[Dict[str, Any]] = None
    extractedText: Optional[Dict[str, Any]] = None