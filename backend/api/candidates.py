from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import logging

from services.job_service import JobService

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
