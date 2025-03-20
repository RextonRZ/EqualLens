from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
import json
import logging
from datetime import datetime

from services.interview_service import InterviewService
from models.interview import Question, InterviewLink, Interview

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate-link", response_model=InterviewLink)
async def generate_interview_link(
    candidate_id: str = Form(...),
    job_id: str = Form(...),
    questions_json: str = Form(...)
):
    """Generate an interview link for a candidate."""
    try:
        # Parse questions from JSON
        questions_data = json.loads(questions_json)
        questions = [Question(**q) for q in questions_data]
        
        # Create interview link
        interview_link = InterviewService.create_interview_link(
            candidate_id=candidate_id,
            job_id=job_id,
            questions=questions
        )
        
        return interview_link
        
    except Exception as e:
        logger.error(f"Error generating interview link: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate interview link: {str(e)}")

@router.get("/validate/{interview_id}/{link_code}")
async def validate_interview_link(interview_id: str, link_code: str):
    """Validate an interview link and return interview data if valid."""
    try:
        interview = InterviewService.verify_interview_link(
            interview_id=interview_id,
            link_code=link_code
        )
        
        if not interview:
            return JSONResponse(
                status_code=404,
                content={"error": "Invalid or expired interview link"}
            )
            
        # Convert interview to dict and handle datetime serialization
        interview_dict = interview.model_dump() if hasattr(interview, "model_dump") else interview.__dict__
        
        # Convert datetime objects to ISO format strings
        interview_dict = convert_datetime_to_iso(interview_dict)
            
        return JSONResponse(
            status_code=200,
            content={
                "valid": True,
                "interview": interview_dict
            }
        )
    except Exception as e:
        logger.error(f"Error validating interview link: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to validate interview link: {str(e)}"}
        )

def convert_datetime_to_iso(obj):
    """Recursively convert datetime objects to ISO format strings."""
    if isinstance(obj, dict):
        return {key: convert_datetime_to_iso(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_iso(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

@router.post("/submit-id")
async def submit_id_verification(
    interview_id: str = Form(...),
    candidate_id: str = Form(...),
    id_number: str = Form(...),
    id_image: UploadFile = File(...)
):
    """Submit ID verification for an interview."""
    try:
        # Read ID image data
        id_image_data = await id_image.read()
        
        # Submit ID verification
        success = InterviewService.submit_id_verification(
            interview_id=interview_id,
            candidate_id=candidate_id,
            id_image_data=id_image_data,
            id_number=id_number
        )
        
        if not success:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to submit ID verification"}
            )
            
        return JSONResponse(
            status_code=200,
            content={"message": "ID verification submitted successfully"}
        )
        
    except Exception as e:
        logger.error(f"Error submitting ID verification: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to submit ID verification: {str(e)}"}
        )

@router.post("/submit-response")
async def submit_interview_response(
    interview_id: str = Form(...),
    question_id: str = Form(...),
    duration_seconds: int = Form(...),
    video: UploadFile = File(...)
):
    """Submit a video response for an interview question."""
    try:
        # Read video data
        video_data = await video.read()
        
        # Submit interview response
        success = InterviewService.submit_interview_response(
            interview_id=interview_id,
            question_id=question_id,
            video_data=video_data,
            duration_seconds=duration_seconds
        )
        
        if not success:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to submit interview response"}
            )
            
        return JSONResponse(
            status_code=200,
            content={"message": "Interview response submitted successfully"}
        )
        
    except Exception as e:
        logger.error(f"Error submitting interview response: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to submit interview response: {str(e)}"}
        )

@router.post("/complete")
async def complete_interview(
    interview_id: str = Form(...)
):
    """Mark an interview as completed."""
    try:
        # Complete interview
        success = InterviewService.complete_interview(
            interview_id=interview_id
        )
        
        if not success:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to complete interview"}
            )
            
        return JSONResponse(
            status_code=200,
            content={"message": "Interview completed successfully"}
        )
        
    except Exception as e:
        logger.error(f"Error completing interview: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to complete interview: {str(e)}"}
        )