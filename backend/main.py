from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import firebase_admin
from firebase_admin import credentials, firestore, storage
import uuid
import json
import os
import sys
import time
import logging
import datetime
import re
from pydantic import BaseModel

# Import API routers
from api import interviews

# For debugging purposes
print("Starting FastAPI application...")
print(f"Current working directory: {os.getcwd()}")


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="EqualLens API", 
              description="API for EqualLens job and CV management",
              version="1.0.0")

# Configure CORS to allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])

# Helper function to generate readable job IDs
def generate_job_id(job_title):
    """Generate a readable job ID based on the job title and current datetime"""
    # Clean job title and convert to lowercase
    if not job_title:
        job_title = "job"
    
    # Remove special characters and convert spaces to hyphens
    clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', job_title.lower())
    clean_title = re.sub(r'\s+', '-', clean_title)
    
    # Limit to 20 characters for the title part
    if len(clean_title) > 20:
        clean_title = clean_title[:20]
    
    # Add timestamp in format YYYYMMDD-HHMMSS
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    
    # Add some randomness (4 characters)
    random_suffix = str(uuid.uuid4())[:4]
    
    # Combine: clean-title-YYYYMMDD-HHMMSS-random
    job_id = f"{clean_title}-{timestamp}-{random_suffix}"
    
    return job_id

# Function to get current timestamp as a string
def get_current_timestamp():
    """Return current timestamp as a string in ISO format"""
    return datetime.datetime.now().isoformat()

# Initialize Firebase with credentials
try:
    # Modified file path logic to correctly locate the firebase_config.json
    config_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "equallens-project", "firebase_config.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase_config.json"),
        os.path.join(os.getcwd(), "firebase_config.json")  # Try current working directory as well
    ]
    
    firebase_config_path = None
    for path in config_paths:
        print(f"Checking for config at: {path}")
        if os.path.exists(path):
            firebase_config_path = path
            print(f"Found Firebase config at: {path}")
            break
    
    if not firebase_config_path:
        raise FileNotFoundError("firebase_config.json file not found in any expected locations")
    
    cred = credentials.Certificate(firebase_config_path)
    
    # Load and parse the config file to get the exact bucket name
    with open(firebase_config_path, 'r') as config_file:
        config_data = json.load(config_file)
        project_id = config_data.get('project_id', 'equallens-ee9db')
    
    print(f"Project ID from config: {project_id}")
    
    # Initialize Firebase app WITHOUT specifying storage bucket first
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        print("Firebase initialized without storage bucket specification")
    
    # Initialize Firestore client
    db = firestore.client()
    print("Firestore client initialized")
    
    # Try multiple bucket naming patterns
    bucket = None
    bucket_options = [
        f"{project_id}.appspot.com",  # Standard pattern
        project_id,                    # Just project ID
        f"gs://{project_id}.appspot.com", # Full gs:// URL
        f"gs://{project_id}"           # Alternate gs:// URL
    ]
    
    for bucket_name in bucket_options:
        try:
            print(f"Trying to access bucket with name: {bucket_name}")
            bucket = storage.bucket(bucket_name)
            # Test if the bucket is accessible
            bucket_exists = bucket.exists()
            if bucket_exists:
                print(f"Found accessible bucket: {bucket.name}")
                break
            else:
                print(f"Bucket {bucket_name} doesn't exist")
                bucket = None
        except Exception as e:
            print(f"Error accessing bucket {bucket_name}: {e}")
            bucket = None
    
    if bucket is None:
        print("WARNING: Could not access any Firebase Storage buckets")
        print("Will continue without Storage functionality - file uploads will fail")
        print(f"Please create a bucket for your project at https://console.firebase.google.com/project/{project_id}/storage")
    
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    print(f"Exception type: {type(e)}")
    print(f"Exception details: {str(e)}")
    print(f"Stack trace:", file=sys.stderr)
    import traceback
    traceback.print_exc()
    db = None
    bucket = None

# Pydantic models for request validation
class JobData(BaseModel):
    jobTitle: str
    jobDescription: str
    languages: List[str]
    minimumCGPA: float
    skills: List[str]

