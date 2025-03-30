from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Optional
import json
import logging
from datetime import datetime
import uuid

from models.job import JobCreate, JobResponse, JobUpdate
from services.job_service import JobService
from services.candidate_service import CandidateService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[JobResponse])
async def get_jobs():
    """Get all jobs."""
    try:
        jobs = JobService.get_jobs()
        return jobs
    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get jobs: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get a job by ID."""
    job = JobService.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job: JobUpdate):
    """Update a job."""
    existing_job = JobService.get_job(job_id)
    if not existing_job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Debug - log what we received
    job_dict = job.dict(exclude_unset=True)
    logger.info(f"Updating job {job_id} with data: {job_dict}")
    
    success = JobService.update_job(job_id, job)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update job")
    
    updated_job = JobService.get_job(job_id)
    return updated_job

@router.post("/upload-job")
async def upload_job(
    job_data: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Upload a job with candidate resumes."""
    try:
        # Parse job data JSON string
        job_details = json.loads(job_data)
        logger.info(f"Received job details: {job_details}")
        
        # Create job with consistent field names
        # Check if skills field exists, and map it properly to requiredSkills
        skills = job_details.get("skills", [])
        required_skills = job_details.get("requiredSkills", skills)  # Fallback to skills if requiredSkills not present
        
        job_obj = JobCreate(
            jobTitle=job_details.get("jobTitle"),
            jobDescription=job_details.get("jobDescription", ""),
            departments=job_details.get("departments", []),
            minimumCGPA=job_details.get("minimumCGPA", 0),
            requiredSkills=required_skills  # Ensure we always use requiredSkills in the model
        )
        
        # Log the job object being created for debugging
        logger.info(f"Creating job with data: {job_obj.dict()}")
        
        job_id = JobService.create_job(job_obj)
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
        
        # Process files and create candidates
        candidates = []
        candidate_ids = []  # Track candidate IDs separately
        for file in files:
            content = await file.read()
            candidate_data = CandidateService.create_candidate(
                job_id=job_id,
                file_content=content,
                file_name=file.filename,
                content_type=file.content_type or "application/pdf"
            )
            
            if candidate_data:
                candidates.append(candidate_data)
                candidate_ids.append(candidate_data['candidateId'])
        
        # Create applications for candidates
        applications = CandidateService.process_applications(job_id, candidates)
        
        # NEW: Generate detailed profiles immediately, don't wait for frontend to request
        if candidate_ids:
            logger.info(f"Automatically generating detailed profiles for {len(candidate_ids)} candidates")
            from services.gemini_service import GeminiService
            gemini_service = GeminiService()
            
            # Process one candidate at a time to avoid overloading
            for candidate_id in candidate_ids:
                try:
                    # Get candidate data
                    candidate = CandidateService.get_candidate(candidate_id)
                    if not candidate:
                        logger.warning(f"Could not find candidate {candidate_id} for profile generation")
                        continue
                        
                    # Generate detailed profile
                    logger.info(f"Generating detailed profile for candidate {candidate_id}")
                    detailed_profile = await gemini_service.generate_candidate_profile(candidate)
                    
                    # Update candidate with detailed profile
                    candidate["detailed_profile"] = detailed_profile
                    from models.candidate import CandidateUpdate
                    profile_update = CandidateUpdate(**candidate)
                    success = CandidateService.update_candidate(candidate_id, profile_update)
                    
                    if success:
                        logger.info(f"Successfully generated and saved detailed profile for candidate {candidate_id}")
                    else:
                        logger.warning(f"Failed to save detailed profile for candidate {candidate_id}")
                        
                except Exception as e:
                    logger.error(f"Error generating profile for candidate {candidate_id}: {e}")
                    # Continue with next candidate if one fails
        else:
            logger.warning("No candidate IDs available for detailed profile generation")
        
        # Return response with candidate IDs included
        return JSONResponse(
            status_code=200,
            content={
                "message": "Job and applications created successfully",
                "jobId": job_id,
                "applicationCount": len(applications),
                "applications": applications,
                "candidates": candidates,
                "candidateIds": candidate_ids,  # Include candidate IDs explicitly
                "progress": 100.0
            }
        )
    except Exception as e:
        logger.error(f"Error uploading job: {e}")
        logger.exception("Exception details:")
        return JSONResponse(
            status_code=500, 
            content={
                "error": str(e),
                "type": str(type(e).__name__),
                "message": "An error occurred while processing your request"
            }
        )

@router.post("/upload-more-cv")
async def upload_more_cv(
    job_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Upload additional candidate resumes for an existing job."""
    try:
        # Check if job exists
        job = JobService.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        logger.info(f"Uploading additional CVs for job {job_id}, file count: {len(files)}")
        
        # Process files and create candidates
        candidates = []
        candidate_ids = []  # Track candidate IDs separately
        for file in files:
            content = await file.read()
            candidate_data = CandidateService.create_candidate(
                job_id=job_id,
                file_content=content,
                file_name=file.filename,
                content_type=file.content_type or "application/pdf"
            )
            
            if candidate_data:
                candidates.append(candidate_data)
                candidate_ids.append(candidate_data['candidateId'])
        
        # Create applications for candidates
        applications = CandidateService.process_applications(job_id, candidates)
        
        # NEW: Generate detailed profiles immediately, don't wait for frontend to request
        if candidate_ids:
            logger.info(f"Automatically generating detailed profiles for {len(candidate_ids)} candidates")
            from services.gemini_service import GeminiService
            gemini_service = GeminiService()
            
            # Process one candidate at a time to avoid overloading
            for candidate_id in candidate_ids:
                try:
                    # Get candidate data
                    candidate = CandidateService.get_candidate(candidate_id)
                    if not candidate:
                        logger.warning(f"Could not find candidate {candidate_id} for profile generation")
                        continue
                        
                    # Generate detailed profile
                    logger.info(f"Generating detailed profile for candidate {candidate_id}")
                    detailed_profile = await gemini_service.generate_candidate_profile(candidate)
                    
                    # Update candidate with detailed profile
                    candidate["detailed_profile"] = detailed_profile
                    from models.candidate import CandidateUpdate
                    profile_update = CandidateUpdate(**candidate)
                    success = CandidateService.update_candidate(candidate_id, profile_update)
                    
                    if success:
                        logger.info(f"Successfully generated and saved detailed profile for candidate {candidate_id}")
                    else:
                        logger.warning(f"Failed to save detailed profile for candidate {candidate_id}")
                        
                except Exception as e:
                    logger.error(f"Error generating profile for candidate {candidate_id}: {e}")
                    # Continue with next candidate if one fails
        else:
            logger.warning("No candidate IDs available for detailed profile generation")
            
        # Update application count for the job
        job = JobService.get_job(job_id)
        
        # Return response with candidate IDs
        return JSONResponse(
            status_code=200,
            content={
                "message": "Additional CVs uploaded successfully",
                "jobId": job_id,
                "applicationCount": len(applications),
                "applications": applications,
                "candidates": candidates,
                "candidateIds": candidate_ids,  # Include candidate IDs explicitly
                "progress": 100.0,
                "totalApplications": job.get("applicationCount", 0)
            }
        )
    except Exception as e:
        logger.error(f"Error uploading additional CVs: {e}")
        logger.exception("Exception details:")
        return JSONResponse(
            status_code=500, 
            content={
                "error": str(e),
                "type": str(type(e).__name__),
                "message": "An error occurred while processing your request"
            }
        )
