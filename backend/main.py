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
import requests
import base64
from dotenv import load_dotenv
from google.api_core.client_options import ClientOptions
from google.cloud import documentai  # type: ignore

# Load environment variables from .env file
load_dotenv()

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
    # Try to use FIREBASE_CONFIG_PATH from environment variable first
    firebase_config_path = os.getenv("FIREBASE_CONFIG_PATH")
    
    # If not set in .env, use the fallback logic
    if not firebase_config_path or not os.path.exists(firebase_config_path):
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
    else:
        print(f"Using Firebase config from environment variable: {firebase_config_path}")
    
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
    
    # Try to get bucket name from environment variable first
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if bucket_name:
        print(f"Using bucket name from environment variable: {bucket_name}")
        try:
            bucket = storage.bucket(bucket_name)
            # Test if the bucket is accessible
            bucket_exists = bucket.exists()
            if not bucket_exists:
                print(f"Bucket {bucket_name} from environment variable doesn't exist")
                bucket = None
            else:
                print(f"Found accessible bucket from env var: {bucket.name}")
        except Exception as e:
            print(f"Error accessing bucket {bucket_name} from env var: {e}")
            bucket = None
    
    # If not set in .env or not accessible, use the fallback logic
    if not bucket_name or bucket is None:
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

# Function to process document using Document AI
def process_document(file_content: bytes, mime_type: str) -> dict:
    """Processes a document using an existing Document AI processor and extracts structured data."""
    project_id = os.getenv("DOCUMENTAI_PROJECT_ID", "default_project_id")
    location = os.getenv("DOCUMENTAI_LOCATION", "us")  # "us" or "eu"
    processor_id = os.getenv("DOCUMENTAI_PROCESSOR_ID", "default_processor_id")
    processor_version = os.getenv("DOCUMENTAI_PROCESSOR_VERSION", "default_processor_version")

    # Define API endpoint
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")

    # Initialize the Document AI client
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    # Construct processor resource name with version
    processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}/processorVersions/{processor_version}"

    # Create a raw document request
    raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)

    # Create a request using the existing processor
    request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)

    # Process the document
    result = client.process_document(request=request)

    # Extract structured data from the document
    document = result.document
    structured_data = {}

    for entity in document.entities:
        field_name = entity.type_  # Field name as defined in the processor
        field_value = entity.mention_text  # Extracted value for the field
        structured_data[field_name] = field_value

    return structured_data

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
            'createdAt': current_time,
            'resumeCount': len(files)
        }
        
        print(f"Storing job with ID {job_id}: {job_doc}")
        try:
            job_ref.set(job_doc)
            print(f"✓ Successfully stored job document in Firestore")
        except Exception as firestore_error:
            print(f"ERROR: Failed to store job in Firestore: {firestore_error}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": str(firestore_error),
                    "message": "Failed to store job in Firestore"
                }
            )
        
        # Upload and store file references
        resume_refs = []
        resume_array = []  # Use an array for resumes with simplified structure
        
        # Check if bucket is available before attempting file uploads
        if bucket is None:
            print("WARNING: Firebase Storage bucket is not available.")
            print("Please check if the Storage bucket has been created in your Firebase project.")
            print(f"Visit https://console.firebase.google.com/project/{project_id}/storage to create the bucket.")
            print("Using development mode for file handling...")
            
            # Save the job details in Firestore but use mock URLs for files
            # Create mock resume objects
            resume_refs = []
            resume_array = []
            
            for i, file in enumerate(files):
                resume_number = i + 1
                resume_id = f"resume_{resume_number}"
                
                # Create a mock resume object with only required fields
                mock_url = f"https://storage.googleapis.com/mock-storage/{job_id}/{resume_id}.pdf"
                
                resume_obj = {
                    'resumeId': resume_id,
                    'contentType': file.content_type or 'application/pdf',
                    'storagePath': f"resumes/{job_id}/{resume_id}/mock.pdf",
                    'downloadUrl': mock_url,
                }
                
                resume_array.append(resume_obj)
                
                # Add to resume references list for the response
                resume_refs.append({
                    'resumeId': resume_id,
                    'downloadUrl': mock_url,
                    'storagePath': f"resumes/{job_id}/{resume_id}/mock.pdf",
                    'contentType': file.content_type or 'application/pdf'
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
        
        # Calculate progress per file to track overall progress
        total_files = len(files)
        progress_per_file = 100 / total_files if total_files > 0 else 100
        current_progress = 0
        
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
            print(f"Upload progress: {current_progress:.1f}%")
            
            # Read file content
            content = await file.read()
            
            # Increment progress after file read (25% of file's progress)
            current_progress += progress_per_file * 0.25
            print(f"Read file content, progress: {current_progress:.1f}%")
            
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

                    # Increment progress after file upload (50% of file's progress)
                    current_progress += progress_per_file * 0.5
                    print(f"Uploaded to storage, progress: {current_progress:.1f}%")

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
            
            try:
                # Extract structured data using Document AI
                structured_data = process_document(content, file.content_type or "application/pdf")
                print(f"Extracted structured data for resume {resume_number}: {structured_data}")

                # Increment progress after data extraction (25% of file's progress)
                current_progress += progress_per_file * 0.25
                print(f"Extracted data, progress: {current_progress:.1f}%")

                # Add structured data to the resume object
                resume_obj = {
                    'resumeId': resume_id,
                    'contentType': file.content_type or 'application/pdf',
                    'storagePath': storage_path,
                    'downloadUrl': download_url,
                    'extractedData': structured_data  # Save structured data here
                }
            except Exception as extraction_error:
                print(f"Error extracting structured data for resume {resume_number}: {extraction_error}")
                resume_obj = {
                    'resumeId': resume_id,
                    'contentType': file.content_type or 'application/pdf',
                    'storagePath': storage_path,
                    'downloadUrl': download_url,
                    'extractedData': None  # Set to None if extraction fails
                }
                
                # Still increment progress even if extraction fails
                current_progress += progress_per_file * 0.25
            
            # Add to the resume array
            resume_array.append(resume_obj)
            
            # Store individual resume document
            resume_doc = resume_obj.copy()
            resume_doc['uploadedAt'] = firestore.SERVER_TIMESTAMP
            
            resume_ref = job_ref.collection('resumes').document(resume_id)
            resume_ref.set(resume_doc)
            
            # Add to resume references list for the response
            resume_refs.append({
                'resumeId': resume_id,
                'downloadUrl': download_url,
                'storagePath': storage_path,
                'contentType': file.content_type or 'application/pdf'
            })
        
        # Ensure progress is at 100% when complete
        current_progress = 100.0
        print(f"Upload complete, final progress: {current_progress:.1f}%")
        
        # Update the job document with the resume array
        try:
            print(f"Updating job with resume array (count: {len(resume_array)})")
            job_ref.update({
                'resumes': resume_array
            })
            print(f"✓ Successfully updated job with resume array in Firestore")
        except Exception as update_error:
            print(f"ERROR: Failed to update job with resume array: {update_error}")
        
        # Verify data was saved properly by reading it back
        try:
            job_verification = job_ref.get()
            if job_verification.exists:
                job_data = job_verification.to_dict()
                saved_resume_count = len(job_data.get('resumes', []))
                print(f"✓ Verification: Job exists in Firestore with {saved_resume_count} resumes")
                
                # Check if at least one resume document exists
                resume_docs = job_ref.collection('resumes').limit(1).get()
                if len(resume_docs) > 0:
                    print(f"✓ Verification: At least one resume document exists in Firestore")
                else:
                    print(f"⚠️ Warning: No resume documents found in Firestore")
            else:
                print(f"⚠️ Warning: Job verification failed - job document not found")
        except Exception as verify_error:
            print(f"⚠️ Warning: Error during verification: {verify_error}")
        
        result = {
            "message": "Job and resumes uploaded successfully",
            "jobId": job_id,
            "resumeCount": len(files),
            "resumes": resume_refs,
            "firestore": {
                "jobSaved": True,
                "resumesSaved": len(resume_array)
            },
            "progress": 100.0  # Return final progress with response
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
        
        # Create response with an array of simplified resume objects
        resume_array = []
        
        for i, file in enumerate(files):
            resume_number = i + 1
            resume_id = f"resume_{resume_number}"
            
            # Create a simplified mock resume object
            resume_obj = {
                "resumeId": resume_id,
                "downloadUrl": f"https://storage.example.com/{job_id}/{resume_id}.pdf",
                "storagePath": f"resumes/{job_id}/{resume_id}.pdf",
                "contentType": file.content_type or 'application/pdf'
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