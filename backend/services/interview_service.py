from fastapi import HTTPException
from datetime import datetime
from firebase_admin import firestore, storage
import secrets
import string
import hashlib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import time
import logging
import tempfile
from google.cloud import speech
import subprocess
from concurrent.futures import ThreadPoolExecutor
import io
import platform
import numpy as np
from google.cloud import language_v1
import librosa
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
import requests

logger = logging.getLogger(__name__)
LINK_EXPIRY_DAYS = 7

# Initialize clients and models globally
nlp_client = language_v1.LanguageServiceClient()
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

def get_db():
    """Return the Firestore database client"""
    try:
        return firestore.client()
    except Exception as e:
        logger.error(f"Error getting Firestore client: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to database")

def get_storage():
    """Return the Firebase Storage bucket"""
    try:
        from firebase_admin import storage
        import os
        
        # Try to get bucket name from environment variable
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
        
        # If no bucket name in environment, construct default name
        if not bucket_name:
            from firebase_admin import storage
            from firebase_admin import _apps
            project_id = list(_apps.values())[0].project_id
            bucket_name = f"{project_id}.firebasestorage.com"
        
        return storage.bucket(bucket_name)
    except Exception as e:
        logger.error(f"Error getting Storage bucket: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to storage")
    
    return storage.bucket(bucket_name)

def generate_link_code(application_id: str, candidate_id: str) -> str:
    """Generate a secure random link code"""
    # Create a random string (16 characters)
    random_part = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    
    # Add a hash of the application and candidate IDs for extra security
    hash_base = f"{application_id}:{candidate_id}:{time.time()}"
    hash_part = hashlib.sha256(hash_base.encode()).hexdigest()[:8]
    
    # Combine for the final code
    return f"{random_part}{hash_part}"

