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

def get_audio_length(file_path):
    import wave
    with wave.open(file_path, "rb") as audio_file:
        return audio_file.getnframes() / audio_file.getframerate()

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

        # Get audio length for debugging
        audio_length = get_audio_length(audio_file_path)
        
        # Perform the transcription request
        response = None

        if audio_length < 60:
            response = client.recognize(config=config, audio=audio)
        else:
            response = client.long_running_recognize(config=config, audio=audio)
            response.result(timeout=90)  # Wait for the long-running operation to complete

        if not response.results:
            return {
                'transcript': "No transcription results (empty speech detected)",
                'confidence': 0.0,
                'raw_results': None
            }
        
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
        logging.error(f"Google Cloud Speech-to-Text error: {str(e) if e is not None else 'Unknown error'}")
        return {
            'transcript': f"Transcription error: {str(e) if e is not None else 'Unknown error'}",
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

    ffmpeg_path = None

    # Determine ffmpeg path based on platform
    if platform.system() == "Darwin":  # macOS
        # Try homebrew path first, fallback to others
        potential_paths = [
            '/opt/homebrew/Cellar/ffmpeg@6/6.1.2_8/bin/ffmpeg',  # Your current path
            '/opt/homebrew/bin/ffmpeg',                          # Common Homebrew location
            '/usr/local/bin/ffmpeg'                              # Alternative location
        ]
        
        for path in potential_paths:
            if os.path.exists(path):
                ffmpeg_path = path
                break
                
        if not ffmpeg_path:
            raise RuntimeError("FFmpeg not found. Please install it with 'brew install ffmpeg'")
    else:
        # For Windows and others, rely on PATH
        ffmpeg_path = r'C:\Users\hongy\Downloads\ffmpeg-n6.1-latest-win64-gpl-6.1\bin\ffmpeg.exe'
    
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
        # For Windows and others, rely on PATH
        ffmpeg_path = r'C:\Users\hongy\Downloads\ffmpeg-n6.1-latest-win64-gpl-6.1\bin\ffmpeg.exe'
    
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
        
        return {
            'relevance': total_relevance,
            'confidence': total_confidence,
            'clarity': total_clarity,
            'engagement': total_engagement
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
        transcript_relevance = 0.5 * semantic_score + 0.3 * keyword_score + 0.2 * sentiment_alignment
        
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
        hedging_ratio = min(0.7, hedging_count / word_count)  # Cap penalty
        assertive_ratio = min(1.0, (assertive_count + 1) / max(1, word_count))  # Bonus point
        
        transcript_confidence = (
            0.4 * (1.0 - hedging_ratio * 0.7) +  # Reduced hedging penalty
            0.3 * assertive_ratio +  # More assertive words = more confident
            0.3 * min(1.0, sentiment_magnitude + 0.2)  # Bonus for emotion
        )
        
        # Calculate audio confidence score with more tolerance
        snr_factor = min(1.0, max(0.4, audio_features.get('snr', 0) / 15.0))  # Lower SNR threshold
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
        tolerance = 10
        sentence_length_factor = max(0.5, 1.0 - abs(avg_sentence_length - optimal_length) / tolerance)
        
        # Check for repeated words/phrases indicating confusion
        words = [token.text.content.lower() for token in syntax_analysis.tokens
                if token.part_of_speech.tag != language_v1.PartOfSpeech.Tag.PUNCT]
        
        # Count filler words but with reduced penalty
        filler_words = ['um', 'uh']  # Reduced list of filler words
        filler_count = sum(words.count(filler) for filler in filler_words)
        filler_ratio = min(0.7, filler_count / max(len(words), 1))  # Cap the penalty
        
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
        rate_factor = max(0.5, 1.0 - abs(speech_rate - 150) / 120)  # More tolerance for speed
        
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
            0.6 * volume_engagement +  # Dynamic volume indicates engagement
            0.4 * min(1.0, max(0.4, 1.0 - abs(pause_ratio - 0.2) / pause_tolerance))  # Good pausing with higher floor
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