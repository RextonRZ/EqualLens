from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class JobBase(BaseModel):
    """Base model for job data."""
    jobTitle: str
    jobDescription: str
    departments: List[str]
    minimumCGPA: float
    requiredSkills: List[str]  # Use a single field name consistently
    rank_weight: dict = Field(default_factory=dict)
    prompt: str = ""


class JobCreate(JobBase):
    """Model for creating a new job."""
    pass


class JobResponse(JobBase):
    """Model for job data returned from API."""
    jobId: str
    createdAt: datetime
    applicationCount: int = 0
    
    class Config:
        schema_extra = {
            "example": {
                "jobId": "job-00000001",
                "jobTitle": "Software Engineer",
                "jobDescription": "We are looking for a software engineer...",
                "departments": ["Engineering", "Technology"],
                "minimumCGPA": 3.0,
                "requiredSkills": ["Python", "JavaScript", "React"],
                "rank_weight": {"experience": 5, "skills": 3, "education": 2},
                "prompt": "Evaluate candidates based on technical skills and problem-solving abilities",
                "createdAt": "2023-06-15T10:30:00",
                "applicationCount": 5
            }
        }


class JobUpdate(BaseModel):
    """Model for updating an existing job."""
    jobTitle: Optional[str] = None
    jobDescription: Optional[str] = None
    departments: Optional[List[str]] = None
    minimumCGPA: Optional[float] = None
    requiredSkills: Optional[List[str]] = None
    rank_weight: Optional[dict] = None
    prompt: Optional[str] = None