def send_interview_email(email: str, candidate_name: str, job_title: str, 
                         interview_link: str, scheduled_date: datetime) -> bool:    
    """Send interview invitation email to candidate"""
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
        msg['Subject'] = f"Interview Invitation for {job_title} Position"
        
        # Format date for display
        formatted_date = scheduled_date.strftime("%A, %B %d, %Y at %I:%M %p") if scheduled_date else "your convenience"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #ef402d;">EqualLens</h1>
                </div>
                <p>Dear {candidate_name},</p>
                <p>Congratulations! You have been selected for an interview for the <strong>{job_title}</strong> position.</p>
                <p>Your interview is scheduled for <strong>{formatted_date}</strong>.</p>
                <p>Please click the button below to access your interview portal:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{interview_link}" style="background-color: #ef402d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Your Interview</a>
                </div>
                <p><strong>Important Instructions:</strong></p>
                <ul>
                    <li>Please have your identification (ID card, passport, or driver's license) ready for verification.</li>
                    <li>Ensure you have a working camera and microphone.</li>
                    <li>Find a quiet place with good lighting for your interview.</li>
                    <li>Each question will have a time limit, so please be prepared to answer promptly.</li>
                </ul>
                <p>This interview link will expire in {LINK_EXPIRY_DAYS} days.</p>
                <p>If you encounter any technical issues, please contact support@equallens.com.</p>
                <p>Best of luck!</p>
                <p>The EqualLens Team</p>
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
        
        logger.info("Interview email sent successfully to %s", email)
        return True
    except Exception as e:
        logger.error("Failed to send interview email: %s", str(e))
        return False

def send_rejection_email(email: str, candidate_name: str, job_title: str) -> bool:
    """Send rejection email to candidate"""
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
        msg['Subject'] = f"Update Regarding Your Application for {job_title} Position"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #ef402d;">EqualLens</h1>
                </div>
                <p>Dear {candidate_name},</p>
                <p>Thank you for your interest in the <strong>{job_title}</strong> position and for taking the time to apply.</p>
                <p>After careful consideration of your application, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely align with our current needs.</p>
                <p>We appreciate your interest in our organization and encourage you to apply for future positions that match your skills and experience.</p>
                <p>We wish you the best of luck in your job search and professional endeavors.</p>
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
        
        logger.info("Rejection email sent successfully to %s", email)
        return True
    except Exception as e:
        logger.error("Failed to send rejection email: %s", str(e))
        return False

def validate_interview_link(interview_id: str, link_code: str):
    """Validate if the interview link is valid and not expired"""
    db = get_db()
    
    # Get interview link document
    interview_ref = db.collection('interviewLinks').document(interview_id)
    interview_doc = interview_ref.get()
    
    if not interview_doc.exists:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview_data = interview_doc.to_dict()
    
    # Check if link code matches
    if interview_data.get('linkCode') != link_code:
        raise HTTPException(status_code=403, detail="Invalid interview link")
    
    # Check if link has expired
    expiry_date = interview_data.get('expiryDate').replace(tzinfo=None)
    if datetime.utcnow() > expiry_date:
        raise HTTPException(status_code=403, detail="Interview link has expired")
    
    # Check if interview is already completed
    if interview_data.get('status') == 'completed':
        raise HTTPException(status_code=403, detail="This interview has already been completed")
    
    return interview_data

# Update these functions in interview_service.py

def extract_audio_with_ffmpeg(input_video_path, output_audio_path=None):
    """
    Extract audio from video using FFmpeg with improved quality settings
    
    Args:
        input_video_path (str): Path to input video file
        output_audio_path (str, optional): Path for output audio file
    
    Returns:
        str: Path to extracted audio file
    """
    ffmpeg_path = None

    # Determine ffmpeg path based on platform
    if platform.system() == "Darwin":  # macOS
        potential_paths = [
            '/opt/homebrew/Cellar/ffmpeg@6/6.1.2_8/bin/ffmpeg',
            '/opt/homebrew/bin/ffmpeg',
            '/usr/local/bin/ffmpeg'
        ]
        
        for path in potential_paths:
            if os.path.exists(path):
                ffmpeg_path = path
                break
                
        if not ffmpeg_path:
            raise RuntimeError("FFmpeg not found. Please install it with 'brew install ffmpeg'")
    else:
        # For Windows and others, try multiple paths
        potential_windows_paths = [
            r'C:\Users\ooiru\Downloads\ffmpeg-2025-03-31-git-35c091f4b7-full_build\ffmpeg-2025-03-31-git-35c091f4b7-full_build\bin\ffmpeg.exe',
            r'C:\Users\hongy\Downloads\ffmpeg-n6.1-latest-win64-gpl-6.1\bin\ffmpeg.exe'
        ]
        
        for path in potential_windows_paths:
            if os.path.exists(path):
                ffmpeg_path = path
                break
                
        if not ffmpeg_path:
            ffmpeg_path = 'ffmpeg'  # Fallback to PATH
    
    if not input_video_path or not os.path.exists(input_video_path):
        raise ValueError(f"Invalid input video path: {input_video_path}")
    
    # If no output path specified, generate one
    if output_audio_path is None:
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix="_audio.wav")
        output_audio_path = temp_audio_file.name
        temp_audio_file.close()
    
    try:
        # IMPROVED: Better audio extraction settings
        command = [
            ffmpeg_path, 
            '-i', input_video_path,   # Input video file
            '-vn',                    # Ignore video stream
            '-acodec', 'pcm_s16le',   # PCM 16-bit format
            '-ar', '16000',           # IMPROVED: Higher sample rate (16kHz) for better quality
            '-ac', '1',               # Mono channel
            # IMPROVED: Add audio filtering for better voice clarity
            '-af', 'highpass=f=80,lowpass=f=7500,dynaudnorm=f=150:g=15',  
            '-y',                     # Overwrite output file
            output_audio_path         # Output audio file
        ]
        
        # Run FFmpeg command
        result = subprocess.run(
            command, 
            stdout=subprocess.PIPE,  
            stderr=subprocess.PIPE,
            check=True
        )
        
        # Verify output file was created
        if not os.path.exists(output_audio_path):
            raise RuntimeError("Audio extraction failed: No output file created")
        
        logging.info(f"Audio extracted successfully with improved quality: {output_audio_path}")
        return output_audio_path
    
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
        
        # Fallback to simpler settings if enhanced version fails
        try:
            logging.warning("Trying fallback audio extraction with basic settings")
            fallback_command = [
                ffmpeg_path, 
                '-i', input_video_path,
                '-vn',
                '-acodec', 'pcm_s16le',
                '-ar', '16000',  # Still use 16kHz but without filters
                '-ac', '1',
                '-y',
                output_audio_path
            ]
            
            subprocess.run(fallback_command, check=True)
            
            if os.path.exists(output_audio_path):
                logging.info(f"Fallback audio extraction succeeded: {output_audio_path}")
                return output_audio_path
        except Exception as fallback_error:
            logging.error(f"Fallback audio extraction also failed: {str(fallback_error)}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error in audio extraction: {str(e)}")
        raise

