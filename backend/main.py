from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv
<<<<<<< HEAD

# Load environment variables from .env file
load_dotenv()

=======
from google.api_core.client_options import ClientOptions
from google.cloud import documentai  # type: ignore
from api.interview import router as interviews_router
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

>>>>>>> fefa630 (Committing changes before rebasing)
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

# Import API routers
from api import interviews, jobs, candidates

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

<<<<<<< HEAD
# Include the API routers
app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])  # Fixed prefix to match `/api/jobs`
app.include_router(candidates.router, prefix="/api/candidates", tags=["candidates"])
=======
# Load environment variables from .env file
load_dotenv()

app.include_router(interviews_router, prefix="/api/interviews", tags=["interviews"])

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
            f"{project_id}.firebasestorage.com",  # Standard pattern
            project_id,                    # Just project ID
            f"gs://{project_id}.firebasestorage.com", # Full gs:// URL
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
>>>>>>> fefa630 (Committing changes before rebasing)

@app.get("/")
async def root():
    return {"message": "EqualLens API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is accessible"""
    from core.firebase import firebase_client
    
    firebase_status = {
        "initialized": firebase_client.initialized,
        "db_available": firebase_client.db is not None,
        "storage_available": firebase_client.bucket is not None
    }
    
    # Get expected config paths for diagnostics
    config_paths = [
        os.path.join(os.path.dirname(__file__), "equallens-project", "firebase_config.json"),
        os.path.join(os.path.dirname(__file__), "firebase_config.json"),
        os.path.join(os.getcwd(), "firebase_config.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "equallens-project", "firebase_config.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase_config.json")
    ]
    
    config_path_exists = {path: os.path.exists(path) for path in config_paths}
    
    return {
        "status": "healthy",
        "firebase": firebase_status,
        "environment": {
            "cwd": os.getcwd(),
            "firebase_config_env": os.getenv("FIREBASE_CONFIG_PATH"),
            "config_paths_checked": config_path_exists
        }
    }

# Start the server
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn server on http://localhost:8000")
    print("Access the API documentation at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Server stopped.")