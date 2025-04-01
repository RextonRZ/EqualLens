from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from fastapi import APIRouter, HTTPException, Depends, Body, Query, Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from firebase_admin import firestore
import uuid
import logging
import subprocess
import os
import io
import tempfile
from concurrent.futures import ThreadPoolExecutor
import base64
import speech_recognition as sr
from moviepy import VideoFileClip
import nltk
from nltk.tokenize import word_tokenize
from concurrent.futures import ThreadPoolExecutor
from models.interview import (
    InterviewQuestion, GenerateInterviewLinkRequest, InterviewLinkResponse, 
    IdentityVerificationRequest, IdentityVerificationResponse, 
    InterviewResponseRequest, InterviewResponseResponse
)
from services.interview_service import (
    get_db, get_storage, validate_interview_link, 
    send_interview_email, generate_link_code, send_rejection_email, transcribe_audio_with_google_cloud, extract_audio_with_ffmpeg, apply_voice_effect,
    score_response
)
from services.face_verification import process_verification_image
from firebase_admin import firestore


# Setup logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# Disable parallelism for tokenizers to avoid issues with multiprocessing
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Constants
LINK_EXPIRY_DAYS = 7  # Number of days the interview link remains valid
INTERVIEW_BASE_URL = "http://localhost:3001/interview"  # Base URL for frontend interview page