def transcribe_audio_with_google_cloud(gcs_uri):
    """
    Improved transcription function using Google Cloud Speech-to-Text API
    
    Args:
        gcs_uri (str): GCS URI of the audio file

    Returns:
        dict: Enhanced transcription results with transcript and confidence
    """
    try:
        # Instantiate a client
        client = speech.SpeechClient()

        # Configure audio input using the GCS URI
        audio = speech.RecognitionAudio(uri=gcs_uri)
        
        # IMPROVED: Add more domain-specific phrases for better recognition
        interview_phrases = [
            "interview", "job", "experience", "skills", "role", "position",
            "team", "project", "management", "development", "challenges",
            "achievements", "responsibilities", "education", "degree",
            "certificate", "training", "leadership", "communication",
            "problem-solving", "technical", "professional", "background", 
            "opportunity", "career", "goals", "objectives", "salary",
            "work", "employment", "remote", "hybrid", "flexible"
        ]
        
        # IMPROVED: Enhanced configuration for better transcription
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,  # IMPROVED: Match the new extraction sample rate
            language_code='en-US',
            enable_automatic_punctuation=True,
            model='video',  # IMPROVED: Use video model which is better for recorded speech
            use_enhanced=True,  # IMPROVED: Use enhanced model
            profanity_filter=False,
            speech_contexts=[
                speech.SpeechContext(
                    phrases=interview_phrases,
                    boost=15.0  # Boost recognition of these phrases
                )
            ],
            # IMPROVED: Get word-level timestamps and confidence
            enable_word_time_offsets=True,
            enable_word_confidence=True,
            # IMPROVED: Get alternative transcriptions
            max_alternatives=2
        )

        # Use long_running_recognize for all audio files
        operation = client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=180)  # Longer timeout for processing

        if not response.results:
            return {
                'transcript': "No transcription results (empty speech detected)",
                'confidence': 0.0,
                'raw_results': None,
                'word_timings': []  # Return empty array for word timings
            }
        
        # IMPROVED: Better processing of results
        transcripts = []
        confidence_scores = []
        word_count = 0
        word_timings = []  # List to store word timing information
        word_index = 0  # Global index to track position in full transcript
        
        for result in response.results:
            # Use the highest confidence alternative
            best_alternative = result.alternatives[0]
            transcripts.append(best_alternative.transcript)
            confidence_scores.append(best_alternative.confidence)
            
            # Process word-level information
            for word_info in best_alternative.words:
                # Convert to seconds
                start_time = word_info.start_time.total_seconds()
                end_time = word_info.end_time.total_seconds()
                
                # Add to word timings array with necessary information
                word_timings.append({
                    'word': word_info.word,
                    'startTime': start_time,
                    'endTime': end_time,
                    'confidence': word_info.confidence,
                    'index': word_index
                })
                
                word_index += 1
            
            # Count words for statistics
            words = best_alternative.transcript.split()
            word_count += len(words)
        
        # IMPROVED: Post-process transcript for better readability
        full_transcript = ' '.join(transcripts)
        
        # Normalize the transcript
        processed_transcript = post_process_transcript(full_transcript)
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        return {
            'transcript': processed_transcript,
            'confidence': avg_confidence,
            'word_count': word_count,
            'word_timings': word_timings,  # Include word timings in the response
            'raw_results': response.results
        }
    
    except Exception as e:
        logging.error(f"Google Cloud Speech-to-Text error: {str(e) if e is not None else 'Unknown error'}")
        return {
            'transcript': f"Transcription error: {str(e) if e is not None else 'Unknown error'}",
            'confidence': 0.0,
            'word_timings': [],  # Return empty array for word timings on error
            'raw_results': None
        }

# ADDED: New helper function for transcript post-processing
def post_process_transcript(transcript):
    """
    Post-process transcript to improve readability and correctness
    
    Args:
        transcript: Raw transcript text
        
    Returns:
        str: Improved transcript
    """
    # Remove extra spaces
    cleaned = ' '.join(transcript.split())
    
    # Remove repeated words (common in speech-to-text output)
    words = cleaned.split()
    deduped_words = []
    for i, word in enumerate(words):
        if i == 0 or word.lower() != words[i-1].lower():
            deduped_words.append(word)
    
    cleaned = ' '.join(deduped_words)
    
    # Fix capitalization
    if cleaned and len(cleaned) > 0:
        # Capitalize first letter
        cleaned = cleaned[0].upper() + cleaned[1:]
        
        # Capitalize after periods, question marks, and exclamation points
        for i in range(1, len(cleaned)-1):
            if cleaned[i-1] in ['.', '!', '?'] and cleaned[i] == ' ':
                cleaned = cleaned[:i+1] + cleaned[i+1].upper() + cleaned[i+2:]
    
    # Ensure transcript ends with punctuation
    if cleaned and not cleaned[-1] in ['.', '!', '?']:
        cleaned += '.'
    
    return cleaned

