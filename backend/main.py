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
# Replace subprocess and tempfile with Python libraries for document handling
from io import BytesIO

# Add imports for document processing
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    reportlab_available = True
except ImportError:
    reportlab_available = False
    logging.warning("reportlab not installed. Install with: pip install reportlab")

try:
    import docx
    docx_available = True
except ImportError:
    docx_available = False
    logging.warning("python-docx not installed. Install with: pip install python-docx")

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
    departments: List[str]
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

# Function to convert DOC/DOCX to PDF format using pure Python
def convert_to_pdf(file_content: bytes, file_name: str) -> tuple:
    """Extracts text from DOC/DOCX files and creates a PDF with the extracted text.
    
    Args:
        file_content: The file content as bytes
        file_name: Original filename with extension
        
    Returns:
        Tuple of (converted PDF content as bytes, mime_type)
    """
    file_extension = os.path.splitext(file_name)[1].lower()
    
    if file_extension not in ['.doc', '.docx']:
        # No conversion needed, return original content
        return file_content, "application/pdf"
    
    # Check if required libraries are available
    if not reportlab_available:
        logger.error("reportlab not installed. Cannot convert document to PDF.")
        return file_content, f"application/{file_extension.replace('.', '')}"
    
    # Create BytesIO for the file content
    file_bytesio = BytesIO(file_content)
    extracted_text = ""
    
    try:
        # Process DOCX files
        if file_extension == '.docx' and docx_available:
            logger.info(f"Converting DOCX file: {file_name}")
            document = docx.Document(file_bytesio)
            
            # Extract text from paragraphs
            paragraphs = []
            for para in document.paragraphs:
                if para.text.strip():
                    paragraphs.append(para.text)
            
            # Extract text from tables
            for table in document.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for para in cell.paragraphs:
                            if para.text.strip():
                                paragraphs.append(para.text)
            
            extracted_text = "\n".join(paragraphs)
            logger.info(f"Successfully extracted {len(paragraphs)} paragraphs from DOCX")
            
        # Process DOC files (limited support)
        elif file_extension == '.doc':
            extracted_text = "NOTE: This is a DOC file that has been converted to plain text.\n\n"
            
            # Try to extract some text with basic encoding detection
            try:
                import chardet
                encoding_result = chardet.detect(file_content)
                encoding = encoding_result['encoding'] if encoding_result['confidence'] > 0.5 else 'utf-8'
                text = file_content.decode(encoding, errors='ignore')
                extracted_text += text
                logger.info(f"Extracted text from DOC file using encoding {encoding}")
            except Exception as e:
                logger.warning(f"Could not extract text from DOC file: {e}")
                extracted_text += "Could not extract text content from this DOC file."
        
        # Create PDF with extracted text
        pdf_bytesio = BytesIO()
        pdf = SimpleDocTemplate(pdf_bytesio, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Build content for PDF
        content = []
        content.append(Paragraph(f"Extracted Text from: {file_name}", styles['Title']))
        content.append(Spacer(1, 20))
        
        # Split the text into manageable paragraphs
        paragraphs = extracted_text.split('\n')
        for i, para_text in enumerate(paragraphs):
            if i > 1000:  # Limit number of paragraphs for memory safety
                content.append(Paragraph("... (text truncated due to size) ...", styles['Normal']))
                break
                
            if para_text.strip():
                try:
                    # Clean the text to prevent XML parsing errors in reportlab
                    cleaned_text = para_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    p = Paragraph(cleaned_text, styles['Normal'])
                    content.append(p)
                    content.append(Spacer(1, 10))
                except Exception as e:
                    logger.warning(f"Could not add paragraph to PDF: {e}")
        
        # Build PDF
        pdf.build(content)
        
        # Get the PDF content
        pdf_content = pdf_bytesio.getvalue()
        pdf_bytesio.close()
        
        logger.info(f"Successfully created PDF with {len(content)} content elements, size: {len(pdf_content)} bytes")
        return pdf_content, "application/pdf"
        
    except Exception as e:
        logger.error(f"Error converting document to PDF: {str(e)}")
        # Return original content if conversion fails
        return file_content, f"application/{file_extension.replace('.', '')}"

# Function to process document using Document AI
def process_document(file_content: bytes, mime_type: str, file_name: str) -> dict:
    """Processes a document using an existing Document AI processor and extracts structured data."""
    project_id = os.getenv("DOCUMENTAI_PROJECT_ID", "default_project_id")
    location = os.getenv("DOCUMENTAI_LOCATION", "us")  # "us" or "eu"
    processor_id = os.getenv("DOCUMENTAI_PROCESSOR_ID", "default_processor_id")
    processor_version = os.getenv("DOCUMENTAI_PROCESSOR_VERSION", "default_processor_version")
    
    # Get file extension
    file_extension = os.path.splitext(file_name)[1].lower()
    
    # Convert doc/docx to PDF if needed
    if file_extension in ['.doc', '.docx']:
        logger.info(f"Converting {file_extension} file to PDF for Document AI processing")
        file_content, converted_mime_type = convert_to_pdf(file_content, file_name)
        mime_type = converted_mime_type  # Make sure to use the new mime type
        logger.info(f"Conversion complete. New MIME type: {mime_type}, content size: {len(file_content)} bytes")

    # Define API endpoint
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")

    # Log Document AI request details
    logger.info(f"Sending document to Document AI - Processor ID: {processor_id}, MIME type: {mime_type}")
    
    try:
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
            
        logger.info(f"Document AI processing successful. Extracted {len(structured_data)} fields.")
        return structured_data
        
    except Exception as e:
        logger.error(f"Document AI processing failed: {str(e)}")
        # If Document AI fails but we have extracted text from DOCX, provide it as fallback
        if file_extension in ['.doc', '.docx'] and file_content:
            logger.info("Using text extraction as fallback for Document AI")
            return {"extracted_text": "Text extracted during conversion (Document AI processing failed)"}
        raise

# New helper functions to generate proper 8-digit IDs for each collection
def generate_formatted_id(prefix, db_client=None):
    """Generate an ID with format {prefix}-{8_digit_number}"""
    if db_client:
        # Get the counter reference
        counter_ref = db_client.collection('counters').document(f'{prefix}_counter')
        
        # Use atomic increment operation to update the counter
        try:
            # Atomically increment the counter by 1
            counter_ref.set(
                {'count': firestore.Increment(1)}, 
                merge=True
            )
            
            # Get the updated count
            counter_doc = counter_ref.get()
            if counter_doc.exists:
                current_count = counter_doc.to_dict().get('count', 1)
            else:
                # This shouldn't happen due to merge=True above, but just in case
                current_count = 1
        except Exception as e:
            print(f"Error generating ID with atomic increment: {e}")
            # Fallback to random ID if atomic increment fails
            import random
            current_count = random.randint(1, 99999999)
            
        # Format as 8-digit number
        formatted_number = f"{current_count:08d}"
    else:
        # Fallback to random 8-digit number when db isn't available
        import random
        formatted_number = f"{random.randint(1, 99999999):08d}"
        
    return f"{prefix}-{formatted_number}"

def generate_job_id(db_client=None):
    return generate_formatted_id("job", db_client)

def generate_application_id(db_client=None):
    return generate_formatted_id("app", db_client)

def generate_candidate_id(db_client=None):
    return generate_formatted_id("cand", db_client)

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
        
        # Generate a formatted job ID
        job_id = generate_job_id(db)
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
        
        # Store only job-related details in the jobs collection
        job_doc = {
            'jobId': job_id,
            'jobTitle': job_details.get('jobTitle'),
            'jobDescription': job_details.get('jobDescription'),
            'departments': job_details.get('departments'),
            'minimumCGPA': job_details.get('minimumCGPA'),
            'createdAt': current_time,
            'applicationCount': 0  # Initialize with zero applications
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
        
        # Track resumes, applications, and candidates
        application_refs = []
        candidate_refs = []
        
        # Check if bucket is available before attempting file uploads
        if bucket is None:
            print("WARNING: Firebase Storage bucket is not available.")
            print("Please check if the Storage bucket has been created in your Firebase project.")
            print(f"Visit https://console.firebase.google.com/project/{project_id}/storage to create the bucket.")
            print("Using development mode for file handling...")
            
            # Create mock applications and candidates
            for i, file in enumerate(files):
                # Generate IDs
                application_id = generate_application_id(db)
                candidate_id = generate_candidate_id(db)
                
                # Create a mock resume object with only required fields
                mock_url = f"https://storage.googleapis.com/mock-storage/{job_id}/{candidate_id}.pdf"
                
                # Create candidate record
                candidate_doc = {
                    'candidateId': candidate_id,
                    'extractedText': f"Mock extracted text for {file.filename}",
                    'resumeUrl': mock_url,
                }
                
                # Create application record
                application_doc = {
                    'applicationId': application_id,
                    'jobId': job_id,
                    'candidateId': candidate_id,
                    'applicationDate': current_time,
                    'status': 'new'
                }
                
                # Store records
                db.collection('candidates').document(candidate_id).set(candidate_doc)
                db.collection('applications').document(application_id).set(application_doc)
                
                # Track references for response
                candidate_refs.append(candidate_doc)
                application_refs.append(application_doc)
            
            # Return response with new structure
            result = {
                "message": "Job stored successfully but resume uploads failed - Storage bucket not available",
                "jobId": job_id,
                "resumeCount": len(files),
                "applications": application_refs,
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
            
            # Generate IDs for application and candidate
            application_id = generate_application_id(db)
            candidate_id = generate_candidate_id(db)
            
            # Create hierarchical storage path
            storage_path = f"resumes/{job_id}/{candidate_id}/{file_id}{file_extension}"
            
            print(f"Processing file {i+1}/{len(files)}: {file.filename}")
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
                # ...existing code for file upload...
                
                # Upload to Firebase Storage
                blob = bucket.blob(storage_path)
                print(f"Created blob at path: {storage_path}")
                
                # Explicitly set the content type before upload
                content_type = file.content_type or 'application/pdf'  # Default to PDF if not specified
                print(f"Using content type: {content_type}")
                
                # Upload with explicit content type
                blob.upload_from_string(content, content_type=content_type)
                print(f"Successfully uploaded content to blob")

                # Increment progress after file upload
                current_progress += progress_per_file * 0.5
                print(f"Uploaded to storage, progress: {current_progress:.1f}%")

                # Make file publicly accessible
                blob.make_public()
                print(f"Made blob public")
                
                # Get the download URL
                download_url = blob.public_url
                upload_success = True
                print(f"File uploaded successfully. URL: {download_url}")
            except Exception as storage_error:
                print(f"Error uploading to Firebase Storage: {storage_error}")
                # ...existing code for error handling...
                
                # Use a placeholder URL if storage upload fails
                download_url = f"https://storage.placeholder.com/resume-{i+1}-upload-failed"
                print(f"Using placeholder URL: {download_url}")
            
            try:
                # Get the correct file extension
                file_extension = os.path.splitext(file.filename)[1].lower()
                # Log file details before processing
                logger.info(f"Processing file: {file.filename}, type: {file.content_type}, extension: {file_extension}")
                
                # Extract structured data using Document AI with file conversion
                structured_data = process_document(content, file.content_type or "application/pdf", file.filename)
                print(f"Extracted structured data for candidate {candidate_id}: {structured_data}")

                # Check if structured data is empty or None
                if not structured_data:
                    logger.warning(f"No structured data extracted for file: {file.filename}")
                    structured_data = {"note": "No structured data could be extracted from this document"}

                # Increment progress after data extraction
                current_progress += progress_per_file * 0.25
                print(f"Extracted data, progress: {current_progress:.1f}%")
                
                # Create candidate record
                candidate_doc = {
                    'candidateId': candidate_id,
                    'extractedText': structured_data,  # Store extracted text here
                    'resumeUrl': download_url,
                    'storagePath': storage_path,
                    'uploadedAt': current_time
                }
                
                # Create application record 
                application_doc = {
                    'applicationId': application_id,
                    'jobId': job_id,
                    'candidateId': candidate_id,
                    'applicationDate': current_time,
                    'status': 'new'
                }
                
                # Store records in their respective collections
                db.collection('candidates').document(candidate_id).set(candidate_doc)
                db.collection('applications').document(application_id).set(application_doc)
                
                # Add references to our tracking lists
                candidate_refs.append(candidate_doc)
                application_refs.append(application_doc)
                
            except Exception as extraction_error:
                logger.error(f"Error extracting structured data: {extraction_error}")
                
                # Create candidate record with minimal info
                candidate_doc = {
                    'candidateId': candidate_id,
                    'extractedText': None,  # No extracted data
                    'resumeUrl': download_url,
                    'storagePath': storage_path,
                    'uploadedAt': current_time
                }
                
                # Create application record
                application_doc = {
                    'applicationId': application_id,
                    'jobId': job_id,
                    'candidateId': candidate_id,
                    'applicationDate': current_time,
                    'status': 'new'
                }
                
                # Store records even if extraction failed
                db.collection('candidates').document(candidate_id).set(candidate_doc)
                db.collection('applications').document(application_id).set(application_doc)
                
                # Add references to our tracking lists
                candidate_refs.append(candidate_doc)
                application_refs.append(application_doc)
                
                # Still increment progress even if extraction fails
                current_progress += progress_per_file * 0.25
        
        # Ensure progress is at 100% when complete
        current_progress = 100.0
        print(f"Upload complete, final progress: {current_progress:.1f}%")
        
        # Update the job document with application count
        try:
            print(f"Updating job with application count: {len(application_refs)}")
            job_ref.update({
                'applicationCount': len(application_refs)
            })
            print(f"✓ Successfully updated job with application count in Firestore")
        except Exception as update_error:
            print(f"ERROR: Failed to update job with application count: {update_error}")
        
        result = {
            "message": "Job and applications created successfully",
            "jobId": job_id,
            "applicationCount": len(application_refs),
            "applications": application_refs,
            "candidates": candidate_refs,
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
        
        # Generate IDs
        job_id = generate_job_id()
        print(f"DEV MODE: Generated job ID: {job_id}")
        
        # Create mock response with applications and candidates
        application_array = []
        candidate_array = []
        
        current_time = get_current_timestamp()
        
        for i, file in enumerate(files):
            application_id = generate_application_id()
            candidate_id = generate_candidate_id()
            
            # Create mock objects
            candidate_obj = {
                "candidateId": candidate_id,
                "extractedText": f"Mock extracted text for {file.filename}",
                "resumeUrl": f"https://storage.example.com/{job_id}/{candidate_id}.pdf"
            }
            
            application_obj = {
                "applicationId": application_id,
                "jobId": job_id,
                "candidateId": candidate_id,
                "applicationDate": current_time,
                "status": "new"
            }
            
            application_array.append(application_obj)
            candidate_array.append(candidate_obj)
        
        # Return mock response
        return {
            "message": "Job and applications processed successfully (DEV MODE)",
            "jobId": job_id,
            "applicationCount": len(files),
            "applications": application_array,
            "candidates": candidate_array
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