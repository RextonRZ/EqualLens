from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class InterviewQuestionBase(BaseModel):
    question: str
    type: str  # "technical", "behavioral", "compulsory"
    timeLimit: int  # in seconds
    order: int
    
class InterviewQuestion(InterviewQuestionBase):
    questionId: str
    sectionTitle: Optional[str] = None

class GenerateInterviewLinkRequest(BaseModel):
    applicationId: str
    candidateId: str
    jobId: str
    email: EmailStr
    scheduledDate: Optional[datetime] = None
    
class InterviewLinkResponse(BaseModel):
    interviewId: str
    linkCode: str
    fullLink: str
    expiryDate: datetime
    applicationId: str
    candidateId: str
    emailStatus: str

class IdentityVerificationRequest(BaseModel):
    interviewId: str
    linkCode: str
    identificationImage: str  # Base64 encoded image
    
class IdentityVerificationResponse(BaseModel):
    verified: bool
    message: str

class InterviewResponseRequest(BaseModel):
    interviewId: str
    linkCode: str
    questionId: str
    videoResponse: str  # Base64 encoded video data or empty if directly uploading to storage
    
class InterviewResponseResponse(BaseModel):
    success: bool
    responseId: str
    message: str = "Response recorded successfully"
    transcript: Optional[str] = None
    word_count: Optional[int] = 0