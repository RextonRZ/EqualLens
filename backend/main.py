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
import base64
from pydantic import BaseModel

# For debugging purposes
print("Starting FastAPI application...")
print(f"Current working directory: {os.getcwd()}")

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

# Initialize Firebase with credentials
try:
    # Modified file path logic to correctly locate the firebase_config.json
    # First try in the equallens-project directory
    config_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "equallens-project", "firebase_config.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase_config.json")
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
    
    # Initialize Firebase app with storage bucket based on project ID
    bucket_name = f"{project_id}.appspot.com"
    print(f"Attempting to connect to Firebase Storage bucket: {bucket_name}")
    
    firebase_admin.initialize_app(cred, {
        'storageBucket': bucket_name
    })
    
    # Initialize Firestore client
    db = firestore.client()
    
    # Verify bucket exists before continuing
    try:
        bucket = storage.bucket()
        # Test bucket access
        bucket.exists()
        print(f"Successfully connected to Firebase Storage bucket: {bucket.name}")
    except Exception as bucket_error:
        print(f"Error accessing Storage bucket: {bucket_error}")
        print("Will continue without Storage functionality - file uploads will fail")
        bucket = None
    
    print("Firebase initialized successfully")
    
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    print(f"Exception type: {type(e)}")
    print(f"Exception details: {str(e)}")
    print(f"Stack trace:", file=sys.stderr)
    import traceback
    traceback.print_exc()
    # Continue without Firebase - we'll handle the errors in the endpoints

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
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Store job details in Firestore
        job_ref = db.collection('jobs').document(job_id)
        
        # Store basic job details
        job_doc = {
            'jobTitle': job_details.get('jobTitle'),
            'jobDescription': job_details.get('jobDescription'),
            'languages': job_details.get('languages'),
            'minimumCGPA': job_details.get('minimumCGPA'),
            'skills': job_details.get('skills'),
            'createdAt': firestore.SERVER_TIMESTAMP,
            'resumeCount': len(files)  # Add count of resumes
        }
        
        print(f"Storing job with ID {job_id}: {job_doc}")
        job_ref.set(job_doc)
        
        # Upload and store file references
        resume_refs = []
        resume_summary = {}  # Summary of resumes for the job document
        
        # Check if bucket is available before attempting file uploads
        if bucket is None:
            raise Exception("Firebase Storage is not initialized. Cannot upload files.")
        
        for i, file in enumerate(files):
            # Create unique file name to avoid collisions
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(file.filename)[1]
            
            # Create a numeric identifier for this resume (1-based index)
            resume_number = i + 1
            
            # Create hierarchical storage path
            storage_path = f"resumes/{job_id}/resume_{resume_number}/{file_id}{file_extension}"
            
            print(f"Processing file {resume_number}/{len(files)}: {file.filename}")
            
            # Read file content
            content = await file.read()
            
            download_url = None
            try:
                # Upload to Firebase Storage
                blob = bucket.blob(storage_path)
                
                # Print detailed debug info about the bucket and blob
                print(f"Bucket name: {bucket.name}")
                print(f"Blob path: {blob.name}")
                
                blob.upload_from_string(content, content_type=file.content_type)
                
                # Make file publicly accessible
                blob.make_public()
                
                download_url = blob.public_url
                print(f"File uploaded successfully. URL: {download_url}")
                
            except Exception as storage_error:
                print(f"Error uploading to Firebase Storage: {storage_error}")
                # Use a better placeholder - base64 data URL instead of storage.placeholder.com
                # This creates a minimal text file that can be downloaded
                base64_data = base64.b64encode(f"Error loading resume {resume_number}".encode()).decode()
                download_url = f"data:text/plain;base64,{base64_data}"
                print(f"Using data URL as placeholder")
            
            # Create metadata for this resume - simplified to remove unnecessary fields
            resume_metadata = {
                'contentType': file.content_type,
                'storagePath': storage_path,
                'downloadUrl': download_url,
                'uploadedAt': firestore.SERVER_TIMESTAMP,
                'resumeNumber': resume_number,
                'fileContent': base64.b64encode(content).decode('utf-8')  # Store content even if upload fails
            }
            
            # Store file metadata in a structured way
            resume_ref = job_ref.collection('resumes').document(f"resume_{resume_number}")
            resume_ref.set(resume_metadata)
            
            # Create branches for future data
            # These will be populated later during processing
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
                'id': f"resume_{resume_number}",
                'downloadUrl': download_url,
                'resumeNumber': resume_number
            })
            
            # Add to summary for the job document
            resume_summary[f"resume_{resume_number}"] = {
                'downloadUrl': download_url
            }
        
        # Update the job document with resume summary
        job_ref.update({
            'resumes': resume_summary
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

# Modified to explicitly print a message when the server starts
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn server on http://localhost:8000")
    print("Access the API documentation at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # This line is reached only when the server stops
    print("Server stopped.")