@app.get("/")
async def root():
    return {"message": "EqualLens API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is accessible"""
    try:
        # Try to access Firestore to verify connection
        db_test = db.collection('test').document('test').get()
        return {"status": "healthy", "firebase": "connected"}
    except Exception as e:
        return {"status": "healthy", "firebase": f"error: {str(e)}"}

@app.post("/upload-job")
async def upload_job(
    job_data: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        print(f"Received job data: {job_data}")
        print(f"Received {len(files)} files")
        
        # Parse job data JSON string
        job_details = json.loads(job_data)
        
        # Generate a readable job ID based on job title
        job_id = generate_job_id(job_details.get('jobTitle'))
        print(f"Generated job ID: {job_id}")
        
        # Check if Firebase is properly initialized
        if db is None:
            print("WARNING: Firebase Firestore is not initialized, using development mode instead")
            # Call the development version of the function
            return await upload_job_dev(job_data, files)
        
        # Store job details in Firestore
        job_ref = db.collection('jobs').document(job_id)
        
        # Get current timestamp as a string
        current_time = get_current_timestamp()
        
        # Store basic job details
        job_doc = {
            'jobId': job_id,
            'jobTitle': job_details.get('jobTitle'),
            'jobDescription': job_details.get('jobDescription'),
            'languages': job_details.get('languages'),
            'minimumCGPA': job_details.get('minimumCGPA'),
            'skills': job_details.get('skills'),
            'createdAt': current_time,  # Use string timestamp instead of SERVER_TIMESTAMP
            'resumeCount': len(files)
        }
        
        print(f"Storing job with ID {job_id}: {job_doc}")
        job_ref.set(job_doc)
        
        # Upload and store file references
        resume_refs = []
        resume_array = []  # Use an array instead of object for resumes
        
        # Check if bucket is available before attempting file uploads
        if bucket is None:
            print("WARNING: Firebase Storage bucket is not available.")
            print("Please check if the Storage bucket has been created in your Firebase project.")
            print(f"Visit https://console.firebase.google.com/project/{project_id}/storage to create the bucket.")
            print("Using development mode for file handling...")
            
            # Save the job details in Firestore but use mock URLs for files
            # Create mock resume objects similar to dev mode
            resume_refs = []
            resume_array = []
            
            for i, file in enumerate(files):
                resume_number = i + 1
                resume_id = f"resume_{resume_number}"
                
                # Create a mock resume object
                mock_url = f"https://storage.googleapis.com/mock-storage/{job_id}/{resume_id}.pdf"
                
                resume_obj = {
                    'resumeId': resume_id,
                    'contentType': file.content_type or 'application/pdf',
                    'storagePath': f"resumes/{job_id}/{resume_id}/mock.pdf",
                    'downloadUrl': mock_url,
                    'uploadedAt': get_current_timestamp(),
                    'resumeNumber': resume_number,
                    'originalFilename': file.filename,
                    'uploadSuccess': False,  # Mark as not successfully uploaded to real storage
                    'extractedText': '',
                    'skillsExtracted': [],
                    'education': '',
                    'experienceYears': 0,
                    'certifications': []
                }
                
                resume_array.append(resume_obj)
                resume_ref = job_ref.collection('resumes').document(resume_id)
                resume_doc = resume_obj.copy()
                resume_doc['uploadedAt'] = firestore.SERVER_TIMESTAMP
                resume_ref.set(resume_doc)
                
                # Add to resume references list for the response
                resume_refs.append({
                    'id': resume_id,
                    'downloadUrl': mock_url,
                    'resumeNumber': resume_number,
                    'uploadSuccess': False
                })
            
            # Update job with resume array
            job_ref.update({
                'resumes': resume_array
            })
            
            # Return response
            result = {
                "message": "Job stored successfully but resume uploads failed - Storage bucket not available",
                "jobId": job_id,
                "resumeCount": len(files),
                "resumes": resume_refs,
                "storageError": "Firebase Storage bucket does not exist. Please create it in the Firebase console."
            }
            
            return JSONResponse(status_code=200, content=result)
        
        for i, file in enumerate(files):
            # Create unique file name to avoid collisions
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            
            # Create a numeric identifier for this resume (1-based index)
            resume_number = i + 1
            resume_id = f"resume_{resume_number}"
            
            # Create hierarchical storage path
            storage_path = f"resumes/{job_id}/{resume_id}/{file_id}{file_extension}"
            
            print(f"Processing file {resume_number}/{len(files)}: {file.filename}")
            
            # Read file content
            content = await file.read()
            
            download_url = None
            upload_success = False
            
            try:
                # Only attempt upload if bucket is available
                if bucket is not None:
                    # Upload to Firebase Storage
                    blob = bucket.blob(storage_path)
                    print(f"Created blob at path: {storage_path}")
                    
                    # Explicitly set the content type before upload
                    content_type = file.content_type or 'application/pdf'  # Default to PDF if not specified
                    print(f"Using content type: {content_type}")
                    
                    # Upload with explicit content type
                    blob.upload_from_string(content, content_type=content_type)
                    print(f"Successfully uploaded content to blob")

                    # Make file publicly accessible
                    blob.make_public()
                    print(f"Made blob public")
                    
                    # Get the download URL
                    download_url = blob.public_url
                    upload_success = True
                    print(f"File uploaded successfully. URL: {download_url}")
                else:
                    # Create a mock URL if bucket is unavailable
                    download_url = f"https://storage.googleapis.com/{project_id}.appspot.com/mock-{resume_number}"
                    print(f"Using mock URL due to bucket unavailability: {download_url}")
                    upload_success = False
            except Exception as storage_error:
                print(f"Error uploading to Firebase Storage: {storage_error}")
                print(f"Exception details: {str(storage_error)}")
                import traceback
                traceback.print_exc()
                
                # Use a placeholder URL if storage upload fails
                download_url = f"https://storage.placeholder.com/resume-{resume_number}-upload-failed"
                print(f"Using placeholder URL: {download_url}")
            
            # Create resume object for array (avoid using SERVER_TIMESTAMP)
            resume_obj = {
                'resumeId': resume_id,
                'contentType': file.content_type or 'application/pdf',  # Provide a default
                'storagePath': storage_path,
                'downloadUrl': download_url,
                'uploadedAt': current_time,  # Use string timestamp
                'resumeNumber': resume_number,
                'originalFilename': file.filename,
                'uploadSuccess': upload_success,
                # Add placeholder fields for future data extraction
                'extractedText': '',
                'skillsExtracted': [],
                'education': '',
                'experienceYears': 0,
                'certifications': []
            }
            
            # Add to the resume array
            resume_array.append(resume_obj)
            
            # Store individual resume document
            # It's safe to use SERVER_TIMESTAMP for direct document fields
            resume_doc = resume_obj.copy()
            resume_doc['uploadedAt'] = firestore.SERVER_TIMESTAMP  # Replace string with actual SERVER_TIMESTAMP
            
            resume_ref = job_ref.collection('resumes').document(resume_id)
            resume_ref.set(resume_doc)
            
            # Create branches for future data processing
            analysis_ref = resume_ref.collection('analysis').document('overview')
            analysis_ref.set({
                'processed': False,
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            
            # Add placeholder documents for future processing stages
            stages = ['extracted_text', 'skills', 'education', 'experience', 'matching_score']
            for stage in stages:
                stage_ref = resume_ref.collection('analysis').document(stage)
                stage_ref.set({
                    'processed': False,
                    'createdAt': firestore.SERVER_TIMESTAMP
                })
            
            # Add to resume references list for the response
            resume_refs.append({
                'id': resume_id,
                'downloadUrl': download_url,
                'resumeNumber': resume_number,
                'uploadSuccess': upload_success
            })
        
        # Update the job document with the resume array
        job_ref.update({
            'resumes': resume_array
        })
        
        result = {
            "message": "Job and resumes uploaded successfully",
            "jobId": job_id,
            "resumeCount": len(files),
            "resumes": resume_refs
        }
        
        print(f"Upload successful: {result}")
        return JSONResponse(status_code=200, content=result)
        
    except Exception as e:
        print(f"Error uploading job: {e}")
        print(f"Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500, 
            content={
                "error": str(e),
                "type": str(type(e).__name__),
                "message": "An error occurred while processing your request"
            }
        )

@app.post("/upload-job-dev")
async def upload_job_dev(
    job_data: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Development version of upload_job that doesn't require Firebase"""
    try:
        print(f"DEV MODE: Received job data: {job_data}")
        print(f"DEV MODE: Received {len(files)} files")
        
        # Parse job data JSON string to verify it's valid
        job_details = json.loads(job_data)
        
        # Generate a readable job ID
        job_id = generate_job_id(job_details.get('jobTitle'))
        print(f"DEV MODE: Generated job ID: {job_id}")
        
        # Create response with an array of resume objects
        resume_array = []
        
        for i, file in enumerate(files):
            resume_number = i + 1
            resume_id = f"resume_{resume_number}"
            
            # Create a mock resume object with the structure you want
            resume_obj = {
                "resumeId": resume_id,
                "downloadUrl": f"https://storage.example.com/{job_id}/{resume_id}.pdf",
                "uploadSuccess": True,
                "extractedText": f"Sample extracted text for resume {resume_number}...",
                "skillsExtracted": job_details.get("skills", [])[:min(3, len(job_details.get("skills", [])))],
                "education": "Bachelor's in Computer Science",
                "experienceYears": resume_number + 2,
                "certifications": ["Sample Certification"],
                "originalFilename": file.filename,
                "uploadedAt": get_current_timestamp()
            }
            
            resume_array.append(resume_obj)
        
        # Return mock response
        return {
            "message": "Job and resumes processed successfully (DEV MODE)",
            "jobId": job_id,
            "resumeCount": len(files),
            "resumes": resume_array
        }
        
    except Exception as e:
        print(f"DEV MODE Error: {e}")
        return JSONResponse(
            status_code=500, 
            content={
                "error": str(e),
                "message": "An error occurred in development mode"
            }
        )

# Start the server
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn server on http://localhost:8000")
    print("Access the API documentation at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Server stopped.")
