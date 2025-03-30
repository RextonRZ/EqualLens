import logging
import uuid
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from core.firebase import firebase_client
from services.document_service import DocumentService
from models.candidate import CandidateCreate, CandidateResponse, CandidateUpdate

logger = logging.getLogger(__name__)

class CandidateService:
    """Service for managing candidates and their resumes."""
    
    @staticmethod
    def create_candidate(job_id: str, file_content: bytes, file_name: str, content_type: str) -> Optional[Dict[str, Any]]:
        """Create a new candidate from an uploaded resume."""
        try:
            # Generate a candidate ID
            candidate_id = firebase_client.generate_counter_id("cand")
            
            # Create a storage path for the resume
            file_id = str(uuid.uuid4())
            file_extension = file_name.split('.')[-1]
            storage_path = f"resumes/{job_id}/{candidate_id}/{file_id}.{file_extension}"
            
            # Upload file to storage
            download_url = firebase_client.upload_file(file_content, storage_path, content_type)
            if not download_url:
                logger.error(f"Failed to upload resume for candidate {candidate_id}")
                return None
            
            # Extract data from document
            extracted_data = DocumentService.process_document(file_content, content_type, file_name)
            
            # Get current timestamp
            current_time = datetime.now().isoformat()
            
            # Create candidate document
            candidate_doc = {
                'candidateId': candidate_id,
                'extractedText': extracted_data,
                'resumeUrl': download_url,
                'storagePath': storage_path,
                'uploadedAt': current_time
            }
            
            # Store candidate in Firestore
            success = firebase_client.create_document('candidates', candidate_id, candidate_doc)
            if not success:
                logger.error(f"Failed to create candidate {candidate_id}")
                return None
            
            return {
                'candidateId': candidate_id,
                'resumeUrl': download_url,
                'extractedData': extracted_data
            }
        except Exception as e:
            logger.error(f"Error creating candidate: {e}")
            return None
    
    @staticmethod
    def get_candidate(candidate_id: str) -> Optional[Dict[str, Any]]:
        """Get a candidate by ID."""
        try:
            return firebase_client.get_document('candidates', candidate_id)
        except Exception as e:
            logger.error(f"Error getting candidate {candidate_id}: {e}")
            return None
    
    @staticmethod
    def update_candidate_status(candidate_id: str, status: str) -> bool:
        """Update a candidate's status."""
        try:
            return firebase_client.update_document('candidates', candidate_id, {'status': status})
        except Exception as e:
            logger.error(f"Error updating candidate {candidate_id} status: {e}")
            return False
        
    @staticmethod
    def update_candidate(candidate_id: str, candidate_data: CandidateUpdate) -> bool:
        """Update a candidate."""
        try:
            # Create update data dict
            update_data = {}
            for field, value in candidate_data.dict(exclude_unset=True).items():
                if value is not None:
                    update_data[field] = value
            
            if not update_data:
                logger.warning("No fields to update")
                return False
            
            # Add debugging to track what we're sending to the database
            logger.info(f"Update data for candidate {candidate_id}: {update_data}")
            
            # Update job in Firestore
            success = firebase_client.update_document('candidates', candidate_id, update_data)
            return success
        except Exception as e:
            logger.error(f"Error updating candidate {candidate_id}: {e}")
            return False
    
    @staticmethod
    def process_applications(job_id: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of candidates and create applications for them."""
        results = []
        
        from services.job_service import JobService
        
        for candidate_data in candidates:
            candidate_id = candidate_data.get('candidateId')
            if not candidate_id:
                continue
                
            # Create an application
            application_id = JobService.add_application(job_id, candidate_id)
            
            if application_id:
                results.append({
                    'applicationId': application_id,
                    'candidateId': candidate_id,
                    'success': True
                })
            else:
                results.append({
                    'candidateId': candidate_id,
                    'success': False,
                    'error': 'Failed to create application'
                })
        
        return results

@staticmethod
def update_candidate_status(candidate_id: str, status: str) -> bool:
    """Update a candidate's status."""
    try:
        return firebase_client.update_document('candidates', candidate_id, {'status': status})
    except Exception as e:
        logger.error(f"Error updating candidate {candidate_id} status: {e}")
        return False