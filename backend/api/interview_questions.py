from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from models.interview_question import InterviewQuestionSet, InterviewQuestionActual
from services.iv_ques_store_service import InterviewQuestionSetService
from services.iv_ques_finalized_service import InterviewQuestionActualService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/question-set", response_model=str)
async def create_question_set(data: InterviewQuestionSet):
    """Create a new InterviewQuestionSet."""
    question_set_id = InterviewQuestionSetService.create_question_set(data)
    if not question_set_id:
        raise HTTPException(status_code=500, detail="Failed to create InterviewQuestionSet")
    return question_set_id

@router.get("/question-set/{application_id}", response_model=InterviewQuestionSet)
async def get_question_set(application_id: str):
    """Fetch an InterviewQuestionSet by applicationId."""
    try:
        logger.info(f"Fetching InterviewQuestionSet for applicationId: {application_id}")
        question_set = InterviewQuestionSetService.get_question_set(application_id)
        if not question_set:
            logger.warning(f"InterviewQuestionSet not found for applicationId: {application_id}")
            raise HTTPException(status_code=404, detail="InterviewQuestionSet not found")
        logger.info(f"Fetched InterviewQuestionSet successfully for applicationId: {application_id}")
        return question_set
    except HTTPException as he:
        # Re-raise HTTP exceptions to preserve the status code (like 404)
        logger.warning(f"HTTP error for applicationId {application_id}: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Error fetching InterviewQuestionSet for applicationId {application_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch InterviewQuestionSet: {str(e)}")

@router.delete("/question-set/{application_id}", response_model=Dict[str, Any])
async def delete_question_set(application_id: str):
    """Delete an InterviewQuestionSet by applicationId."""
    try:
        logger.info(f"Deleting InterviewQuestionSet for applicationId: {application_id}")
        result = InterviewQuestionSetService.delete_question_set(application_id)
        if not result:
            logger.warning(f"Failed to delete InterviewQuestionSet for applicationId: {application_id}")
            raise HTTPException(status_code=404, detail="InterviewQuestionSet not found or could not be deleted")
        logger.info(f"Successfully deleted InterviewQuestionSet for applicationId: {application_id}")
        return {"success": True, "message": "Question set deleted successfully"}
    except HTTPException as he:
        logger.warning(f"HTTP error when deleting question set for applicationId {application_id}: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Error deleting InterviewQuestionSet for applicationId {application_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete InterviewQuestionSet: {str(e)}")

@router.post("/actual-questions", response_model=str)
async def create_actual_questions(data: InterviewQuestionActual):
    """Create a new InterviewQuestionActual."""
    actual_id = InterviewQuestionActualService.create_actual_questions(data)
    if not actual_id:
        raise HTTPException(status_code=500, detail="Failed to create InterviewQuestionActual")
    return actual_id

@router.get("/actual-questions/{application_id}", response_model=InterviewQuestionActual)
async def get_actual_questions(application_id: str):
    """Fetch an InterviewQuestionActual by applicationId."""
    actual_questions = InterviewQuestionActualService.get_actual_questions(application_id)
    if not actual_questions:
        raise HTTPException(status_code=404, detail="InterviewQuestionActual not found")
    return actual_questions

@router.post("/save-question-set", response_model=str)
async def save_question_set(data: Dict[str, Any]):
    """Save or update an InterviewQuestionSet."""
    try:
        question_set_id = InterviewQuestionSetService.save_question_set(data)
        if not question_set_id:
            raise HTTPException(status_code=500, detail="Failed to save InterviewQuestionSet")
        return question_set_id
    except Exception as e:
        logger.error(f"Error saving InterviewQuestionSet: {e}")
        raise HTTPException(status_code=500, detail="Failed to save InterviewQuestionSet")

@router.post("/save-actual-questions", response_model=str)
async def save_actual_questions(data: Dict[str, Any]):
    """Save a new InterviewQuestionActual."""
    actual_id = InterviewQuestionActualService.save_actual_questions(data)
    if not actual_id:
        raise HTTPException(status_code=500, detail="Failed to save InterviewQuestionActual")
    return actual_id

@router.post("/apply-to-all", response_model=Dict[str, Any])
async def apply_questions_to_all(data: Dict[str, Any]):
    """Apply interview questions to all candidates of a job."""
    try:
        logger.info(f"Applying questions to all candidates for job: {data.get('jobId')}")
        
        # Call the service method to apply questions to all candidates
        result = InterviewQuestionSetService.apply_to_all_candidates(data)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to apply questions to all candidates")
        
        return result
    except Exception as e:
        logger.error(f"Error applying questions to all candidates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