def parallel_audio_extraction(video_paths):
    """
    Extract audio from multiple videos in parallel
    
    Args:
        video_paths (list): List of video file paths
    
    Returns:
        list: Paths to extracted audio files
    """
    with ThreadPoolExecutor() as executor:
        # Use max_workers to control CPU usage
        return list(executor.map(extract_audio_with_ffmpeg, video_paths))

def apply_voice_effect(input_audio_path, effect_type="helium", output_audio_path=None):
    """
    Apply voice changing effect to audio file using FFmpeg
    
    Args:
        input_audio_path (str): Path to input audio file
        effect_type (str): Type of effect to apply ('helium' for pitch shift)
        output_audio_path (str, optional): Path for output modified audio file
    
    Returns:
        str: Path to modified audio file
    """

     # Determine ffmpeg path based on platform
    if platform.system() == "Darwin":  # macOS
        # Try homebrew path first, fallback to others
        potential_paths = [
            '/opt/homebrew/Cellar/ffmpeg@6/6.1.2_8/bin/ffmpeg',  
            '/opt/homebrew/bin/ffmpeg',                          # Common Homebrew location
            '/usr/local/bin/ffmpeg'                              # Alternative location
        ]
        
        ffmpeg_path = None
        for path in potential_paths:
            if os.path.exists(path):
                ffmpeg_path = path
                break
                
        if not ffmpeg_path:
            raise RuntimeError("FFmpeg not found. Please install it with 'brew install ffmpeg'")
    else:
        # For Windows and others, try multiple paths
        potential_windows_paths = [
            r'C:\Users\ooiru\Downloads\ffmpeg-2025-03-31-git-35c091f4b7-full_build\ffmpeg-2025-03-31-git-35c091f4b7-full_build\bin\ffmpeg.exe',
            r'C:\Users\hongy\Downloads\ffmpeg-n6.1-latest-win64-gpl-6.1\bin\ffmpeg.exe'
        ]
        
        ffmpeg_path = None
        for path in potential_windows_paths:
            if os.path.exists(path):
                ffmpeg_path = path
                break
                
        if not ffmpeg_path:
            ffmpeg_path = 'ffmpeg'  # Fallback to PATH
    
    if not input_audio_path or not os.path.exists(input_audio_path):
        raise ValueError(f"Invalid or non-existent input audio path: {input_audio_path}")

    # If no output path specified, generate one in the system's temp directory
    if output_audio_path is None:
        # Create a temporary file that persists after closing, get its name
        fd, temp_output_path = tempfile.mkstemp(suffix="_modified.wav")
        os.close(fd) # Close the file handle immediately
        output_audio_path = temp_output_path
        logging.info(f"Output path not specified, using temporary file: {output_audio_path}")
    else:
        # Ensure the directory for the output path exists
        output_dir = os.path.dirname(output_audio_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            logging.info(f"Created output directory: {output_dir}")

    # Define base filter chain for clarity: Loudness normalization, band-pass filter
    # Adjust frequencies as needed: highpass removes rumble, lowpass removes hiss/high noise
    # Using EBU R128 standard for loudness normalization
    clarity_filters = "loudnorm=I=-16:LRA=11:TP=-1.5,highpass=f=100,lowpass=f=7000"

    # Define FFmpeg command based on effect type
    command = [
        ffmpeg_path,
        '-i', input_audio_path,
    ]

    effect_type_lower = effect_type.lower()

    if effect_type_lower == "disguise_up":
        # Moderate pitch up (e.g., 15-25% higher pitch = 1.15 to 1.25 factor)
        pitch_factor = 1.20
        # Apply pitch shift first, then clarity filters
        command.extend(['-af', f'rubberband=pitch={pitch_factor},{clarity_filters}'])
        logging.info(f"Applying 'disguise_up' effect with pitch factor {pitch_factor}")
    elif effect_type_lower == "disguise_down":
        # Moderate pitch down (e.g., 15-25% lower pitch = 0.85 to 0.75 factor)
        pitch_factor = 0.80
        # Apply pitch shift first, then clarity filters
        command.extend(['-af', f'rubberband=pitch={pitch_factor},{clarity_filters}'])
        logging.info(f"Applying 'disguise_down' effect with pitch factor {pitch_factor}")
    elif effect_type_lower == "helium":
        # Original Helium effect (higher pitch shift)
        pitch_factor = 1.5 # Example value for helium, adjust if needed
        command.extend(['-af', f'rubberband=pitch={pitch_factor},{clarity_filters}'])
        logging.info(f"Applying 'helium' effect with pitch factor {pitch_factor}")
    else:
        # No effect or unrecognized effect type, just copy (or apply clarity only)
        # Option 1: Just copy
        # command.extend(['-c', 'copy'])
        # Option 2: Apply clarity filters without pitch shift
        command.extend(['-af', clarity_filters])
        logging.info(f"Effect type '{effect_type}' not recognized or 'none'. Applying only clarity filters.")
        # If you truly want *no* changes for 'none', uncomment the '-c copy' line
        # and comment out the '-af clarity_filters' line above.

    # Common output settings for consistency and clarity
    command.extend([
        '-ar', '16000',  # Standard sample rate for speech processing
        '-ac', '1',      # Convert to mono for focus
        '-y',            # Overwrite output file without asking
        output_audio_path
    ])

    try:
        logging.info(f"Running FFmpeg command: {' '.join(command)}")
        # Run FFmpeg command
        result = subprocess.run(
            command,
            capture_output=True, # Capture stdout and stderr
            text=True,           # Decode stdout/stderr as text
            check=True           # Raise CalledProcessError on non-zero exit code
        )

        # FFmpeg often outputs info to stderr, so check returncode explicitly
        # The check=True above already handles non-zero return codes by raising an error.
        logging.info(f"FFmpeg stdout:\n{result.stdout}")
        if result.stderr: # Log stderr as well, as FFmpeg often puts useful info here
             logging.info(f"FFmpeg stderr:\n{result.stderr}")

        # Verify output file was created and is not empty
        if not os.path.exists(output_audio_path) or os.path.getsize(output_audio_path) == 0:
            # This check might be redundant if check=True caught an error, but good for robustness
            raise RuntimeError(f"Voice effect application failed: Output file not created or empty at {output_audio_path}")

        logging.info(f"Voice effect '{effect_type}' applied successfully: {output_audio_path}")
        return output_audio_path

    except subprocess.CalledProcessError as e:
        # Log the error details from FFmpeg's stderr
        logging.error(f"FFmpeg command failed with return code {e.returncode}")
        logging.error(f"FFmpeg stderr:\n{e.stderr}")
        logging.error(f"FFmpeg stdout:\n{e.stdout}") # Also log stdout for context
        # Clean up temporary output file if it exists and was generated by this function
        if output_audio_path == temp_output_path and os.path.exists(temp_output_path):
             try:
                 os.remove(temp_output_path)
                 logging.info(f"Cleaned up temporary file: {temp_output_path}")
             except OSError as rm_err:
                 logging.error(f"Error removing temporary file {temp_output_path}: {rm_err}")
        raise RuntimeError(f"FFmpeg execution failed: {e.stderr}") from e
    except Exception as e:
        logging.error(f"An unexpected error occurred during voice effect application: {str(e)}")
        # Clean up temporary output file if it exists and was generated by this function
        if output_audio_path == temp_output_path and os.path.exists(temp_output_path):
             try:
                 os.remove(temp_output_path)
                 logging.info(f"Cleaned up temporary file: {temp_output_path}")
             except OSError as rm_err:
                 logging.error(f"Error removing temporary file {temp_output_path}: {rm_err}")
        raise # Re-raise the original exception

def score_response(transcript, audio_url, question_text):
    """
    Score an interview response based on the provided inputs
    
    Args:
        transcript (str): The transcribed text of the response
        audio_url (str): URL to the audio file
        question_text (str): The interview question text
        
    Returns:
        dict: Scores for relevance, confidence, clarity, and engagement
    """
    try:
        # Extract audio features from URL
        audio_features = extract_audio_features(audio_url)
        
        # Calculate individual scores
        relevance_scores = analyze_relevance(transcript, question_text)
        confidence_scores = analyze_confidence(transcript, audio_features)
        clarity_scores = analyze_clarity(transcript, audio_features)
        engagement_scores = analyze_engagement(transcript, audio_features)
        
        # Calculate total scores based on the table weights
        total_relevance = (relevance_scores['transcript'] * 0.25) + (relevance_scores['audio'] * 0.05)
        total_confidence = (confidence_scores['transcript'] * 0.10) + (confidence_scores['audio'] * 0.20)
        total_clarity = (clarity_scores['transcript'] * 0.15) + (clarity_scores['audio'] * 0.15)
        total_engagement = (engagement_scores['transcript'] * 0.0) + (engagement_scores['audio'] * 0.10)

        # Calculate the overall total
        overall_score = total_relevance + total_confidence + total_clarity + total_engagement
        
        return {
            'relevance': total_relevance,
            'confidence': total_confidence,
            'clarity': total_clarity,
            'engagement': total_engagement,
            'total_score': overall_score
        }
    except Exception as e:
        logging.error(f"Error scoring response: {str(e)}")
        return {
            'error': str(e),
            'overall_score': 0
        }

def extract_audio_features(audio_url):
    """
    Extract audio features from an audio URL
    
    Args:
        audio_url (str): URL to the audio file
        
    Returns:
        dict: Audio features including SNR, speech rate, etc.
    """
    try:
        # Download audio file to temporary location
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        temp_path = temp_file.name
        temp_file.close()
        
        response = requests.get(audio_url)
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        
        # Load audio with librosa
        y, sr = librosa.load(temp_path, sr=None)
        
        # Calculate audio features
        # Speech rate (words per minute) - estimate from duration and transcript length
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Signal-to-noise ratio (SNR)
        signal_power = np.mean(y**2)
        noise_sample = y[:int(sr/10)] if len(y) > sr/10 else y  # Use first 100ms as noise sample
        noise_power = np.mean(noise_sample**2)
        snr = 10 * np.log10(signal_power / max(noise_power, 1e-10)) if noise_power > 0 else 20.0
        
        # Volume consistency (standard deviation of amplitude envelope)
        envelope = np.abs(librosa.feature.rms(y=y)[0])
        volume_consistency = 1.0 - min(1.0, np.std(envelope) / np.mean(envelope) if np.mean(envelope) > 0 else 0)
        
        # Pause ratio (estimated from zero crossings)
        zero_crossings = librosa.feature.zero_crossing_rate(y)[0]
        pause_ratio = 1.0 - np.mean(zero_crossings)
        
        # Clean up temporary file
        os.unlink(temp_path)
        
        return {
            'duration': duration,
            'snr': snr,
            'volume_consistency': volume_consistency,
            'pause_ratio': pause_ratio,
            'speech_rate': 150  # Default estimate, will be updated with transcript
        }
    except Exception as e:
        logging.error(f"Error extracting audio features: {str(e)}")
        return {
            'duration': 0,
            'snr': 10.0,  # Default values
            'volume_consistency': 0.7,
            'pause_ratio': 0.2,
            'speech_rate': 150
        }

def analyze_relevance(transcript, question):
    """
    Analyze the relevance of the transcript to the question
    Args:
    transcript (str): The transcription text
    question (str): The question text
    Returns:
    dict: Relevance scores for transcript and audio
    """
    try:
        # Create document objects for Google NLP
        transcript_doc = language_v1.Document(content=transcript, type_=language_v1.Document.Type.PLAIN_TEXT)
        question_doc = language_v1.Document(content=question, type_=language_v1.Document.Type.PLAIN_TEXT)
        
        # Analyze entities and keywords
        transcript_entities = nlp_client.analyze_entities(document=transcript_doc).entities
        question_entities = nlp_client.analyze_entities(document=question_doc).entities
        
        # Extract keywords
        transcript_keywords = {entity.name.lower() for entity in transcript_entities}
        question_keywords = {entity.name.lower() for entity in question_entities}
        
        # Calculate keyword overlap with bonus
        keyword_overlap = len(transcript_keywords.intersection(question_keywords))
        # More forgiving - get partial credit even for minimal overlap
        keyword_score = min(1.0, (keyword_overlap + 0.5) / max(len(question_keywords), 1))
        
        # Calculate semantic similarity using sentence embeddings
        transcript_embedding = get_embedding(transcript)
        question_embedding = get_embedding(question)
        semantic_similarity = cosine_similarity(transcript_embedding, question_embedding)[0][0]
        # Increase the baseline for semantic similarity
        semantic_score = max(0.3, (semantic_similarity + 1) / 2)  # Scale from [-1,1] to [0.3,1]
        
        # Analyze sentiment alignment with greater tolerance
        transcript_sentiment = nlp_client.analyze_sentiment(document=transcript_doc).document_sentiment
        question_sentiment = nlp_client.analyze_sentiment(document=question_doc).document_sentiment
        sentiment_alignment = max(0.3, 1.0 - abs(transcript_sentiment.score - question_sentiment.score) / 2)
        
        # Combine scores with higher baseline for transcript relevance
        transcript_relevance = 0.7 * semantic_score + 0.2 * keyword_score + 0.1 * sentiment_alignment
        
        # Audio component of relevance with higher base score
        audio_relevance = max(0.3, semantic_score * 0.6)  # Higher base score
        
        return {
            'transcript': min(1.0, max(0.3, transcript_relevance)),  # Minimum score of 0.3
            'audio': min(1.0, max(0.3, audio_relevance))  # Minimum score of 0.3
        }
    except Exception as e:
        logging.error(f"Error analyzing relevance: {str(e)}")
        return {'transcript': 0.6, 'audio': 0.5}  # Higher default values


def analyze_confidence(transcript, audio_features):
    """
    Analyze confidence based on transcript and audio features
    Args:
    transcript (str): The transcription text
    audio_features (dict): Audio features extracted from the audio file
    Returns:
    dict: Confidence scores for transcript and audio
    """
    try:
        # Create document object for Google NLP
        doc = language_v1.Document(content=transcript, type_=language_v1.Document.Type.PLAIN_TEXT)
        
        # Analyze sentiment for confidence indicators
        sentiment = nlp_client.analyze_sentiment(document=doc).document_sentiment
        sentiment_magnitude = sentiment.magnitude
        
        # Analyze syntax for confidence indicators (use of active voice, assertive statements)
        syntax_analysis = nlp_client.analyze_syntax(document=doc)
        
        # Count assertive words, first-person pronouns, hedging phrases
        assertive_count = 0
        hedging_count = 0
        first_person_count = 0
        
        # Reduced list of hedging phrases (fewer penalties)
        hedging_phrases = ['not sure', 'i guess', 'um', 'uh']
        
        lowercase_transcript = transcript.lower()
        for phrase in hedging_phrases:
            hedging_count += lowercase_transcript.count(phrase)
            
        for token in syntax_analysis.tokens:
            # Check for first person pronouns
            if token.part_of_speech.case == language_v1.PartOfSpeech.Case.NOMINATIVE and \
               token.lemma.lower() in ['i', 'we']:
                first_person_count += 1
                
            # Check for assertive verbs - expanded list to give more credit
            if token.part_of_speech.mood == language_v1.PartOfSpeech.Mood.IMPERATIVE or \
               (token.part_of_speech.tense == language_v1.PartOfSpeech.Tense.PRESENT and
                token.lemma.lower() in ['know', 'believe', 'ensure', 'guarantee', 'confirm', 'understand', 'see', 'find', 'think']):
                assertive_count += 1
        
        # Calculate transcript confidence score with lower penalties
        word_count = max(1, len(transcript.split()))
        hedging_ratio = min(0.4, hedging_count / word_count)  # Cap penalty
        assertive_ratio = min(1.0, (assertive_count + 1) / max(1, word_count))  # Bonus point
        
        transcript_confidence = (
            0.5 * (1.0 - hedging_ratio * 0.5) +  # Reduced hedging penalty
            0.4 * assertive_ratio +  # More assertive words = more confident
            0.1 * min(1.0, sentiment_magnitude + 0.3)  # Bonus for emotion
        )
        
        # Calculate audio confidence score with more tolerance
        snr_factor = min(1.0, max(0.6, audio_features.get('snr', 0) / 10.0))  # Higher SNR threshold
        volume_factor = max(0.5, audio_features.get('volume_consistency', 0.7))  # Minimum volume consistency
        pause_factor = max(0.4, 1.0 - abs(audio_features.get('pause_ratio', 0.2) - 0.2) / 0.3)  # More pause tolerance
        
        audio_confidence = (
            0.4 * snr_factor +  # Clear voice = more confident
            0.4 * volume_factor +  # Consistent volume = more confident
            0.2 * pause_factor  # Appropriate pauses = more confident
        )
        
        return {
            'transcript': min(1.0, max(0.4, transcript_confidence)),  # Minimum score of 0.4
            'audio': min(1.0, max(0.4, audio_confidence))  # Minimum score of 0.4
        }
    except Exception as e:
        logging.error(f"Error analyzing confidence: {str(e)}")
        return {'transcript': 0.6, 'audio': 0.6}  # Higher default values


def analyze_clarity(transcript, audio_features):
    """
    Analyze clarity based on transcript and audio features
    Args:
    transcript (str): The transcription text
    audio_features (dict): Audio features extracted from the audio file
    Returns:
    dict: Clarity scores for transcript and audio
    """
    try:
        # Create document object for Google NLP
        doc = language_v1.Document(content=transcript, type_=language_v1.Document.Type.PLAIN_TEXT)
        
        # Analyze syntax for clarity indicators
        syntax_analysis = nlp_client.analyze_syntax(document=doc)
        
        # Calculate sentence complexity with wider acceptable range
        sentences = [sentence.text.content for sentence in syntax_analysis.sentences]
        avg_sentence_length = sum(len(sentence.split()) for sentence in sentences) / max(len(sentences), 1)
        
        # More tolerant sentence length factor (accepting 8-25 words as good)
        optimal_length = 15
        tolerance = 15
        sentence_length_factor = max(0.5, 1.0 - abs(avg_sentence_length - optimal_length) / tolerance)
        
        # Check for repeated words/phrases indicating confusion
        words = [token.text.content.lower() for token in syntax_analysis.tokens
                if token.part_of_speech.tag != language_v1.PartOfSpeech.Tag.PUNCT]
        
        # Count filler words but with reduced penalty
        filler_words = [
            'um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically', 
            'actually', 'literally', 'just', 'so', 'well', 'I mean', 
            'right', 'okay', 'mmm', 'err'
        ]  # Reduced list of filler words
        filler_count = sum(words.count(filler) for filler in filler_words)
        filler_ratio = min(0.4, filler_count / max(len(words), 1))  # Cap the penalty
        
        # Calculate coherence using classification with bonus
        classification = nlp_client.classify_text(document=doc)
        category_count = len(classification.categories) if hasattr(classification, 'categories') else 0
        topic_focus = min(1.0, max(0.5, 1.2 / max(category_count, 1)))  # Bonus for focus
        
        # Calculate transcript clarity score with minimum threshold
        transcript_clarity = (
            0.4 * sentence_length_factor +  # Good sentence structure
            0.3 * (1.0 - filler_ratio * 0.6) +  # Reduced filler word penalty
            0.3 * topic_focus  # Focused on topic
        )
        
        # Calculate audio clarity score with wider acceptable ranges
        speech_rate = audio_features.get('speech_rate', 150)
        rate_factor = max(0.6, 1.0 - abs(speech_rate - 150) / 150)  # More tolerance for speed
        
        pause_ratio = audio_features.get('pause_ratio', 0.2)
        pause_factor = max(0.5, 1.0 - abs(pause_ratio - 0.2) / 0.3)  # More tolerance for pauses
        
        audio_clarity = (
            0.5 * rate_factor +  # Good speech rate
            0.5 * pause_factor  # Appropriate pauses
        )
        
        return {
            'transcript': min(1.0, max(0.4, transcript_clarity)),  # Minimum score of 0.4
            'audio': min(1.0, max(0.4, audio_clarity))  # Minimum score of 0.4
        }
    except Exception as e:
        logging.error(f"Error analyzing clarity: {str(e)}")
        return {'transcript': 0.6, 'audio': 0.6}  # Higher default values


def analyze_engagement(transcript, audio_features):
    """
    Analyze engagement based on transcript and audio features
    Args:
    transcript (str): The transcription text
    audio_features (dict): Audio features extracted from the audio file
    Returns:
    dict: Engagement scores for transcript and audio
    """
    try:
        # Create document object for Google NLP
        doc = language_v1.Document(content=transcript, type_=language_v1.Document.Type.PLAIN_TEXT)
        
        # Analyze sentiment for engagement indicators
        sentiment = nlp_client.analyze_sentiment(document=doc).document_sentiment
        sentiment_magnitude = sentiment.magnitude  # Higher magnitude = more emotional engagement
        
        # Give partial credit for transcript despite scoring table
        transcript_engagement = min(1.0, sentiment_magnitude + 0.3)  # Bonus for any emotion
        
        # Calculate audio engagement score with very forgiving parameters
        volume_variance = 1.0 - audio_features.get('volume_consistency', 0.5)
        
        # Extremely wide acceptable range for optimal variance
        optimal_variance = 0.3
        tolerance = 0.8  # Much more tolerance for variance from optimal
        
        # Very forgiving volume engagement calculation
        volume_engagement = min(1.0, max(0.4, 1.0 - abs(volume_variance - optimal_variance) / tolerance))
        
        # Get pause ratio with a more moderate default
        pause_ratio = audio_features.get('pause_ratio', 0.2)
        pause_tolerance = 0.5  # Much more tolerance for pause ratio
        
        # Very forgiving audio engagement calculation
        audio_engagement = (
            0.7 * volume_engagement +  # Dynamic volume indicates engagement
            0.3 * min(1.0, max(0.5, 1.0 - abs(pause_ratio - 0.2) / pause_tolerance))  # Good pausing with higher floor
        )
        
        # Log engagement scores
        logging.info(f"Transcript Engagement: {transcript_engagement}, Audio Engagement: {audio_engagement}")
        
        return {
            'transcript': 0.2,  # Give some credit to transcript despite scoring table
            'audio': min(1.0, max(0.4, audio_engagement))  # Minimum score of 0.4
        }
    except Exception as e:
        logging.error(f"Error analyzing engagement: {str(e)}")
        return {'transcript': 0.2, 'audio': 0.6}  # Higher default value for audio

def get_embedding(text):
    """
    Get embedding vector for text using pre-trained model
    
    Args:
        text (str): Input text
        
    Returns:
        numpy.ndarray: Embedding vector
    """
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).numpy()