from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class JobBase(BaseModel):
    """Base model for job data."""
    jobTitle: str
    jobDescription: str
    departments: List[str]
    minimumCGPA: float
    skills: List[str]


class JobCreate(JobBase):
    """Model for creating a new job."""
    pass


class JobResponse(JobBase):
    """Model for job data returned from API."""
    jobId: str
    createdAt: datetime
    applicationCount: int = 0
    requiredSkills: Optional[List[str]] = None  # Add this field for backward compatibility
    
    class Config:
        schema_extra = {
            "example": {
                "jobId": "job-00000001",
                "jobTitle": "Software Engineer",
                "jobDescription": "We are looking for a software engineer...",
                "departments": ["Engineering", "Technology"],
                "minimumCGPA": 3.0,
                "skills": ["Python", "JavaScript", "React"],
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
    skills: Optional[List[str]] = None
