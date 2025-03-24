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

logger = logging.getLogger(__name__)
LINK_EXPIRY_DAYS = 7

def get_db():
    """Return the Firestore database client"""
    return firestore.client()

def get_storage():
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