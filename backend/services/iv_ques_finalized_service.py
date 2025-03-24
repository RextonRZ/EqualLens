import logging
from datetime import datetime
from typing import Dict, Any, Optional
from core.firebase import firebase_client
from models.interview_question import InterviewQuestionActual

logger = logging.getLogger(__name__)

class InterviewQuestionActualService:
    """Service for managing InterviewQuestionActual in Firestore."""

    @staticmethod
    def create_actual_questions(data: InterviewQuestionActual) -> Optional[str]:
        """Create a new InterviewQuestionActual document."""
        try:
            actual_id = firebase_client.generate_counter_id("qact")
            data_dict = data.dict()
            data_dict["actualId"] = actual_id
            data_dict["createdAt"] = datetime.now().isoformat()

            success = firebase_client.create_document("InterviewQuestionActual", actual_id, data_dict)
            if not success:
                logger.error(f"Failed to create InterviewQuestionActual with ID {actual_id}")
                return None

            return actual_id
        except Exception as e:
            logger.error(f"Error creating InterviewQuestionActual: {e}")
            return None

    @staticmethod
    def get_actual_questions(application_id: str) -> Optional[InterviewQuestionActual]:
        """Fetch an InterviewQuestionActual document by applicationId."""
        try:
            results = firebase_client.get_collection("InterviewQuestionActual", [("applicationId", "==", application_id)])
            if results:
                return InterviewQuestionActual(**results[0])
            return None
        except Exception as e:
            logger.error(f"Error fetching InterviewQuestionActual for applicationId {application_id}: {e}")
            return None

    @staticmethod
    def save_actual_questions(data: Dict[str, Any]) -> Optional[str]:
        """Save a new InterviewQuestionActual document."""
        try:
            actual_id = firebase_client.generate_counter_id("qact")
            data["actualId"] = actual_id
            data["createdAt"] = datetime.now().isoformat()

            success = firebase_client.create_document("InterviewQuestionActual", actual_id, data)
            if not success:
                logger.error(f"Failed to save InterviewQuestionActual with ID {actual_id}")
                return None

            return actual_id
        except Exception as e:
            logger.error(f"Error saving InterviewQuestionActual: {e}")
            return None
