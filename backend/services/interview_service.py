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

logger = logging.getLogger(__name__)
LINK_EXPIRY_DAYS = 7

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

def transcribe_audio_with_google_cloud(audio_file_path):
    """
    Transcribe audio file using Google Cloud Speech-to-Text API
    
    Args:
        audio_file_path (str): Path to the audio file to transcribe
    
    Returns:
        dict: Transcription results with transcript and confidence
    """
    try:
        # Instantiate a client
        client = speech.SpeechClient()
        
        # Read the audio file
        with io.open(audio_file_path, 'rb') as audio_file:
            content = audio_file.read()
        
        # Configure audio input
        audio = speech.RecognitionAudio(content=content)
        
        # Configure recognition settings
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,  # WAV format
            sample_rate_hertz=8000,  # Match FFmpeg output
            language_code='en-US',
            enable_automatic_punctuation=True,
            model='default',  # You can use 'video' model for better video audio
            profanity_filter=False,
            speech_contexts=[
                speech.SpeechContext(
                    phrases=['interview', 'job', 'experience', 'skills', 'role'],
                    boost=20.0  # Increase likelihood of these context words
                )
            ]
        )
        
        # Perform the transcription request
        response = client.recognize(config=config, audio=audio)
        
        # Process results
        transcripts = []
        confidence_scores = []
        
        for result in response.results:
            alternative = result.alternatives[0]
            transcripts.append(alternative.transcript)
            confidence_scores.append(alternative.confidence)
        
        # Combine multiple transcripts if multiple results
        full_transcript = ' '.join(transcripts)
        
        return {
            'transcript': full_transcript,
            'confidence': sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0,
            'raw_results': response.results
        }
    
    except Exception as e:
        logging.error(f"Google Cloud Speech-to-Text error: {str(e)}")
        return {
            'transcript': f"Transcription error: {str(e)}",
            'confidence': 0.0,
            'raw_results': None
        }
        
def extract_audio_with_ffmpeg(input_video_path, output_audio_path=None):
    """
    Extract audio from video using FFmpeg with robust error handling
    
    Args:
        input_video_path (str): Path to input video file
        output_audio_path (str, optional): Path for output audio file
    
    Returns:
        str: Path to extracted audio file
    """

    ffmpeg_path = r'/Users/vannessliu/Downloads/ffmpeg-n6.1-latest-win64-gpl-6.1.zip'
    
    if not input_video_path or not os.path.exists(ffmpeg_path):
        raise ValueError(f"Invalid input video path: {input_video_path}")
    
    # If no output path specified, generate one
    if output_audio_path is None:
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix="_audio.wav")
        output_audio_path = temp_audio_file.name
        temp_audio_file.close()
    
    try:
        # FFmpeg command to extract high-quality audio
        command = [
            ffmpeg_path, 
            '-i', input_video_path,   # Input video file
            '-vn',                    # Ignore video stream
            '-acodec', 'pcm_s16le',   
            '-ar', '8000',            # Lower sample rate might help
            '-ac', '1',               # Mono channel
            '-y',                     # Force WAV format
            output_audio_path         # Output audio file
        ]
        
        # Run FFmpeg command
        result = subprocess.run(
            command, 
            stdout=subprocess.DEVNULL,  
            stderr=subprocess.DEVNULL,  
            check=True
        )
        
        # Check for errors in subprocess
        if result.returncode != 0:
            logging.error(f"FFmpeg error: {result.stderr}")
            raise RuntimeError(f"Audio extraction failed: {result.stderr}")
        
        # Verify output file was created
        if not os.path.exists(output_audio_path):
            raise RuntimeError("Audio extraction failed: No output file created")
        
        logging.info(f"Audio extracted successfully: {output_audio_path}")
        return output_audio_path
    
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg audio extraction error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error in audio extraction: {str(e)}")
        raise

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
    ffmpeg_path = r'C:\Users\hongy\Downloads\ffmpeg-n6.1-latest-win64-gpl-6.1\bin\ffmpeg.exe'  # Path to ffmpeg executable
    
    if not input_audio_path or not os.path.exists(ffmpeg_path):
        raise ValueError(f"Invalid input audio path: {input_audio_path}")
    
    # If no output path specified, generate one
    if output_audio_path is None:
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix="_modified.wav")
        output_audio_path = temp_audio_file.name
        temp_audio_file.close()
    
    try:
        if effect_type.lower() == "helium":
            # Helium effect: increase pitch by 3 semitones without changing tempo
            command = [
                ffmpeg_path, 
                '-i', input_audio_path,
                '-af', 'rubberband=pitch=1.2,loudnorm=I=-16:LRA=11:TP=-1.5,highpass=f=200,lowpass=f=8000',
                '-ar', '16000',  # Consistent sample rate
                '-ac', '1',      # Mono channel for clarity
                '-y',
                output_audio_path
            ]
        else:
            command = [
                ffmpeg_path, 
                '-i', input_audio_path,
                '-c', 'copy',
                '-y',
                output_audio_path
            ]
        
        # Run FFmpeg command
        result = subprocess.run(
            command, 
            stdout=subprocess.PIPE,  
            stderr=subprocess.PIPE,
            check=True
        )
        
        # Check for errors in subprocess
        if result.returncode != 0:
            logging.error(f"FFmpeg error: {result.stderr.decode()}")
            raise RuntimeError(f"Voice effect application failed: {result.stderr.decode()}")
        
        # Verify output file was created
        if not os.path.exists(output_audio_path):
            raise RuntimeError("Voice effect application failed: No output file created")
        
        logging.info(f"Voice effect applied successfully: {output_audio_path}")
        return output_audio_path
    
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg voice effect error: {e.stderr.decode() if e.stderr else str(e)}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error in voice effect application: {str(e)}")
        raise