# Update the generate_interview_link function to check application status
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
        
        # Get application data
        application_data = application_doc.to_dict()
        
        # Check application status to prevent duplicate actions
        current_status = application_data.get('status', '').lower()
        
        # If already rejected, don't allow scheduling interview
        if current_status == 'rejected':
            raise HTTPException(status_code=400, detail="This application has already been rejected")
            
        # If interview already completed, don't allow scheduling another
        if current_status == 'interview completed':
            raise HTTPException(status_code=400, detail="This candidate has already completed their interview")
            
        # Check if interview is already scheduled for this application
        if current_status == 'interview scheduled':
            # If there's an existing interview link, return it instead of creating a new one
            if application_data.get('interview', {}).get('interviewLink'):
                existing_link = application_data['interview']['interviewLink']
                interview_id = existing_link.split('/')[-2]  # Extract ID from the link
                link_code = existing_link.split('/')[-1]     # Extract code from the link
                
                # Find the existing interview document
                interview_docs = db.collection('interviewLinks').where('interviewId', '==', interview_id).limit(1).get()
                if len(interview_docs) > 0:
                    interview_data = interview_docs[0].to_dict()
                    return InterviewLinkResponse(
                        interviewId=interview_id,
                        linkCode=link_code,
                        fullLink=existing_link,
                        expiryDate=interview_data.get('expiryDate'),
                        applicationId=request.applicationId,
                        candidateId=request.candidateId,
                        emailStatus='previously_sent'
                    )
                    
        # Get job details for email
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
        candidate_name = f"{candidate_data.get('firstName', '')}"
        
        # Try to get name from extracted text if firstName not available
        if not candidate_name.strip() and 'extractedText' in candidate_data:
            candidate_name = candidate_data['extractedText'].get('applicant_name', 'Candidate')
        
        # Generate unique interview ID and link code
        interview_id = str(uuid.uuid4())
        link_code = generate_link_code(request.applicationId, candidate_id)
        
        # Set expiry date - always 7 days from now
        expiry_date = datetime.utcnow() + timedelta(days=LINK_EXPIRY_DAYS)
        
        # Create full interview link
        full_link = f"{INTERVIEW_BASE_URL}/{interview_id}/{link_code}"
        
        # Always set scheduled date to now + 7 days (to match expiry)
        scheduled_date = datetime.utcnow() + timedelta(days=LINK_EXPIRY_DAYS)
        
        # Update application with interview information - matching the database structure
        application_ref.update({
            'status': 'interview scheduled',
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
            'email': request.email or candidate_data.get('extractedText', {}).get('applicant_mail', ''),
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
        
        # Get the email address - try the request first, then fallback to candidate data
        email_address = request.email
        if not email_address:
            email_address = candidate_data.get('extractedText', {}).get('applicant_mail')
            if not email_address:
                logger.warning(f"No email address found for candidate {candidate_id}")
                # Create a default placeholder to avoid errors
                email_address = "no-email-provided@placeholder.com"
        
        # Send email
        email_sent = send_interview_email(
            email_address,
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
        logger.error(f"Error generating interview link: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate interview link: {str(e)}")
    
@router.post("/reject")
async def reject_candidate(request_data: Dict[Any, Any] = Body(...)):
    """Reject a candidate and send rejection email"""
    try:
        application_id = request_data.get("applicationId")
        candidate_id = request_data.get("candidateId")
        job_id = request_data.get("jobId")
        email = request_data.get("email")
        
        if not application_id or not candidate_id or not job_id:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Check if application already has a status that would prevent rejection
        from core.firebase import firebase_client
        application_data = firebase_client.get_document('applications', application_id)
        
        if not application_data:
            raise HTTPException(status_code=404, detail="Application not found")
            
        current_status = application_data.get('status', '').lower()
        
        # If already rejected, don't allow another rejection
        if current_status == 'rejected':
            raise HTTPException(status_code=400, detail="This application has already been rejected")
            
        # If interview already completed, don't allow rejection
        if current_status == 'interview completed':
            raise HTTPException(status_code=400, detail="This candidate has already completed their interview")
        
        # Get job details for email
        from services.job_service import JobService
        job = JobService.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_title = job.get('jobTitle', 'the position')
        
        # Get candidate details
        from services.candidate_service import CandidateService
        candidate = CandidateService.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        extracted_text = candidate.get('extractedText', {})
        candidate_name = extracted_text.get('applicant_name', 'Candidate')
        
        # Update application status to 'rejected'
        firebase_client.update_document('applications', application_id, {
            'status': 'rejected',
            'rejectedAt': datetime.now().isoformat()
        })
        
        # Send rejection email
        email_sent = send_rejection_email(
            email,
            candidate_name,
            job_title
        )
        
        # Create email notification record
        notification_id = str(uuid.uuid4())
        notification_data = {
            'candidateId': candidate_id,
            'applicationId': application_id,
            'type': 'rejection',
            'sentDate': datetime.now().isoformat(),
            'content': f"Rejection email for {job_title}",
            'status': 'sent' if email_sent else 'failed'
        }
        
        firebase_client.create_document('emailNotifications', notification_id, notification_data)
        
        return {
            "success": True,
            "message": "Candidate rejected successfully",
            "emailSent": email_sent
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error rejecting candidate: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to reject candidate: {str(e)}")

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

@router.get("/questions/{interview_id}/{link_code}")
async def get_interview_questions(
    interview_id: str = Path(...),
    link_code: str = Path(...),
    db: firestore.Client = Depends(get_db)
):
    """Get the list of questions for an interview"""
    try:
        # Validate interview link
        interview_data = validate_interview_link(interview_id, link_code)
        
        # Get application ID from interview data
        application_id = interview_data.get('applicationId')
        
        if not application_id:
            raise HTTPException(status_code=404, detail="Application ID not found")
        
        # Query InterviewQuestionActual collection by applicationId
        actual_questions_query = db.collection('InterviewQuestionActual').where('applicationId', '==', application_id).limit(1).get()
        
        questions = []
        
        if not actual_questions_query or len(actual_questions_query) == 0:
            # Fallback if no actual questions found
            logger.warning(f"No actual questions found for application {application_id}")
            return questions
        
        # Get the first (and should be only) actual question set
        actual_questions_data = actual_questions_query[0].to_dict()
        
        if not actual_questions_data or 'questions' not in actual_questions_data:
            logger.warning(f"No questions array in actual questions data for application {application_id}")
            return questions
        
        # Format questions from InterviewQuestionActual
        for idx, q in enumerate(actual_questions_data.get('questions', [])):
            questions.append({
                "questionId": q.get('questionId', f"q-{idx+1}"),
                "question": q.get('text', 'No question text available'),
                "sectionTitle": q.get('sectionTitle', ''),
                "timeLimit": q.get('timeLimit', 60),
                "order": idx + 1
            })
        
        logger.info(f"Returning {len(questions)} questions for application {application_id}")
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
    nltk.download('punkt', quiet=True)
    temp_video_file_path = None
    temp_audio_file_path = None
    temp_modified_audio_path = None  # Added for voice modification

    try:
        # Validate interview link
        interview_data = validate_interview_link(request.interviewId, request.linkCode)
        
        # Get application ID
        application_id = interview_data.get('applicationId')
        
        # Check if document already exists for this application
        interview_doc_ref = db.collection('interviewResponses').document(application_id)
        interview_doc = interview_doc_ref.get()
        
        # Generate response ID for this question
        question_response_id = str(uuid.uuid4())

        # Get question text
        question = request.question

        # Default return values
        video_url = None
        audio_extract_url = None
        modified_audio_url = None
        transcript = None
        word_count = 0
        clarity = 0.0
        relevance = 0.0
        engagement = 0.0
        confidence = 0.0
        total_score = 0.0
        word_timings = []  # Initialize word timings

        # If video data is provided directly in the request
        if request.videoResponse:
            try:
                # Remove data URL prefix if present
                if ',' in request.videoResponse:
                    video_data = request.videoResponse.split(',')[1]
                else:
                    video_data = request.videoResponse
                
                # Decode base64 video data
                video_bytes = base64.b64decode(video_data)

                # Create a temporary file to process video
                temp_video_file = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
                temp_video_file_path = temp_video_file.name
                temp_video_file.write(video_bytes)
                temp_video_file.close() # Close the file handle after writing
                
                # Upload video to Firebase Storage
                video_storage_path = f"interview_responses/{application_id}/{request.interviewId}/{request.questionId}.webm"
                video_blob = storage_bucket.blob(video_storage_path)
                video_blob.upload_from_string(video_bytes, content_type="video/webm")
                video_blob.make_public()
                
                # Get public URL
                video_url = video_blob.public_url

                # Process the video to extract audio and create transcript
                try:
                    # Create temporary audio file path
                    temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix="_audio.wav")
                    temp_audio_file_path = temp_audio_file.name
                    temp_audio_file.close()

                    # Use FFmpeg for audio extraction
                    extract_audio_with_ffmpeg(temp_video_file_path, temp_audio_file_path)

                    logger.info(f"Extracted audio file path: {temp_audio_file_path}")
                    
                    if os.path.exists(temp_audio_file_path):
                        # Upload extracted audio to Firebase Storage
                        audio_storage_path = f"interview_responses/{application_id}/{request.interviewId}/{question_response_id}_audio.wav"
                        audio_blob = storage_bucket.blob(audio_storage_path)
                        audio_blob.upload_from_filename(temp_audio_file_path, content_type="audio/wav")
                        audio_blob.make_public()
                        audio_extract_url = audio_blob.public_url
                        gcs_uri = f"gs://{storage_bucket.name}/{audio_storage_path}"

                        # Create temporary file for modified audio with voice effect
                        temp_modified_file = tempfile.NamedTemporaryFile(delete=False, suffix="_modified.wav")
                        temp_modified_audio_path = temp_modified_file.name
                        temp_modified_file.close()
                        
                        # Apply voice effect to the extracted audio
                        apply_voice_effect(
                            temp_audio_file_path, 
                            effect_type="helium", 
                            output_audio_path=temp_modified_audio_path
                        )
                        
                        # Upload modified audio to Firebase Storage
                        modified_audio_storage_path = f"interview_responses/{application_id}/{request.interviewId}/{question_response_id}_modified_audio.wav"
                        modified_audio_blob = storage_bucket.blob(modified_audio_storage_path)
                        modified_audio_blob.upload_from_filename(temp_modified_audio_path, content_type="audio/wav")
                        modified_audio_blob.make_public()
                        modified_audio_url = modified_audio_blob.public_url

                        # Transcribe audio using Google Cloud Speech-to-Text
                        transcription_result = transcribe_audio_with_google_cloud(gcs_uri)
                
                        transcript = transcription_result['transcript']
                        confidence = transcription_result['confidence']
                        word_timings = transcription_result.get('word_timings', [])  # Extract word timings
                        
                        if transcript:
                            word_count = len(word_tokenize(transcript))
                    else:
                        logger.error("Audio extraction failed: File not found")
                        transcript = "Audio extraction failed"

                    # Analyze scores only if we have all required data
                    scores = {}
                    if transcript and len(transcript.strip()) > 0 and modified_audio_url and question:
                        # Analyze scores - call the score_response function
                        scores = score_response(
                            transcript=transcript,
                            question_text=question,
                            audio_url=modified_audio_url
                        )
                        
                        # Extract individual scores - these will be used when creating the response document
                        clarity = scores.get('clarity', 0)
                        confidence = scores.get('confidence', 0)
                        relevance = scores.get('relevance', 0)
                        engagement = scores.get('engagement', 0)
                        total_score = scores.get('total_score', 0)
                    else:
                        logger.warning(f"Missing data for scoring: transcript={bool(transcript)}, audio_url={bool(modified_audio_url)}, question={bool(question)}")
                        scores = {
                            'clarity': 0,
                            'confidence': 0,
                            'relevance': 0,
                            'engagement': 0,
                            'total_score': 0
                        }
                        total_score = 0.0

                    logger.info(f"Response scores: clarity={clarity}, confidence={confidence}, relevance={relevance}, engagement={engagement}, total_score={total_score}")
                    logger.info(f"Word timings count: {len(word_timings)}")

                except Exception as transcription_error:
                    logger.error(f"Transcription error: {str(transcription_error)}")
                    transcript = f"Transcription failed: {str(transcription_error)}"
                    word_count = 0
                    confidence = 0.0
                    total_score = 0.0
            except Exception as video_error:
                logger.error(f"Video processing error: {str(video_error)}")
                transcript = f"Video processing failed: {str(video_error)}"
                total_score = 0.0
        
        # Create the question response object
        question_response = {
            'questionId': request.questionId,
            'responseId': question_response_id,
            'submitTime': datetime.utcnow(),
            'transcript': transcript,
            'wordCount': word_count,
            'videoResponseUrl': video_url,
            'audioExtractUrl': audio_extract_url,
            'modifiedAudioUrl': modified_audio_url,
            'wordTimings': word_timings,  # Add word timings to the response
            'AIFeedback': None
        }
        
        # If the document doesn't exist yet, create it
        if not interview_doc.exists:
            # Initialize document with the first question
            interview_response_data = {
                'applicationId': application_id,
                'analysis': {
                    'clarity': float(clarity),
                    'confidence': float(confidence),
                    'relevance': float(relevance),
                    'engagement': float(engagement),
                    'totalScore': float(total_score)
                },
                'questions': [question_response],
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
            
            # Save new document to Firestore
            interview_doc_ref.set(interview_response_data)
        else:
            # Update the existing document by appending the new question and adding new analysis

            # Get the existing document data
            existing_data = interview_doc.to_dict()
            existing_analysis = existing_data.get('analysis', {})

            # Get existing scores
            existing_clarity = existing_analysis.get('clarity', 0)
            existing_confidence = existing_analysis.get('confidence', 0)
            existing_relevance = existing_analysis.get('relevance', 0)
            existing_engagement = existing_analysis.get('engagement', 0)
            existing_total_score = existing_analysis.get('totalScore', 0)

            # Add the new scores to existing scores
            updated_clarity = existing_clarity + float(clarity)
            updated_confidence = existing_confidence + float(confidence)
            updated_relevance = existing_relevance + float(relevance)
            updated_engagement = existing_engagement + float(engagement)
            updated_total_score = existing_total_score + float(total_score)

            # Update the analysis scores
            interview_doc_ref.update({
                'analysis': {
                    'clarity': updated_clarity,
                    'confidence': updated_confidence,
                    'relevance': updated_relevance,
                    'engagement': updated_engagement,
                    'totalScore': updated_total_score
                },
                'questions': firestore.ArrayUnion([question_response]),
                'updatedAt': datetime.utcnow()
            })
        
        # Return response
        return InterviewResponseResponse(
            success=True,
            responseId=question_response_id,
            message="Response recorded successfully",
            transcript=transcript,
            word_count=word_count,
            word_timings=word_timings  # Include word timings in the response
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Error submitting interview response: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to submit interview response: {str(e)}")

    finally:
        # Clean up temporary files
        for temp_file in [temp_video_file_path, temp_audio_file_path, temp_modified_audio_path]:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.error(f"Error deleting temporary file {temp_file}: {str(e)}")

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

        # Fetch interview response clarity, confidence, relevance, and engagement scores
        interview_response_doc = db.collection('interviewResponses').document(application_id).get()

        if not interview_response_doc.exists:
            raise HTTPException(status_code=404, detail="Interview responses not found")

        interview_response_data = interview_response_doc.to_dict()

        # Get the number of questions
        num_questions = len(interview_response_data.get('questions', []))  # Default to empty list if 'questions' key is missing

        if num_questions > 0:
            clarity = interview_response_data['analysis'].get('clarity', 0) / num_questions
            confidence = interview_response_data['analysis'].get('confidence', 0) / num_questions
            relevance = interview_response_data['analysis'].get('relevance', 0) / num_questions
            engagement = interview_response_data['analysis'].get('engagement', 0) / num_questions
            total_score = interview_response_data['analysis'].get('totalScore', 0) / num_questions
        else:
            total_score = 0  # Avoid division by zero

        # Ensure total_score is a standard float (avoid Firestore errors)
        total_score = float(total_score)

        # Update interview response score in Firestore
        db.collection('interviewResponses').document(application_id).update({
            'analysis.clarity': clarity,
            'analysis.confidence': confidence,
            'analysis.relevance': relevance,
            'analysis.engagement': engagement,
            'analysis.totalScore': total_score
        })
        
        # Update interview link status
        db.collection('interviewLinks').document(interview_id).update({
            'status': 'completed',
            'completedAt': datetime.utcnow()
        })
        
        # Update application status
        db.collection('applications').document(application_id).update({
            'status': 'interview completed'
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

@router.get("/responses/{application_id}")
async def get_interview_responses(
    application_id: str,
    db: firestore.Client = Depends(get_db)
):
    """Get interview responses for an application."""
    try:
        # Query for interview responses for this application
        responses_doc = db.collection('interviewResponses').document(application_id).get()
        
        if not responses_doc.exists:
            raise HTTPException(status_code=404, detail="No interview responses found for this application")
        
        return responses_doc.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interview responses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch interview responses: {str(e)}")
    
@router.put("/update-responses/{application_id}")
async def update_interview_responses(
    application_id: str,
    data: Dict[str, Any],
    db: firestore.Client = Depends(get_db)
):
    """Update interview responses for an application."""
    try:
        # Update the document in Firestore
        db.collection('interviewResponses').document(application_id).set(data)
        
        return {"success": True, "message": "Responses updated successfully"}
    except Exception as e:
        logger.error(f"Error updating interview responses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update interview responses: {str(e)}")
    
@router.post("/generate-feedback")
async def generate_ai_feedback(
    request: Dict[str, Any],
    db: firestore.Client = Depends(get_db)
):
    """Generate AI feedback for interview responses."""
    try:
        # Extract required fields
        application_id = request.get("applicationId")
        responses = request.get("responses", [])
        job_title = request.get("jobTitle", "Unknown position")
        job_id = request.get("jobId")
        
        if not application_id or not responses:
            raise HTTPException(status_code=400, detail="applicationId and responses are required")
        
        # Fetch job details if jobId is provided
        job_data = {}
        if job_id:
            job_doc = db.collection('jobs').document(job_id).get()
            if job_doc.exists:
                job_data = job_doc.to_dict()
                job_title = job_data.get('jobTitle', job_title)
        
        # Initialize Gemini API
        from services.gemini_service import GeminiService
        gemini_service = GeminiService()
        
        # Generate feedback for each response
        feedback_results = []
        
        for response in responses:
            question_text = response.get("questionText", "Unknown question")
            transcript = response.get("transcript", "")
            response_id = response.get("responseId")
            
            if not response_id:
                continue
                
            # Skip empty transcripts
            if not transcript.strip():
                feedback_results.append({
                    "responseId": response_id,
                    "feedback": "<p>No transcript available for analysis.</p>"
                })
                continue
            
            # Prepare job-specific context
            job_context = ""
            if job_data:
                required_skills = ", ".join(job_data.get('requiredSkills', []))
                job_description = job_data.get('jobDescription', '')
                departments = ", ".join(job_data.get('departments', []))
                job_context = f"""
                Job Title: {job_title}
                Department(s): {departments}
                Required Skills: {required_skills}
                Key Responsibilities: {job_description}
                """
            
            # Generate feedback using Gemini with improved prompt
            prompt = f"""
            As an HR interview evaluator for a {job_title} position, analyze the following response:
            
            QUESTION: {question_text}
            
            CANDIDATE'S ANSWER: {transcript}
            
            JOB CONTEXT:
            {job_context}
            
            Provide a CONCISE evaluation of the response with the following structure:
            
            1. STRENGTHS (Does not necessarily need to have, depends on the response, if applicable, present it in bullet points. Bullet points should never more than 4)
            2. AREAS FOR IMPROVEMENT (Does not necessarily need to have, depends on the response, if applicable, present it in bullet points. Bullet points should never more than 4)
            3. ALIGNMENT WITH JOB REQUIREMENTS (1-2 short sentences)
            4. OVERALL ASSESSMENT (2-3 sentences maximum)
            
            FORMAT GUIDELINES:
            - Use HTML formatting with <p>, <ul>, and <li> tags
            - Highlight KEY POINTS with <strong> tags
            - Keep bullet points brief (under 15 words each)
            - Total feedback should be scannable in under 30 seconds
            - Focus on actionable insights for HR decision-making
            """
            
            try:
                response_content = await gemini_service.model.generate_content_async(prompt)
                feedback_html = response_content.text
                
                # Clean up any markdown to ensure it's valid HTML
                if "```html" in feedback_html:
                    feedback_html = feedback_html.split("```html")[1].split("```")[0].strip()
                
                # Make sure HTML is properly formatted
                if not feedback_html.strip().startswith("<"):
                    # Convert simple markdown-style lists to HTML lists if needed
                    feedback_html = feedback_html.replace("**", "<strong>").replace("**", "</strong>")
                    feedback_html = feedback_html.replace("- ", "<li>").replace("\n- ", "</li>\n<li>")
                    
                    # Wrap in proper HTML structure
                    sections = feedback_html.split("\n\n")
                    formatted_sections = []
                    
                    for section in sections:
                        if section.strip():
                            if "<li>" in section:
                                formatted_section = f"<ul>{section}</li></ul>"
                                formatted_sections.append(formatted_section)
                            else:
                                formatted_section = f"<p>{section}</p>"
                                formatted_sections.append(formatted_section)
                    
                    feedback_html = "\n".join(formatted_sections)
                
                feedback_results.append({
                    "responseId": response_id,
                    "feedback": feedback_html
                })
                
            except Exception as feedback_error:
                logger.error(f"Error generating feedback for response {response_id}: {feedback_error}")
                feedback_results.append({
                    "responseId": response_id,
                    "feedback": "<p>Error generating feedback for this response.</p>"
                })
        
        return {"feedback": feedback_results}
    
    except Exception as e:
        logger.error(f"Error generating AI feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI feedback: {str(e)}")

@router.post("/send-offer")
async def send_job_offer(
    request: Dict[str, Any]
):
    """Send job offer email to candidate."""
    try:
        # Extract required fields
        application_id = request.get("applicationId")
        candidate_id = request.get("candidateId")
        job_id = request.get("jobId")
        email = request.get("email")
        candidate_name = request.get("candidateName", "Candidate")
        job_title = request.get("jobTitle", "the position")
        
        if not application_id or not candidate_id or not job_id or not email:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Create job offer email
        email_sent = send_job_offer_email(
            email=email,
            candidate_name=candidate_name,
            job_title=job_title
        )
        
        # Update application status
        from core.firebase import firebase_client
        firebase_client.update_document('applications', application_id, {
            'status': 'approved',
            'approvedAt': datetime.now().isoformat()
        })
        
        # Create notification record
        notification_id = str(uuid.uuid4())
        notification_data = {
            'candidateId': candidate_id,
            'applicationId': application_id,
            'type': 'job_offer',
            'sentDate': datetime.now().isoformat(),
            'content': f"Job offer email for {job_title}",
            'status': 'sent' if email_sent else 'failed'
        }
        
        firebase_client.create_document('emailNotifications', notification_id, notification_data)
        
        return {
            "success": True,
            "message": "Job offer email sent successfully",
            "emailSent": email_sent
        }
    
    except Exception as e:
        logger.error(f"Error sending job offer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send job offer: {str(e)}")

@router.post("/send-rejection")
async def send_rejection_email_endpoint(
    request: Dict[str, Any]
):
    """Send rejection email to candidate."""
    try:
        # Extract required fields
        application_id = request.get("applicationId")
        candidate_id = request.get("candidateId")
        job_id = request.get("jobId")
        email = request.get("email")
        candidate_name = request.get("candidateName", "Candidate")
        job_title = request.get("jobTitle", "the position")
        
        if not application_id or not candidate_id or not job_id or not email:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Send rejection email
        email_sent = send_rejection_email(
            email=email,
            candidate_name=candidate_name,
            job_title=job_title
        )
        
        # Update application status
        from core.firebase import firebase_client
        firebase_client.update_document('applications', application_id, {
            'status': 'rejected',
            'rejectedAt': datetime.now().isoformat()
        })
        
        # Create notification record
        notification_id = str(uuid.uuid4())
        notification_data = {
            'candidateId': candidate_id,
            'applicationId': application_id,
            'type': 'rejection',
            'sentDate': datetime.now().isoformat(),
            'content': f"Rejection email for {job_title}",
            'status': 'sent' if email_sent else 'failed'
        }
        
        firebase_client.create_document('emailNotifications', notification_id, notification_data)
        
        return {
            "success": True,
            "message": "Rejection email sent successfully",
            "emailSent": email_sent
        }
    
    except Exception as e:
        logger.error(f"Error sending rejection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send rejection: {str(e)}")

# Add this function to interview_service.py
def send_job_offer_email(email: str, candidate_name: str, job_title: str) -> bool:
    """Send job offer email to candidate"""
    try:
        # Get email credentials from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if not smtp_username or not smtp_password:
            logger.warning("SMTP credentials not set. Email would have been sent to: %s", email)
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"Job Offer - {job_title} Position"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4caf50;">Congratulations!</h1>
                </div>
                <p>Dear {candidate_name},</p>
                <p>We are delighted to offer you the position of <strong>{job_title}</strong> at EqualLens.</p>
                <p>After careful consideration of your qualifications, experience, and performance in the interview process, we believe you are an excellent fit for our team and company culture.</p>
                <p>Our HR department will contact you within the next 2-3 business days to discuss the details of your employment, including:</p>
                <ul>
                    <li>Start date</li>
                    <li>Compensation package</li>
                    <li>Benefits information</li>
                    <li>Onboarding process</li>
                </ul>
                <p>Please feel free to email us if you have any questions before then.</p>
                <p>We are excited about the possibility of you joining our team and contributing to our success.</p>
                <p>Sincerely,</p>
                <p>The EqualLens Recruiting Team</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Connect to server and send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        
        logger.info("Job offer email sent successfully to %s", email)
        return True
    except Exception as e:
        logger.error("Failed to send job offer email: %s", str(e))
        return False