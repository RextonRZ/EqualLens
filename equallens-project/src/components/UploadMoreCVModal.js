import React, { useState, useRef, useEffect, useCallback, useReducer } from "react";
import "../components/pages/UploadCV.css"; // Reuse existing CSS
import "./UploadMoreCVModal.css"; // Import the modal-specific CSS
import "../components/pageloading.css";

// File upload reducer to manage file upload state more efficiently
const fileUploadReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_FILES':
            return {
                ...state,
                selectedFiles: action.payload.updatedFiles,
                uploadQueue: action.payload.newQueue,
                processingFiles: true
            };
        case 'FILE_PROGRESS':
            return {
                ...state,
                uploadProgress: {
                    ...state.uploadProgress,
                    [action.payload.fileName]: action.payload.progress
                }
            };
        case 'PROCESS_NEXT':
            return {
                ...state,
                isLoading: true
            };
        case 'FILE_COMPLETE':
            return {
                ...state,
                uploadQueue: state.uploadQueue.slice(1)
            };
        case 'QUEUE_COMPLETE':
            return {
                ...state,
                isLoading: false,
                processingFiles: false
            };
        case 'REMOVE_FILE':
            const fileToRemove = state.selectedFiles[action.payload.index];
            return {
                ...state,
                selectedFiles: state.selectedFiles.filter((_, i) => i !== action.payload.index),
                uploadQueue: fileToRemove ? 
                    state.uploadQueue.filter(queueFile => queueFile.name !== fileToRemove.name) : 
                    state.uploadQueue,
                uploadProgress: fileToRemove ? 
                    // Remove the progress entry for this file
                    Object.fromEntries(
                        Object.entries(state.uploadProgress).filter(([key]) => key !== fileToRemove.name)
                    ) : 
                    state.uploadProgress
            };
        case 'RESET':
            return {
                selectedFiles: [],
                isLoading: false,
                uploadProgress: {},
                uploadQueue: [],
                processingFiles: false
            };
        default:
            return state;
    }
};

const LoadingAnimation = () => {
    return (
        <div className="loading-animation">
            <div className="seesaw-container">
                <div className="bar"></div>
                <div className="ball"></div>
            </div>
        </div>
    );
};

