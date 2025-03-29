from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import logging

from models.candidate import CandidateResponse
from services.job_service import JobService
from services.candidate_service import CandidateService
from services.gemini_service import GeminiService
from services.gemini_IVQuestionService import GeminiIVQuestionService
from models.candidate import CandidateUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/applicants")
async def get_applicants(jobId: str = Query(..., description="Job ID to get applicants for")):
    logger.info(f"Fetching applicants for jobId: {jobId}")
    try:
        applications = JobService.get_applications_for_job(jobId)
        logger.info(f"Applications fetched: {applications}")
        return applications
    except Exception as e:
        logger.error(f"Error getting applicants: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get applicants: {str(e)}")

@router.post("/rank")
async def rank_candidates(request: Dict[Any, Any]):
    logger.info("Ranking candidates with provided parameters")
    try:
        prompt = request.get("prompt")
        applicants = request.get("applicants")
        job_document = request.get("job_document")
        
        if not prompt or not applicants:
            raise HTTPException(status_code=400, detail="Prompt and applicants are required")
        
        # Create an instance of RankGeminiService
        rank_service = GeminiService()
        
        # Rank the applicants
        ranked_result = await rank_service.rank_applicants(prompt, applicants, job_document)

        # Log the number of ranked candidates
        logger.info(f"Successfully ranked {len(ranked_result['applicants'])} candidates")
        
        return ranked_result
    except Exception as e:
        logger.error(f"Error ranking candidates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rank candidates: {str(e)}")
    
@router.post("/ranks")
async def rank_new_candidates(request: Dict[Any, Any]):
    logger.info("Ranking candidates with provided parameters")
    try:
        weights = request.get("weights")
        applicants = request.get("applicants")
        job_document = request.get("job_document")

        if not weights or not applicants:
            raise HTTPException(status_code=400, detail="Rank weight and applicants are required")
        
        # Create an instance of RankGeminiService
        rank_service = GeminiService()
        
        # Rank the applicants
        ranked_result = await rank_service.rank_applicants_with_weights(weights, applicants, job_document)

        # Log the number of ranked candidates
        logger.info(f"Successfully ranked new {len(ranked_result['applicants'])} candidates")
        
        return ranked_result
    except Exception as e:
        logger.error(f"Error ranking candidates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rank candidates: {str(e)}")
    
@router.put("/candidate/{candidate_id}")
async def update_candidate(candidate_id: str, candidate_data: Dict[Any, Any]):
    """Update a candidate."""
    try:
        logger.info(f"Updating candidate {candidate_id} with data: {candidate_data}")
        
        # Extract job_id from candidate data if it exists
        job_id = candidate_data.pop("job_id", None)
        if job_id:
            logger.info(f"Extracted job_id: {job_id} from candidate data")

        # Convert candidate_data to CandidateUpdate model
        candidate_update = CandidateUpdate(**candidate_data)
        logger.info(f"Converted candidate data to CandidateUpdate model: {candidate_update}")

        # Update the candidate
        success = CandidateService.update_candidate(candidate_id, candidate_update)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update candidate")
        
        # Function get_candidate has some issue earlier, so resort to second plan
        # Get the updated candidate
        if job_id:
            # Get all applicants for the job
            applications = JobService.get_applications_for_job(job_id)
            # Find the specific candidate in the applications
            updated_candidate = next((app for app in applications if app.get("candidateId") == candidate_id), None)
            if not updated_candidate:
                raise HTTPException(status_code=404, detail=f"Updated candidate {candidate_id} not found in job {job_id}")
        else:
            # If no job_id is provided, get the candidate directly
            updated_candidate = CandidateService.get_candidate(candidate_id)
            if not updated_candidate:
                raise HTTPException(status_code=404, detail=f"Updated candidate {candidate_id} not found")
        return updated_candidate
    except Exception as e:
        logger.error(f"Error updating candidate: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update candidate: {str(e)}")
    
@router.get("/detail/{candidate_id}")
async def get_candidate_detail(candidate_id: str):
    """Get detailed profile for a candidate using Gemini."""
    try:
        logger.info(f"Generating detailed profile for candidate: {candidate_id}")
        
        # Check if candidate exists
        candidate = CandidateService.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
        
        # Create an instance of RankGeminiService
        gemini_service = GeminiService()
        
        # Generate the detailed profile
        detailed_profile = await gemini_service.generate_candidate_profile(candidate)
        
        logger.info(f"Successfully generated detailed profile for candidate {candidate_id}")
        return {"candidate_id": candidate_id, "detailed_profile": detailed_profile}
        
    except Exception as e:
        logger.error(f"Error generating candidate detail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate candidate detail: {str(e)}")

@router.get("/generate-interview-questions/{candidate_id}")
async def generate_interview_questions(candidate_id: str, job_id: str = Query(..., description="Job ID to generate questions for")):
    """Generate AI interview questions for a candidate based on their resume and job details."""
    try:
        logger.info(f"Generating interview questions for candidate: {candidate_id} for job: {job_id}")
        
        # Check if candidate exists
        candidate = CandidateService.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
        
        # Check if job exists
        job = JobService.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Create an instance of GeminiIVQuestionService
        iv_question_service = GeminiIVQuestionService()
        
        # Generate the interview questions
        interview_questions = await iv_question_service.generate_interview_questions(candidate_id, job_id)
        
        logger.info(f"Successfully generated interview questions for candidate {candidate_id}")
        return interview_questions
        
    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate interview questions: {str(e)}")

@router.post("/generate-interview-question")
async def generate_interview_question(request: Dict[str, Any]):
    """Generate a single interview question for a specific candidate, job, and section."""
    try:
        logger.info(f"Generating a single interview question with request: {request}")
        
        # Extract required fields
        candidate_id = request.get("candidateId")
        job_id = request.get("jobId")
        section_title = request.get("sectionTitle")
        
        # Validate request
        if not candidate_id:
            raise HTTPException(status_code=400, detail="candidateId is required")
        if not job_id:
            raise HTTPException(status_code=400, detail="jobId is required")
        if not section_title:
            raise HTTPException(status_code=400, detail="sectionTitle is required")
        
        # Check if candidate exists
        candidate = CandidateService.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
        
        # Check if job exists
        job = JobService.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Create an instance of GeminiIVQuestionService
        iv_question_service = GeminiIVQuestionService()
        
        # Generate a single interview question
        result = await iv_question_service.generate_interview_question(
            candidate_id=candidate_id,
            job_id=job_id,
            section_title=section_title
        )
        
        logger.info(f"Successfully generated interview question for candidate {candidate_id}, section {section_title}")
        return result
        
    except Exception as e:
        logger.error(f"Error generating interview question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate interview question: {str(e)}")