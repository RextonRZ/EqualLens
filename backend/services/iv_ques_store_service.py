import logging
from datetime import datetime
from typing import Dict, Any, Optional
from core.firebase import firebase_client
from models.interview_question import InterviewQuestionSet

logger = logging.getLogger(__name__)

class InterviewQuestionSetService:
    """Service for managing InterviewQuestionSet in Firestore."""

    @staticmethod
    def create_question_set(data: InterviewQuestionSet) -> Optional[str]:
        """Create a new InterviewQuestionSet document."""
        try:
            question_set_id = firebase_client.generate_counter_id("qset")
            data_dict = data.dict()
            data_dict["questionSetId"] = question_set_id
            data_dict["createdAt"] = datetime.now().isoformat()

            # Generate sectionId and questionId for each section and question
            for section in data_dict["sections"]:
                section["sectionId"] = section.get("sectionId") or firebase_client.generate_counter_id("sect")
                for question in section["questions"]:
                    question["questionId"] = question.get("questionId") or firebase_client.generate_counter_id("ques")

            # Log the full data being saved
            logger.info(f"Saving InterviewQuestionSet with data: {data_dict}")

            # Ensure applicationId is included in the data
            if "applicationId" not in data_dict or not data_dict["applicationId"]:
                logger.error("Missing applicationId in InterviewQuestionSet data")
                return None

            success = firebase_client.create_document("InterviewQuestionSet", question_set_id, data_dict)
            if not success:
                logger.error(f"Failed to create InterviewQuestionSet with ID {question_set_id}")
                return None

            return question_set_id
        except Exception as e:
            logger.error(f"Error creating InterviewQuestionSet: {e}")
            return None

    @staticmethod
    def get_question_set(application_id: str) -> Optional[InterviewQuestionSet]:
        """Fetch an InterviewQuestionSet document by applicationId."""
        try:
            # Log the applicationId being queried
            logger.info(f"Querying InterviewQuestionSet with applicationId: {application_id}")

            # First try to query by applicationId
            results = firebase_client.get_collection("InterviewQuestionSet", [("applicationId", "==", application_id)])
            
            if results:
                # Process the document to handle AI question flags properly
                doc = results[0]
                
                # Ensure createdAt exists (required by the model)
                if "createdAt" not in doc or not doc["createdAt"]:
                    doc["createdAt"] = datetime.now().isoformat()
                    logger.warning(f"Added missing createdAt for InterviewQuestionSet with applicationId {application_id}")

                # Process AI generated questions to maintain isAIModified flags
                if "sections" in doc:
                    for section in doc["sections"]:
                        if "questions" in section:
                            for question in section["questions"]:
                                if question.get("isAIGenerated"):
                                    # Ensure isAIModified persists if it was marked as true
                                    if question.get("isAIModified") == True:
                                        question["isAIModified"] = True

                logger.info(f"Found InterviewQuestionSet for applicationId {application_id}")
                try:
                    return InterviewQuestionSet(**doc)
                except Exception as validation_err:
                    logger.error(f"Validation error for InterviewQuestionSet: {validation_err}")
                    # Fix common issues and retry
                    try:
                        # Make sure all required fields are present in sections and questions
                        if "sections" in doc:
                            for section in doc["sections"]:
                                if "randomSettings" not in section:
                                    section["randomSettings"] = {"enabled": False, "count": 0}
                                if "questions" in section:
                                    for question in section["questions"]:
                                        if "isCompulsory" not in question:
                                            question["isCompulsory"] = True
                        return InterviewQuestionSet(**doc)
                    except Exception as e:
                        logger.error(f"Failed to fix validation errors: {e}")
                        return None
            
            # If not found, try querying by candidateId as fallback
            # This is needed because some records might use candidateId field instead of applicationId
            results = firebase_client.get_collection("InterviewQuestionSet", [("candidateId", "==", application_id)])
            if results:
                # Apply the same validation fixes to candidateId results
                doc = results[0]
                if "createdAt" not in doc or not doc["createdAt"]:
                    doc["createdAt"] = datetime.now().isoformat()
                
                logger.info(f"Found InterviewQuestionSet using candidateId {application_id}")
                try:
                    return InterviewQuestionSet(**doc)
                except Exception as validation_err:
                    logger.error(f"Validation error for InterviewQuestionSet using candidateId: {validation_err}")
                    # Apply the same fixes as above
                    try:
                        if "sections" in doc:
                            for section in doc["sections"]:
                                if "randomSettings" not in section:
                                    section["randomSettings"] = {"enabled": False, "count": 0}
                                if "questions" in section:
                                    for question in section["questions"]:
                                        if "isCompulsory" not in question:
                                            question["isCompulsory"] = True
                        return InterviewQuestionSet(**doc)
                    except Exception as e:
                        logger.error(f"Failed to fix validation errors: {e}")
                        return None
            
            logger.warning(f"No InterviewQuestionSet found for applicationId or candidateId {application_id}")
            return None
        except Exception as e:
            logger.error(f"Error fetching InterviewQuestionSet for applicationId {application_id}: {e}")
            return None

    @staticmethod
    def save_question_set(data: Dict[str, Any]) -> Optional[str]:
        """Save or update an InterviewQuestionSet document."""
        try:
            # Check if a question set already exists for the given applicationId
            question_set_id = data.get("questionSetId")
            application_id = data.get("applicationId")
            candidate_id = data.get("candidateId")
            
            if not question_set_id:
                # If no questionSetId is provided, check for an existing set
                existing_question_set = InterviewQuestionSetService.get_question_set(application_id)
                if existing_question_set:
                    question_set_id = existing_question_set.questionSetId
                    data["questionSetId"] = question_set_id
                    data["updatedAt"] = datetime.now().isoformat()  # Add an updated timestamp
                    logger.info(f"Updating existing question set with ID: {question_set_id}")
                else:
                    # Create a new questionSetId if no existing set is found
                    question_set_id = firebase_client.generate_counter_id("qset")
                    data["questionSetId"] = question_set_id
                    data["createdAt"] = datetime.now().isoformat()
                    logger.info(f"Creating new question set with generated ID: {question_set_id}")

            # Ensure both applicationId and candidateId are set correctly to make queries consistent
            # This is crucial to make sure we can find the document later by either field
            if application_id and not data.get("candidateId"):
                data["candidateId"] = application_id
            elif candidate_id and not data.get("applicationId"):
                data["applicationId"] = candidate_id

            # Ensure AI modification status is properly preserved
            if "sections" in data:
                for section in data["sections"]:
                    if "questions" in section:
                        for question in section["questions"]:
                            # Make sure AI modification status is explicit
                            if question.get("isAIGenerated") == True and question.get("isAIModified") == True:
                                # Ensure isAIModified flag is explicitly set to True
                                question["isAIModified"] = True
                                # Add originalText if missing
                                if "originalText" not in question:
                                    question["originalText"] = ""  # Empty placeholder to track it's been modified

            # Generate sectionId and questionId for each section and question
            for section in data["sections"]:
                section["sectionId"] = section.get("sectionId") or firebase_client.generate_counter_id("sect")
                for question in section["questions"]:
                    question["questionId"] = question.get("questionId") or firebase_client.generate_counter_id("ques")

            # Log the full data being saved
            logger.info(f"Saving InterviewQuestionSet with applicationId: {application_id}, candidateId: {candidate_id}")

            # Always use create_document which will overwrite if it already exists
            success = firebase_client.create_document("InterviewQuestionSet", question_set_id, data)
            
            if not success:
                logger.error(f"Failed to save InterviewQuestionSet with ID {question_set_id}")
                return None

            logger.info(f"Successfully saved question set with ID: {question_set_id}")
            return question_set_id
        except Exception as e:
            logger.error(f"Error saving InterviewQuestionSet: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

    @staticmethod
    def apply_to_all_candidates(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Apply a question set to all candidates of a job."""
        try:
            # Extract needed data
            job_id = data.get("jobId")
            question_set = data.get("questionSet")
            candidates = data.get("candidates", [])
            
            if not job_id or not question_set or not candidates:
                logger.error("Missing required data for apply-to-all")
                return None
                
            logger.info(f"Applying questions to {len(candidates)} candidates for job {job_id}")
            
            results = {
                "successful": [],
                "failed": [],
                "skipped": []
            }
            
            # Process each candidate
            for candidate in candidates:
                candidate_id = candidate.get("candidateId")
                if not candidate_id:
                    continue
                    
                try:
                    # Clone the question set for this candidate
                    candidate_payload = {
                        "applicationId": candidate_id,
                        "candidateId": candidate_id,
                        "sections": question_set["sections"],
                        "jobId": job_id
                    }
                    
                    # Check if this candidate already has a question set
                    existing_set = InterviewQuestionSetService.get_question_set(candidate_id)
                    
                    # If there's an existing set and overwrite is not allowed, skip
                    if existing_set and not data.get("overwriteExisting", False):
                        logger.info(f"Skipping candidate {candidate_id} - existing question set found")
                        results["skipped"].append(candidate_id)
                        continue
                        
                    # If there's an existing set and overwrite is allowed, use the existing ID
                    if existing_set:
                        candidate_payload["questionSetId"] = existing_set.questionSetId
                    
                    # Save the question set for this candidate
                    question_set_id = InterviewQuestionSetService.save_question_set(candidate_payload)
                    
                    if question_set_id:
                        results["successful"].append({
                            "candidateId": candidate_id,
                            "questionSetId": question_set_id
                        })
                    else:
                        results["failed"].append(candidate_id)
                        
                except Exception as e:
                    logger.error(f"Error applying questions to candidate {candidate_id}: {e}")
                    results["failed"].append(candidate_id)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in apply_to_all_candidates: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

    @staticmethod
    def delete_question_set(application_id: str) -> bool:
        """Delete an InterviewQuestionSet document by applicationId."""
        try:
            # First try to find the document by applicationId
            results = firebase_client.get_collection("InterviewQuestionSet", [("applicationId", "==", application_id)])
            
            if results:
                # Get the question set ID and delete the document
                question_set_id = results[0].get("questionSetId")
                
                if question_set_id:
                    success = firebase_client.delete_document("InterviewQuestionSet", question_set_id)
                    logger.info(f"Deleted InterviewQuestionSet with ID: {question_set_id} for applicationId: {application_id}")
                    return success
                else:
                    logger.warning(f"Found document for applicationId {application_id} but no questionSetId")
                    return False
            
            # If not found by applicationId, try by candidateId
            results = firebase_client.get_collection("InterviewQuestionSet", [("candidateId", "==", application_id)])
            
            if results:
                # Get the question set ID and delete the document
                question_set_id = results[0].get("questionSetId")
                
                if question_set_id:
                    success = firebase_client.delete_document("InterviewQuestionSet", question_set_id)
                    logger.info(f"Deleted InterviewQuestionSet with ID: {question_set_id} for candidateId: {application_id}")
                    return success
                else:
                    logger.warning(f"Found document for candidateId {application_id} but no questionSetId")
                    return False
            
            logger.warning(f"No InterviewQuestionSet found for applicationId or candidateId {application_id}")
            return False
        except Exception as e:
            logger.error(f"Error deleting InterviewQuestionSet for applicationId {application_id}: {e}")
            return False
