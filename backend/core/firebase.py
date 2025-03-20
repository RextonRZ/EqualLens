import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage
import logging
from typing import Dict, Any, Optional  # Add this import for type annotations

logger = logging.getLogger(__name__)

class FirebaseClient:
    """Firebase client for Firestore and Storage operations."""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one instance is created."""
        if cls._instance is None:
            cls._instance = super(FirebaseClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize Firebase if not already initialized."""
        if self._initialized:
            return
            
        self._initialized = True
        self.db = None
        self.bucket = None
        self.project_id = "equallens-ee9db"  # Hardcoded project ID from your config
        
        try:
            self._initialize_firebase()
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            
    def is_initialized(self) -> bool:
        """Check if Firebase is properly initialized."""
        return self.db is not None

    def create_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> bool:
        """Create a document in Firestore."""
        if not self.is_initialized():
            logger.error("Firebase not initialized")
            return False
        
        try:
            self.db.collection(collection).document(document_id).set(data)
            return True
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            return False

    def _find_firebase_config(self) -> Optional[str]:
        """Find the Firebase configuration file."""
        config_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                         "firebase_config.json"),
            os.path.join(os.getcwd(), "firebase_config.json")
        ]
        
        for path in config_paths:
            logger.info(f"Looking for Firebase config at: {path}")
            if os.path.exists(path):
                logger.info(f"Found Firebase config at: {path}")
                return path
                
        return None
    
    def _initialize_firebase(self):
        """Initialize Firebase with credentials."""
        config_path = self._find_firebase_config()
    
        if not config_path:
            logger.error("Firebase config not found")
            return
        
        try:
            # Load credentials from the service account file
            cred = credentials.Certificate(config_path)
        
            # Initialize Firebase app if not already initialized
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            
            # Initialize Firestore client
            self.db = firestore.client()
        
            # Try multiple bucket name formats
            bucket_name_formats = [
                f"{self.project_id}.firebasestorage.app",  # New format shown in your screenshot
                f"{self.project_id}.appspot.com",          # Traditional format
                self.project_id                            # Just the project ID
            ]
        
            # Try each format until one works
            for bucket_name in bucket_name_formats:
                try:
                    logger.info(f"Attempting to connect to bucket: {bucket_name}")
                    self.bucket = storage.bucket(bucket_name)
                
                    # Test if we can access the bucket
                    self.bucket.exists()
                
                    logger.info(f"Successfully connected to bucket: {bucket_name}")
                    break
                except Exception as bucket_error:
                    logger.warning(f"Failed to connect to bucket {bucket_name}: {bucket_error}")
                    self.bucket = None
        
            if self.bucket is None:
                logger.error("Failed to connect to any storage bucket")
            
        except Exception as e:
            logger.error(f"Error initializing Firebase: {e}")
            self.db = None
            self.bucket = None
            
    # Add remaining methods from the original implementation
    def update_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> bool:
        """Update a document in Firestore."""
        if not self.is_initialized():
            logger.error("Firebase not initialized")
            return False
            
        try:
            self.db.collection(collection).document(document_id).update(data)
            return True
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            return False
            
    def get_document(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document from Firestore."""
        if not self.is_initialized():
            logger.error("Firebase not initialized")
            return None
            
        try:
            doc = self.db.collection(collection).document(document_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return None
            
    def upload_file(self, file_content: bytes, storage_path: str, content_type: str = None) -> Optional[str]:
        """Upload a file to Firebase Storage and return the download URL."""
        if not self.is_initialized() or self.bucket is None:
            logger.error("Firebase Storage not initialized")
            return None
            
        try:
            logger.info(f"Uploading file to path: {storage_path}")
            blob = self.bucket.blob(storage_path)
            blob.upload_from_string(file_content, content_type=content_type)
            blob.make_public()
            logger.info(f"File uploaded successfully, public URL: {blob.public_url}")
            return blob.public_url
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return None

# Initialize Firebase client
firebase_client = FirebaseClient()