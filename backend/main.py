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
from api.upload_cv import router as upload_cv_router
from api.dashboard import router as dashboard_router
from api.jobs import router as jobs_router

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
app.include_router(upload_cv_router)
app.include_router(dashboard_router)
app.include_router(jobs_router, prefix="/api/jobs", tags=["jobs"])

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

# Start the server
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn server on http://localhost:8000")
    print("Access the API documentation at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Server stopped.")