const UploadMoreCVModal = ({ isOpen, onClose, jobId, jobTitle, onUploadComplete }) => {
    // Use reducer for file upload state management
    const [fileState, fileDispatch] = useReducer(fileUploadReducer, {
        selectedFiles: [],
        isLoading: false,
        uploadProgress: {},
        uploadQueue: [],
        processingFiles: false
    });
  
    const [isDragging, setIsDragging] = useState(false); 
    const fileInputRef = useRef(null);
    const uploadContainerRef = useRef(null);
    const progressAnimationRef = useRef(null);
    
    // API state variables
    const [apiStatus, setApiStatus] = useState("idle"); // idle, loading, success, error
    const [submitProgress, setSubmitProgress] = useState(0); // Track overall submission progress
    
    // Add state for managing success and error modals
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [uploadedCount, setUploadedCount] = useState(0);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Hide body scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'visible';
        }
        
        return () => {
            document.body.style.overflow = 'visible';
        };
    }, [isOpen]);

    // Clean up animation frame on component unmount
    useEffect(() => {
        return () => {
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
        };
    }, []);

    // Process files and add to queue
    const processFiles = useCallback((files) => {
        // If already processing files, don't allow new uploads
        if (fileState.isLoading || fileState.processingFiles) {
            alert("Please wait for the current file to complete uploading before adding new files.");
            return;
        }
        
        let updatedFiles = [...fileState.selectedFiles];
        let newFiles = [];
        
        // Process all files but upload one at a time
        for (const fileToProcess of files) {
            // Check file format
            const extension = fileToProcess.name.split('.').pop().toLowerCase();
            const validExtensions = ['pdf', 'doc', 'docx'];
            
            if (!validExtensions.includes(extension)) {
                alert(`${fileToProcess.name} is not a supported file type. Please upload PDF, DOC, or DOCX files only.`);
                continue;
            }

            // Check if file with same name exists
            const existingIndex = updatedFiles.findIndex(file => file.name === fileToProcess.name);
            
            if (existingIndex !== -1) {
                const confirmReplace = window.confirm(`A file named "${fileToProcess.name}" already exists. Do you want to replace it?`);
                
                if (confirmReplace) {
                    // Replace the file in our updated array
                    updatedFiles[existingIndex] = fileToProcess;
                    // Mark this file to be added to the queue
                    newFiles.push(fileToProcess);
                }
            } else {
                // New file, add it to both arrays
                updatedFiles.push(fileToProcess);
                newFiles.push(fileToProcess);
            }
        }

        if (newFiles.length > 0) {
            // Filter out any files from the queue that are being replaced
            const newQueue = [
                ...fileState.uploadQueue.filter(queueFile => 
                    !newFiles.some(newFile => newFile.name === queueFile.name)
                ),
                ...newFiles
            ];
            
            fileDispatch({
                type: 'ADD_FILES',
                payload: { 
                    updatedFiles, 
                    newQueue 
                }
            });
        }
    }, [fileState.selectedFiles, fileState.isLoading, fileState.processingFiles, fileState.uploadQueue]);

    // Process upload queue sequentially
    useEffect(() => {
        if (fileState.uploadQueue.length === 0) {
            if (fileState.processingFiles) {
                fileDispatch({ type: 'QUEUE_COMPLETE' });
            }
            return;
        }

        // Process one file at a time
        const processNextFile = async () => {
            fileDispatch({ type: 'PROCESS_NEXT' });
            const fileToProcess = fileState.uploadQueue[0];
            
            // Initialize progress for this file
            fileDispatch({
                type: 'FILE_PROGRESS', 
                payload: { fileName: fileToProcess.name, progress: 0 }
            });

            // Simulate upload for current file
            await new Promise(resolve => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress > 100) progress = 100;

                    fileDispatch({
                        type: 'FILE_PROGRESS',
                        payload: { fileName: fileToProcess.name, progress: Math.floor(progress) }
                    });

                    if (progress === 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            resolve();
                        }, 500);
                    }
                }, 200);
            });

            // Remove processed file from queue
            fileDispatch({ type: 'FILE_COMPLETE' });
        };

        processNextFile();
    }, [fileState.uploadQueue, fileState.processingFiles]);

    useEffect(() => {
        const uploadContainer = uploadContainerRef.current;
        
        if (uploadContainer) {
            const handleLocalDragOver = (event) => {
                event.preventDefault();
                uploadContainer.classList.add('dragover');
            };

            const handleLocalDragLeave = () => {
                uploadContainer.classList.remove('dragover');
            };

            const handleLocalDrop = () => {
                uploadContainer.classList.remove('dragover');
            };

            uploadContainer.addEventListener('dragover', handleLocalDragOver);
            uploadContainer.addEventListener('dragleave', handleLocalDragLeave);
            uploadContainer.addEventListener('drop', handleLocalDrop);

            return () => {
                uploadContainer.removeEventListener('dragover', handleLocalDragOver);
                uploadContainer.removeEventListener('dragleave', handleLocalDragLeave);
                uploadContainer.removeEventListener('drop', handleLocalDrop);
            };
        }
    }, []);
    
    useEffect(() => {
        // Only add document-level event listeners when modal is open
        if (!isOpen) return;

        const handleDocumentDragOver = (event) => {
            event.preventDefault();
            if (!isDragging && !fileState.isLoading && !fileState.processingFiles) {
                setIsDragging(true);
            }
        };

        const handleDocumentDragLeave = (event) => {
            event.preventDefault();
            
            if (event.clientX <= 0 || event.clientY <= 0 || 
                event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
                setIsDragging(false);
            }
        };

        const handleDocumentDrop = (event) => {
            event.preventDefault();
            setIsDragging(false);
            
            // Prevent file drop during loading
            if (fileState.isLoading || fileState.processingFiles) {
                alert("Please wait for the current file to complete uploading before adding new files.");
                return;
            }
            
            const files = Array.from(event.dataTransfer.files);
            if (files.length > 0) {
                processFiles(files);
            }
        };

        document.addEventListener('dragover', handleDocumentDragOver);
        document.addEventListener('dragleave', handleDocumentDragLeave);
        document.addEventListener('drop', handleDocumentDrop);

        return () => {
            document.removeEventListener('dragover', handleDocumentDragOver);
            document.removeEventListener('dragleave', handleDocumentDragLeave);
            document.removeEventListener('drop', handleDocumentDrop);
        };
    }, [isDragging, processFiles, fileState.isLoading, fileState.processingFiles, isOpen]);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            processFiles(files);
            // Reset the file input so the same file can be selected again
            event.target.value = '';
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        // Only show dragover effect if not currently loading
        if (!fileState.isLoading && !fileState.processingFiles) {
            event.dataTransfer.dropEffect = 'copy';
        } else {
            // Use 'none' to indicate dropping is not allowed
            event.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        
        // Prevent file drop during loading
        if (fileState.isLoading || fileState.processingFiles) {
            alert("Please wait for the current file to complete uploading before adding new files.");
            return;
        }
        
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    };

    const handleFileInputKeyDown = (e) => {
        // Activate file input on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current.click();
        }
    };

    const removeFile = (index) => {
        fileDispatch({
            type: 'REMOVE_FILE',
            payload: { index }
        });
    };

    const handleChooseFile = () => {
        fileInputRef.current.click();
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();

        switch (extension) {
            case 'pdf':
                return <div className="file-icon pdf-icon">PDF</div>;
            case 'doc':
            case 'docx':
                return <div className="file-icon doc-icon">DOC</div>;
            default:
                return <div className="file-icon default-icon">FILE</div>;
        }
    };

    const getFullPageOverlay = () => {
        if (!isDragging) return null;
        
        return (
            <div className="fullpage-drop-overlay">
                <div className="drop-content">
                    <div className="file-preview">
                        <div className="file-icon-large pdf-icon-large">FILE</div>
                        {fileState.selectedFiles.length > 0 && <div className="copy-badge">Copy</div>}
                    </div>
                    <h2 className="drop-title">Drop files anywhere</h2>
                    <p className="drop-subtitle">Drop file(s) to upload it</p>
                </div>
            </div>
        );
    };

    // API URL for backend
    const API_URL = "http://localhost:8000";
    const API_ENDPOINT = "http://localhost:8000/api/jobs/upload-more-cv"; // Ensure the correct endpoint is used

    // Updated function to force generate detailed profiles
    const generateAndCheckDetailedProfiles = async (candidateIds) => {
        console.log("Generating detailed profiles for candidates:", candidateIds);
        const totalCandidates = candidateIds.length;
        let processedCount = 0;
        let failedCount = 0;
        
        // Process candidates in batches to avoid overloading the server
        const batchSize = 2;
        
        for (let i = 0; i < candidateIds.length; i += batchSize) {
            const batch = candidateIds.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(candidateIds.length/batchSize)}`);
            
            // Process this batch in parallel
            await Promise.all(batch.map(async (candidateId) => {
                try {
                    console.log(`Explicitly generating detailed profile for candidate ${candidateId}`);
                    
                    // Step 1: Generate the detailed profile using the detail endpoint
                    const detailResponse = await fetch(`http://localhost:8000/api/candidates/detail/${candidateId}`);
                    
                    if (!detailResponse.ok) {
                        throw new Error(`Failed to generate profile for candidate ${candidateId}`);
                    }
                    
                    // Successfully generated profile
                    processedCount++;
                    
                    // Update progress
                    const progressIncrement = 7 * (processedCount / totalCandidates);
                    setSubmitProgress(92 + progressIncrement);
                    
                } catch (error) {
                    failedCount++;
                    console.error(`Error generating profile for candidate ${candidateId}:`, error);
                }
            }));
            
            // Add a delay between batches to avoid overwhelming the server
            if (i + batchSize < candidateIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`Profile generation complete. Success: ${processedCount}, Failed: ${failedCount}`);
        return { processedCount, failedCount };
    };

    const handleUploadCV = async () => {
        if (!fileState.selectedFiles || fileState.selectedFiles.length === 0) {
            setErrorMessage("Please upload at least one CV file");
            setShowErrorModal(true);
            return;
        }
        
        try {
            // Cancel any existing animation frame
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            setApiStatus("loading");
            setSubmitProgress(0);
            
            // Add a small delay to ensure loading animation starts properly
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Create form data with job ID
            const formData = new FormData();
            formData.append("job_id", jobId);

            // Add all files
            fileState.selectedFiles.forEach(file => {
                formData.append("files", file);
            });
            
            // Simulate early progress before actual upload starts
            setSubmitProgress(15);

            // Function to simulate progress during waiting time
            let lastUpdateTime = Date.now();
            const simulateProgress = () => {
                if (apiStatus !== "loading") return; // Stop if no longer loading
                
                const now = Date.now();
                if (now - lastUpdateTime >= 800) {
                    setSubmitProgress(prev => {
                        const newProgress = prev + (Math.random() * 1.5);
                        return Math.min(newProgress, 90);
                    });
                    lastUpdateTime = now;
                }
                progressAnimationRef.current = requestAnimationFrame(simulateProgress);
            };
            
            // Start progress simulation
            progressAnimationRef.current = requestAnimationFrame(simulateProgress);
            
            // Send to backend API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData,
            });
            
            // Clear the progress simulation
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(`Server responded with ${response.status}: ${errorData.detail || errorData.error || errorData.message || await response.text()}`);
            }
            
            const responseData = await response.json();
            console.log("Upload more CV server response:", responseData);
            
            // UPDATED: Explicitly generate detailed profiles for all candidates
            if (responseData.candidateIds && responseData.candidateIds.length > 0) {
                console.log(`Generating detailed profiles for ${responseData.candidateIds.length} newly uploaded candidates...`);
                setSubmitProgress(92);
                
                try {
                    const result = await generateAndCheckDetailedProfiles(responseData.candidateIds);
                    console.log(`Profile generation results: ${result.processedCount} successful, ${result.failedCount} failed`);
                } catch (error) {
                    console.warn("Error during profile generation:", error);
                }
            } else {
                console.warn("No candidateIds received in response");
            }
            
            setSubmitProgress(100);
            
            // Set the number of uploaded CVs for success message
            setUploadedCount(responseData.applicationCount || fileState.selectedFiles.length);
            
            // Immediately close the modal with the uploaded count
            setTimeout(() => {
                // First close the modal
                onClose();
                
                // Then notify parent that upload is complete
                if (onUploadComplete && responseData.applicationCount > 0) {
                    onUploadComplete(responseData.applicationCount || fileState.selectedFiles.length);
                }
            }, 200);
            
        } catch (error) {
            // Clear animation frame in case of error too
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            console.error("Error uploading CV:", error);
            setApiStatus("error");
            setErrorMessage(error.message || "Error uploading CV. Please try again.");
            setShowErrorModal(true);
            
            // Reset API status after a short delay
            setTimeout(() => {
                setApiStatus("idle");
                setSubmitProgress(0);
            }, 1000);
        }
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
        // Reset the form state
        fileDispatch({ type: 'RESET' });
        setApiStatus("idle");
        setSubmitProgress(0);
    };

    const SuccessModal = () => (
        <div 
            className="status-modal-overlay" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
            onClick={(e) => e.stopPropagation()} // Prevent closing of success modal
        >
            <div className="status-modal success-modal">
                <div className="status-icon success-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 id="success-modal-title" className="status-title">Upload Complete!</h3>
                <p className="status-description">
                    <strong>{uploadedCount} CV{uploadedCount !== 1 ? 's' : ''} uploaded successfully</strong>
                </p>
                <div className="status-buttons">
                    <button 
                        className="status-button primary-button" 
                        onClick={closeSuccessModal}
                        autoFocus
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    const ErrorModal = () => (
        <div 
            className="status-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
            onClick={(e) => e.stopPropagation()} // Prevent closing of error modal
        >
            <div className="status-modal error-modal">
                <div className="status-icon error-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 id="error-modal-title" className="status-title">Upload Failed!</h3>
                <p className="status-message">{errorMessage || "Please try again"}</p>
                <div className="status-buttons">
                    <button 
                        className="status-button primary-button" 
                        onClick={() => setShowErrorModal(false)}
                        autoFocus
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );

    const handleCancelClick = () => {
        // If there are files selected, show confirmation dialog
        if (fileState.selectedFiles.length > 0) {
            setShowConfirmModal(true);
        } else {
            // No files, just close the modal
            onClose();
        }
    };

    const handleConfirmDiscard = () => {
        setShowConfirmModal(false);
        // Reset the form state
        fileDispatch({ type: 'RESET' });
        // Close the modal
        onClose();
    };

    const handleCancelDiscard = () => {
        setShowConfirmModal(false);
        // Stay in the modal, do nothing
    };

    const ConfirmModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal">
                <div className="status-icon warning-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3 className="status-title">Discard Files?</h3>
                <p className="status-description">Are you sure you want to discard the file upload?</p>
                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={handleCancelDiscard}>
                        No, Keep Files
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmDiscard}>
                        Yes, Discard Files
                    </button>
                </div>
            </div>
        </div>
    );

    // Add new function to handle overlay click
    const handleOverlayClick = (e) => {
        // Only proceed if not loading/processing files
        if (!fileState.isLoading && !fileState.processingFiles) {
            // If there are files selected, show confirmation dialog instead of closing directly
            if (fileState.selectedFiles.length > 0) {
                setShowConfirmModal(true);
            } else {
                // No files, just close the modal
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={handleOverlayClick}  // Change from onClick={onClose} to onClick={handleOverlayClick}
            role="dialog"
            aria-labelledby="modal-title"
            aria-modal="true"
        >
            <div 
                className="modal-content" 
                onClick={e => e.stopPropagation()}
            >
                {getFullPageOverlay()}
                
                {apiStatus === "loading" && (
                    <div className="api-loading-overlay">
                        <div className="api-loading-content">
                            <LoadingAnimation />
                            <p>Uploading files...</p>
                            <div className="progress-bar-container">
                                <div 
                                    className="progress-bar" 
                                    style={{ width: `${submitProgress}%` }}
                                ></div>
                                <span className="progress-text">{Math.round(submitProgress)}%</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Render success, error, and confirm modals */}
                {showSuccessModal && <SuccessModal />}
                {showErrorModal && <ErrorModal />}
                {showConfirmModal && <ConfirmModal />}
                
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">
                        Upload Candidate CVs for {jobTitle}
                    </h2>
                    <button 
                        className="modal-close" 
                        onClick={onClose}
                        aria-label="Close"
                        disabled={fileState.isLoading || fileState.processingFiles}
                    >
                        ×
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="upload-container" ref={uploadContainerRef}>
                        <div className="upload-card">
                            <div className="upload-dropzone-container">
                                <div
                                    className={`upload-dropzone ${(fileState.isLoading || fileState.processingFiles) ? 'disabled-dropzone' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    role="button"
                                    tabIndex={fileState.isLoading || fileState.processingFiles ? -1 : 0}
                                    aria-label="Upload files by dropping them here or press to select files"
                                    aria-disabled={fileState.isLoading || fileState.processingFiles}
                                    onKeyDown={handleFileInputKeyDown}
                                >
                                    <div className="upload-icon-container">
                                        <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                    </div>
                                    <p className="upload-text">
                                        {(fileState.isLoading || fileState.processingFiles) 
                                            ? "Please wait for the current upload to complete" 
                                            : "Drag and Drop files to upload"}
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden-input"
                                        disabled={fileState.isLoading || fileState.processingFiles}
                                    />
                                    <button
                                        className={`browse-button ${(fileState.isLoading || fileState.processingFiles) ? 'disabled-button' : ''}`}
                                        onClick={handleChooseFile}
                                        disabled={fileState.isLoading || fileState.processingFiles}
                                    >
                                        {(fileState.isLoading || fileState.processingFiles) 
                                            ? "Upload in Progress..." 
                                            : "Browse Files"}
                                    </button>
                                    <p className="upload-subtext">Supports PDF, DOC, DOCX</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="files-container">
                        <h3 className="files-title" id="uploaded-files-heading">Selected Files</h3>
                        {fileState.selectedFiles.length === 0 ? (
                            <div className="no-files">
                                <p className="no-files-text">No files selected yet</p>
                            </div>
                        ) : (
                            <div 
                                className="files-list"
                                role="list"
                                aria-labelledby="uploaded-files-heading"
                            >
                                {fileState.selectedFiles.map((file, index) => (
                                    <div 
                                        key={index} 
                                        className="file-item"
                                        role="listitem"
                                    >
                                        <div className="file-content">
                                            {getFileIcon(file.name)}
                                            <div className="file-details">
                                                <div className="file-header">
                                                    <p className="file-name" title={file.name}>
                                                        {file.name.length > 80 ? file.name.substring(0, 80) + '...' : file.name}
                                                    </p>
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="delete-button"
                                                        aria-label={`Remove file ${file.name}`}
                                                        disabled={fileState.isLoading || fileState.processingFiles}
                                                    >
                                                        <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                                {fileState.isLoading && fileState.uploadProgress[file.name] !== undefined && fileState.uploadProgress[file.name] < 100 ? (
                                                    <div className="progress-bar-container">
                                                        <div className="progress-bar" style={{ width: `${fileState.uploadProgress[file.name]}%` }}></div>
                                                        <span className="progress-text">{fileState.uploadProgress[file.name]}%</span>
                                                    </div>
                                                ) : fileState.processingFiles && fileState.uploadProgress[file.name] === undefined && fileState.uploadQueue && fileState.uploadQueue.some(queueFile => queueFile.name === file.name) ? (
                                                    <div className="waiting-container">
                                                        <p className="waiting-text">Waiting to upload...</p>
                                                    </div>
                                                ) : (
                                                    <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="modal-footer">
                    <button 
                        className="modal-button secondary-button" 
                        onClick={handleCancelClick}
                        disabled={fileState.isLoading || fileState.processingFiles}
                    >
                        Cancel
                    </button>
                    <button 
                        className="modal-button primary-button"
                        onClick={handleUploadCV}
                        disabled={fileState.selectedFiles.length === 0 || fileState.isLoading || fileState.processingFiles}
                    >
                        Upload CV{fileState.selectedFiles.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadMoreCVModal;
