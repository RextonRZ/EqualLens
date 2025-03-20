import uuid
import shortuuid
import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

from core.firebase import firebase_client
from models.interview import Question, InterviewLink, Interview, InterviewResponse

logger = logging.getLogger(__name__)

class InterviewService:
    """Service for managing interviews."""
    
    @staticmethod
    def generate_interview_id() -> str:
        """Generate a unique interview ID."""
        # Use shortuuid for more human-friendly IDs
        return f"int-{shortuuid.uuid()[:10]}"
    
    @staticmethod
    def generate_unique_link(interview_id: str) -> str:
        """Generate a unique interview link."""
        base_url = os.environ.get("INTERVIEW_BASE_URL","http://localhost:3000/interview")  # Update with your actual domain
        unique_code = shortuuid.uuid()[:8]
        return f"{base_url}/{interview_id}/{unique_code}"
    
    @staticmethod
    def create_interview_link(
        candidate_id: str,
        job_id: str,
        questions: List[Question],
        expiration_days: int = 7
    ) -> InterviewLink:
        """
        Create an interview link for a candidate.
        
        Args:
            candidate_id: ID of the candidate
            job_id: ID of the job
            questions: List of questions for the interview
            expiration_days: Number of days until the link expires
            
        Returns:
            InterviewLink object
        """
        # Create interview ID
        interview_id = InterviewService.generate_interview_id()
        
        # Generate unique link
        url = InterviewService.generate_unique_link(interview_id)
        
        # Create interview link object
        now = datetime.now()
        expires_at = now + timedelta(days=expiration_days)
        
        interview_link = InterviewLink(
            interview_id=interview_id,
            candidate_id=candidate_id,
            job_id=job_id,
            url=url,
            questions=questions,
            created_at=now,
            expires_at=expires_at,
            is_active=True
        )
        
        # Store in Firebase
        try:
            # Store interview data
            interview_data = interview_link.model_dump()
            interview_data["created_at"] = interview_data["created_at"].isoformat()
            interview_data["expires_at"] = interview_data["expires_at"].isoformat()
            
            # Convert questions to dict for storage
            interview_data["questions"] = [q.model_dump() for q in questions]
            
            # Create interview document
            success = firebase_client.create_document(
                collection="interviews",
                document_id=interview_id,
                data=interview_data
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to create interview in database")
                
            # Update candidate with interview link
            candidate_update = {
                "interview_link": url,
                "interview_id": interview_id,
                "status": "interview_scheduled"
            }
            
            success = firebase_client.update_document(
                collection="candidates",
                document_id=candidate_id,
                data=candidate_update
            )
            
            if not success:
                logger.warning(f"Failed to update candidate {candidate_id} with interview link")
                
            return interview_link
            
        except Exception as e:
            logger.error(f"Error creating interview link: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create interview link: {str(e)}")
    
    @staticmethod
    def get_interview_by_id(interview_id: str) -> Optional[Interview]:
        """
        Get interview by ID.
        
        Args:
            interview_id: ID of the interview
            
        Returns:
            Interview object or None if not found
        """
        try:
            interview_data = firebase_client.get_document(
                collection="interviews",
                document_id=interview_id
            )
            
            if not interview_data:
                return None
                
            # Convert dates from strings to datetime objects
            interview_data["created_at"] = datetime.fromisoformat(interview_data["created_at"])
            
            if interview_data.get("expires_at"):
                interview_data["expires_at"] = datetime.fromisoformat(interview_data["expires_at"])
                
            if interview_data.get("completed_at"):
                interview_data["completed_at"] = datetime.fromisoformat(interview_data["completed_at"])
                
            # Convert question dicts to Question objects
            interview_data["questions"] = [
                Question(**q) for q in interview_data.get("questions", [])
            ]
            
            # Convert response dicts to InterviewResponse objects if present
            if interview_data.get("responses"):
                interview_data["responses"] = [
                    InterviewResponse(**r) for r in interview_data.get("responses", [])
                ]
                
            return Interview(**interview_data)
            
        except Exception as e:
            logger.error(f"Error getting interview {interview_id}: {e}")
            return None
    
    @staticmethod
    def verify_interview_link(interview_id: str, link_code: str) -> Optional[Interview]:
        logger.info(f"Verifying link: interview_id={interview_id}, link_code={link_code}")

        # Get the raw document first
        interview_data = firebase_client.get_document(
            collection="interviews",
            document_id=interview_id
     )
    
        if not interview_data:
            logger.error(f"Interview {interview_id} not found in database")
            return None
        
        # Check URL from raw data before model validation
        url = interview_data.get("url")
        if not url or link_code not in url:
            logger.error(f"Link code {link_code} not found in URL {url}")
            return None
    
        # Now process for Interview model (remove URL if not in model)
        if "url" in interview_data and "url" not in Interview.__annotations__:
            interview_data.pop("url")
        
        try:
            # Add required fields if missing
            if "status" not in interview_data:
                interview_data["status"] = "pending"
            
            # Convert dates
            if "created_at" in interview_data and isinstance(interview_data["created_at"], str):
                interview_data["created_at"] = datetime.fromisoformat(interview_data["created_at"])
            
            # Convert questions
            if "questions" in interview_data:
                interview_data["questions"] = [
                    Question(**q) if not isinstance(q, Question) else q 
                    for q in interview_data["questions"]
                ]
            
            interview = Interview(**interview_data)
            return interview
        except Exception as e:
            logger.error(f"Error creating Interview object: {e}")
            return None
    
    @staticmethod
    def submit_id_verification(
        interview_id: str,
        candidate_id: str,
        id_image_data: bytes,
        id_number: str
    ) -> bool:
        """
        Submit ID verification for an interview.
        
        Args:
            interview_id: ID of the interview
            candidate_id: ID of the candidate
            id_image_data: Binary data of the ID image
            id_number: ID number
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Upload ID image to Firebase Storage
            storage_path = f"candidates/{candidate_id}/id/{uuid.uuid4()}.jpg"
            
            id_image_url = firebase_client.upload_file(
                file_content=id_image_data,
                storage_path=storage_path,
                content_type="image/jpeg"
            )
            
            if not id_image_url:
                logger.error(f"Failed to upload ID image for candidate {candidate_id}")
                return False
                
            # Update candidate with ID information
            id_data = {
                "identification": {
                    "id_number": id_number,
                    "id_type": "IC",
                    "id_image_url": id_image_url,
                    "verified": False  # Initially not verified, will be verified later
                }
            }
            
            success = firebase_client.update_document(
                collection="candidates",
                document_id=candidate_id,
                data=id_data
            )
            
            if not success:
                logger.error(f"Failed to update candidate {candidate_id} with ID information")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error submitting ID verification: {e}")
            return False
    
    @staticmethod
    def submit_interview_response(
        interview_id: str,
        question_id: str,
        video_data: bytes,
        duration_seconds: int
    ) -> bool:
        """
        Submit a video response for an interview question.
        
        Args:
            interview_id: ID of the interview
            question_id: ID of the question
            video_data: Binary data of the video response
            duration_seconds: Duration of the video in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get interview data
            interview = InterviewService.get_interview_by_id(interview_id)
            
            if not interview:
                logger.error(f"Interview {interview_id} not found")
                return False
                
            # Upload video to Firebase Storage
            storage_path = f"interviews/{interview_id}/responses/{question_id}.mp4"
            
            video_url = firebase_client.upload_file(
                file_content=video_data,
                storage_path=storage_path,
                content_type="video/mp4"
            )
            
            if not video_url:
                logger.error(f"Failed to upload video for interview {interview_id}, question {question_id}")
                return False
                
            # Create response object
            response = InterviewResponse(
                question_id=question_id,
                video_url=video_url,
                duration_seconds=duration_seconds
            )
            
            # Update responses in the interview document
            interview_data = firebase_client.get_document(
                collection="interviews",
                document_id=interview_id
            )
            
            responses = interview_data.get("responses", [])
            
            # Check if a response for this question already exists
            existing_response_index = next(
                (i for i, r in enumerate(responses) if r.get("question_id") == question_id),
                None
            )
            
            if existing_response_index is not None:
                # Update existing response
                responses[existing_response_index] = response.model_dump()
            else:
                # Add new response
                responses.append(response.model_dump())
                
            # Update interview document
            success = firebase_client.update_document(
                collection="interviews",
                document_id=interview_id,
                data={"responses": responses}
            )
            
            if not success:
                logger.error(f"Failed to update interview {interview_id} with response")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error submitting interview response: {e}")
            return False
    
    @staticmethod
    def complete_interview(interview_id: str) -> bool:
        """
        Mark an interview as completed.
        
        Args:
            interview_id: ID of the interview
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Update interview status
            now = datetime.now()
            
            update_data = {
                "status": "completed",
                "completed_at": now.isoformat()
            }
            
            success = firebase_client.update_document(
                collection="interviews",
                document_id=interview_id,
                data=update_data
            )
            
            if not success:
                logger.error(f"Failed to update interview {interview_id} status to completed")
                return False
                
            # Get candidate ID from interview
            interview_data = firebase_client.get_document(
                collection="interviews",
                document_id=interview_id
            )
            
            if not interview_data:
                logger.error(f"Interview {interview_id} not found")
                return False
                
            candidate_id = interview_data.get("candidate_id")
            
            if not candidate_id:
                logger.error(f"Candidate ID not found for interview {interview_id}")
                return False
                
            # Update candidate status
            candidate_update = {
                "status": "interviewed"
            }
            
            success = firebase_client.update_document(
                collection="candidates",
                document_id=candidate_id,
                data=candidate_update
            )
            
            if not success:
                logger.error(f"Failed to update candidate {candidate_id} status to interviewed")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error completing interview: {e}")
            return False