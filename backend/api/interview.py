from fastapi import APIRouter, HTTPException, Depends, Body, Query, Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from firebase_admin import firestore
import uuid
import logging
from models.interview import (
    InterviewQuestion, GenerateInterviewLinkRequest, InterviewLinkResponse, 
    IdentityVerificationRequest, IdentityVerificationResponse, 
    InterviewResponseRequest, InterviewResponseResponse
)
from services.interview_service import (
    get_db, get_storage, validate_interview_link, 
    send_interview_email, generate_link_code
)
from services.face_verification import process_verification_image

# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# Constants
LINK_EXPIRY_DAYS = 7  # Number of days the interview link remains valid
INTERVIEW_BASE_URL = "http://localhost:3001/interview"  # Base URL for frontend interview page

@router.post("/generate-link", response_model=InterviewLinkResponse)
async def generate_interview_link(
    request: GenerateInterviewLinkRequest,
    db: firestore.Client = Depends(get_db)
):
    """Generate a unique interview link for a candidate and send email notification"""
    try:
        # Verify that application exists
        application_ref = db.collection('applications').document(request.applicationId)
        application_doc = application_ref.get()
        
        if not application_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get job details for email
        application_data = application_doc.to_dict()
        job_id = application_data.get('jobId', request.jobId)
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = job_doc.to_dict()
        job_title = job_data.get('jobTitle', 'Unknown Position')
        
        # Get candidate details
        candidate_id = application_data.get('candidateId', request.candidateId)
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        candidate_data = candidate_doc.to_dict()
        candidate_name = f"{candidate_data.get('firstName', '')} {candidate_data.get('lastName', '')}"
        
        # Generate unique interview ID and link code
        interview_id = str(uuid.uuid4())
        link_code = generate_link_code(request.applicationId, candidate_id)
        
        # Set expiry date
        expiry_date = datetime.utcnow() + timedelta(days=LINK_EXPIRY_DAYS)
        
        # Create full interview link
        full_link = f"{INTERVIEW_BASE_URL}/{interview_id}/{link_code}"
        
        # Use provided scheduled date or default to 3 days from now
        scheduled_date = request.scheduledDate or datetime.utcnow() + timedelta(days=3)
        
        # Update application with interview information - matching the database structure
        application_ref.update({
            'status': 'interview_scheduled',
            'interview': {
                'scheduledDate': scheduled_date,
                'interviewLink': full_link,
                'icVerificationImage': None,  # Will be updated during verification
                'verificationStatus': False
            }
        })
        
        # Create interview link document for validation
        interview_link_data = {
            'interviewId': interview_id,
            'linkCode': link_code,
            'applicationId': request.applicationId,
            'candidateId': candidate_id,
            'jobId': job_id,
            'email': request.email,
            'fullLink': full_link,
            'expiryDate': expiry_date,
            'createdAt': datetime.utcnow(),
            'status': 'pending',  # pending, completed, expired
            'scheduledDate': scheduled_date
        }
        
        db.collection('interviewLinks').document(interview_id).set(interview_link_data)
        
        # Create email notification record
        notification_id = str(uuid.uuid4())
        notification_data = {
            'candidateId': candidate_id,
            'applicationId': request.applicationId,
            'type': 'interview_invitation',
            'sentDate': datetime.utcnow(),
            'content': f"Interview invitation for {job_title}",
            'status': 'pending'
        }
        
        db.collection('emailNotifications').document(notification_id).set(notification_data)
        
        # Send email
        email_sent = send_interview_email(
            request.email,
            candidate_name,
            job_title,
            full_link,
            scheduled_date
        )
        
        # Update notification status
        email_status = 'sent' if email_sent else 'failed'
        db.collection('emailNotifications').document(notification_id).update({
            'status': email_status
        })
        
        # Return response
        return InterviewLinkResponse(
            interviewId=interview_id,
            linkCode=link_code,
            fullLink=full_link,
            expiryDate=expiry_date,
            applicationId=request.applicationId,
            candidateId=candidate_id,
            emailStatus=email_status
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error generating interview link: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate interview link: {str(e)}")

@router.get("/validate/{interview_id}/{link_code}")
async def validate_interview(
    interview_id: str = Path(..., description="The interview ID"),
    link_code: str = Path(..., description="The interview link code"),
    db: firestore.Client = Depends(get_db)
):
    """Validate an interview link and return basic information"""
    try:
        # Validate the link
        interview_data = validate_interview_link(interview_id, link_code)
        
        # Get application details
        application_ref = db.collection('applications').document(interview_data.get('applicationId'))
        application_doc = application_ref.get()
        
        if not application_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application_data = application_doc.to_dict()
        
        # Get job details
        job_id = interview_data.get('jobId')
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = job_doc.to_dict()
        
        # Get candidate details (minimal info for privacy)
        candidate_id = interview_data.get('candidateId')
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        candidate_data = candidate_doc.to_dict()
        
        # Return the relevant information
        return {
            "valid": True,
            "interviewId": interview_id,
            "candidateId": candidate_id,
            "candidateName": f"{candidate_data.get('firstName', '')} {candidate_data.get('lastName', '')}",
            "jobTitle": job_data.get('jobTitle', 'Unknown Position'),
            "verificationRequired": True,
            "verificationCompleted": application_data.get('interview', {}).get('verificationStatus', False),
            "expiryDate": interview_data.get('expiryDate')
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions for specific error messages
        raise
    except Exception as e:
        logger.error("Error validating interview link: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to validate interview link: {str(e)}")

@router.post("/verify-identity")
async def verify_identity(
    request: IdentityVerificationRequest,
    db: firestore.Client = Depends(get_db),
    storage_bucket = Depends(get_storage)
):
    """Process ID verification with selfie and ID card in one image using Google Cloud Vision API"""
    try:
        # Validate the interview link
        interview_data = validate_interview_link(request.interviewId, request.linkCode)
        
        # Get application ID from interview data
        application_id = interview_data.get('applicationId')
        
        # Decode base64 image
        import base64
        from io import BytesIO
        
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if ',' in request.identificationImage:
            image_data = request.identificationImage.split(',')[1]
        else:
            image_data = request.identificationImage
        
        image_bytes = base64.b64decode(image_data)
        
        # Upload original image to Firebase Storage
        storage_path = f"verification/{application_id}/{request.interviewId}.jpg"
        blob = storage_bucket.blob(storage_path)
        blob.upload_from_string(image_bytes, content_type="image/jpeg")
        blob.make_public()
        
        # Get public URL
        verification_image_url = blob.public_url
        
        # Process verification with Google Cloud Vision API
        from services.face_verification import process_verification_image
        verification_result = process_verification_image(request.identificationImage)
        
        # Log the verification result for debugging
        logger.info(f"Verification result: {verification_result}")
        
        # Store verification result in Firestore
        verification_status = verification_result.get('verified', False)
        verification_confidence = verification_result.get('confidence', 0.0)
        verification_message = verification_result.get('message', '')
        verification_debug = verification_result.get('debug_info', {})
        
        # Update application with verification image and result
        db.collection('applications').document(application_id).update({
            'interview.icVerificationImage': verification_image_url,
            'interview.verificationStatus': verification_status,
            'interview.verificationConfidence': verification_confidence,
            'interview.verificationMessage': verification_message,
            'interview.verificationDebugInfo': verification_debug,
            'interview.verificationTimestamp': firestore.SERVER_TIMESTAMP
        })
        
        # Update interview link status
        db.collection('interviewLinks').document(request.interviewId).update({
            'verificationStatus': verification_status,
            'verificationTime': firestore.SERVER_TIMESTAMP
        })
        
        # Return the FULL result object, not just the verified and message fields
        return verification_result
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error verifying identity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify identity: {str(e)}")

@router.get("/questions/{interview_id}/{link_code}", response_model=List[InterviewQuestion])
async def get_interview_questions(
    interview_id: str = Path(...),
    link_code: str = Path(...),
    db: firestore.Client = Depends(get_db)
):
    """Get the list of questions for an interview"""
    try:
        # Validate interview link
        interview_data = validate_interview_link(interview_id, link_code)
        
        # Get job ID
        job_id = interview_data.get('jobId')
        
        # Get job document to retrieve questions
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = job_doc.to_dict()
        
        # Extract interview questions from job data
        questions_data = job_data.get('interviewQuestions', [])
        
        if not questions_data:
            # If no questions found, return sample questions for testing
            # In production, you would handle this differently
            questions = [
                InterviewQuestion(
                    questionId="sample1",
                    question="Tell us about yourself and your experience.",
                    type="behavioral",
                    timeLimit=120,
                    order=1
                ),
                InterviewQuestion(
                    questionId="sample2",
                    question="What are your strengths and weaknesses?",
                    type="behavioral",
                    timeLimit=90,
                    order=2
                ),
                InterviewQuestion(
                    questionId="sample3",
                    question="Describe a challenge you faced at work and how you overcame it.",
                    type="behavioral",
                    timeLimit=120,
                    order=3
                )
            ]
        else:
            # Convert questions from job data to response model
            questions = []
            for idx, q in enumerate(questions_data):
                question_id = q.get('questionId', f"q-{idx+1}")
                questions.append(
                    InterviewQuestion(
                        questionId=question_id,
                        question=q.get('question', 'No question text available'),
                        type=q.get('type', 'behavioral'),
                        timeLimit=q.get('timeLimit', 60),
                        order=q.get('order', idx+1)
                    )
                )
            
            # Sort questions by order
            questions.sort(key=lambda x: x.order)
        
        return questions
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error fetching interview questions: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to fetch interview questions: {str(e)}")

@router.post("/submit-response", response_model=InterviewResponseResponse)
async def submit_interview_response(
    request: InterviewResponseRequest,
    db: firestore.Client = Depends(get_db),
    storage_bucket = Depends(get_storage)
):
    """Submit a video response for an interview question"""
    try:
        # Validate interview link
        interview_data = validate_interview_link(request.interviewId, request.linkCode)
        
        # Get application ID
        application_id = interview_data.get('applicationId')
        
        # Generate response ID
        response_id = str(uuid.uuid4())
        
        # If video data is provided directly in the request
        if request.videoResponse:
            # Remove data URL prefix if present
            if ',' in request.videoResponse:
                video_data = request.videoResponse.split(',')[1]
            else:
                video_data = request.videoResponse
            
            import base64
            video_bytes = base64.b64decode(video_data)
            
            # Upload video to Firebase Storage
            video_storage_path = f"interview_responses/{application_id}/{request.interviewId}/{request.questionId}.webm"
            video_blob = storage_bucket.blob(video_storage_path)
            video_blob.upload_from_string(video_bytes, content_type="video/webm")
            video_blob.make_public()
            
            # Get public URL
            video_url = video_blob.public_url
            
            # Process the video to extract audio and create transcript
            # This would be implemented in a real system, perhaps using a background job
            # For now, we'll just create placeholders
            audio_extract_url = None
            modified_audio_url = None
            transcript = None
            
            # In a production system, you would:
            # 1. Extract audio from video
            # 2. Process audio for clearer speech
            # 3. Generate transcript using Speech-to-Text
            
            # For demo purposes, we'll skip these steps
        else:
            # If frontend uploads directly to Firebase, the URL would be provided later
            video_url = None
            audio_extract_url = None
            modified_audio_url = None
            transcript = None
        
        # Create interview response document matching the database structure
        response_data = {
            'responseId': response_id,
            'applicationId': application_id,
            'questionId': request.questionId,
            'videoResponseUrl': video_url,
            'audioExtractUrl': audio_extract_url,
            'modifiedAudioUrl': modified_audio_url,
            'transcript': transcript,
            'submitTime': datetime.utcnow(),
            'analysis': {
                'clarity': None,
                'confidence': None,
                'relevance': None,
                'totalScore': None,
                'feedback': None
            }
        }
        
        # Save to Firestore
        db.collection('interviewResponses').document(response_id).set(response_data)
        
        # Return response
        return InterviewResponseResponse(
            success=True,
            responseId=response_id,
            message="Response recorded successfully"
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error submitting interview response: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to submit interview response: {str(e)}")

@router.post("/complete-interview")
async def complete_interview(
    interview_id: str = Body(...),
    link_code: str = Body(...),
    db: firestore.Client = Depends(get_db)
):
    """Mark an interview as completed"""
    try:
        # Validate interview link
        interview_data = validate_interview_link(interview_id, link_code)
        
        # Get application ID
        application_id = interview_data.get('applicationId')
        
        # Update interview link status
        db.collection('interviewLinks').document(interview_id).update({
            'status': 'completed',
            'completedAt': datetime.utcnow()
        })
        
        # Update application status
        db.collection('applications').document(application_id).update({
            'status': 'interview_completed'
        })
        
        return {"success": True, "message": "Interview marked as completed successfully"}
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error completing interview: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to complete interview: {str(e)}")

@router.get("/interview-status/{application_id}")
async def get_interview_status(
    application_id: str,
    db: firestore.Client = Depends(get_db)
):
    """Get the interview status for an application"""
    try:
        # Query for interview links related to this application
        interview_links = db.collection('interviewLinks').where('applicationId', '==', application_id).get()
        
        if not interview_links:
            return {"status": "not_scheduled", "message": "No interview has been scheduled"}
        
        # Get the latest interview
        latest_interview = sorted(
            [link.to_dict() for link in interview_links], 
            key=lambda x: x.get('createdAt'), 
            reverse=True
        )[0]
        
        # Get response count
        responses = db.collection('interviewResponses').where('applicationId', '==', application_id).get()
        response_count = len(responses)
        
        return {
            "applicationId": application_id,
            "interviewId": latest_interview.get('interviewId'),
            "status": latest_interview.get('status'),
            "scheduledDate": latest_interview.get('scheduledDate'),
            "completed": latest_interview.get('status') == 'completed',
            "responseCount": response_count,
            "verificationStatus": latest_interview.get('verificationStatus', False)
        }
    
    except Exception as e:
        logger.error("Error getting interview status: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get interview status: {str(e)}")

@router.get("/admin/interviews")
async def get_all_interviews(
    status: Optional[str] = Query(None),
    db: firestore.Client = Depends(get_db)
):
    """Admin endpoint to get all interviews (optionally filtered by status)"""
    try:
        # Query interviews
        if status:
            interviews_query = db.collection('interviewLinks').where('status', '==', status).limit(100).get()
        else:
            interviews_query = db.collection('interviewLinks').limit(100).get()
        
        interviews = []
        for doc in interviews_query:
            interview_data = doc.to_dict()
            
            # Get candidate and job info for display
            try:
                candidate_doc = db.collection('candidates').document(interview_data.get('candidateId')).get()
                job_doc = db.collection('jobs').document(interview_data.get('jobId')).get()
                
                candidate_name = "Unknown"
                job_title = "Unknown Position"
                
                if candidate_doc.exists:
                    candidate_data = candidate_doc.to_dict()
                    candidate_name = f"{candidate_data.get('firstName', '')} {candidate_data.get('lastName', '')}"
                
                if job_doc.exists:
                    job_data = job_doc.to_dict()
                    job_title = job_data.get('jobTitle', 'Unknown Position')
                
                interview_data['candidateName'] = candidate_name
                interview_data['jobTitle'] = job_title
            except Exception as e:
                logger.warning("Error getting related data for interview %s: %s", doc.id, str(e))
            
            interviews.append(interview_data)
        
        return interviews
    
    except Exception as e:
        logger.error("Error getting interviews: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get interviews: {str(e)}")