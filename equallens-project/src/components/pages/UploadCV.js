import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from "react";
import "./UploadCV.css";
import "../pageloading.css"; // Import the loading animation CSS

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

const UploadCV = () => {
    // Use reducer for file upload state management
    const [fileState, fileDispatch] = useReducer(fileUploadReducer, {
        selectedFiles: [],
        isLoading: false,
        uploadProgress: {},
        uploadQueue: [],
        processingFiles: false
    });
  
    const [currentStep, setCurrentStep] = useState("jobDetails"); // "jobDetails" or "uploadCV"
    const [jobData, setJobData] = useState(null); // To store submitted job details
    
    // Add API state variables
    const [apiStatus, setApiStatus] = useState("idle"); // idle, loading, success, error
    const [submitProgress, setSubmitProgress] = useState(0); // Track overall submission progress
    
    const [isDragging, setIsDragging] = useState(false); 
    const fileInputRef = useRef(null);
    const uploadContainerRef = useRef(null);
    
    // Create animation frame reference at the component level
    const progressAnimationRef = useRef(null);
    
    // Job details state
    const [jobTitle, setJobTitle] = useState("");
    const [jobTitleSuggestions, setJobTitleSuggestions] = useState([]);
    const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false);
    const [jobDescription, setJobDescription] = useState("");
    const [departments, setDepartments] = useState([]);
    const [departmentInput, setDepartmentInput] = useState("");
    const [departmentSuggestions, setDepartmentSuggestions] = useState([]);
    const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);
    const [minimumCGPA, setMinimumCGPA] = useState(2.50);
    const [cgpaInputValue, setCgpaInputValue] = useState("2.50");
    const [cgpaError, setCgpaError] = useState(false);
    const [skillInput, setSkillInput] = useState("");
    const [skillSuggestions, setSkillSuggestions] = useState([]);
    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
    const [skills, setSkills] = useState([]);

    // Sample data for suggestions - wrapped in useMemo to avoid recreation on each render
    const jobTitleOptions = useMemo(() => [
        "Software Engineer", "Data Scientist", "Project Manager", "Web Developer", 
        "UI/UX Designer", "Product Manager", "DevOps Engineer", "Systems Analyst",
        "Frontend Developer", "Backend Developer", "Full Stack Developer",
        "Machine Learning Engineer", "Business Analyst", "Quality Assurance Engineer"
    ], []);

    const departmentOptions = useMemo(() => [
        "Engineering", "Information Technology", "Marketing", "Finance", "Human Resources",
        "Sales", "Operations", "Customer Support", "Research & Development", "Legal",
        "Administration", "Design", "Product Management", "Business Development", "Data Science"
    ], []);

    const skillsOptions = useMemo(() => [
        "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "AWS", "Docker",
        "DevOps", "Machine Learning", "Data Analysis", "Agile", "Scrum",
        "Project Management", "UI/UX Design", "TypeScript", "Go", "Ruby", 
        "Communication", "Leadership", "Problem Solving", "C#", "PHP", "Angular",
        "Vue.js", "MongoDB", "GraphQL", "REST API", "Git"
    ], []);

    // Filter suggestions based on input
    useEffect(() => {
        if (jobTitle) {
            const filtered = jobTitleOptions.filter(
                option => option.toLowerCase().includes(jobTitle.toLowerCase()) // Case-insensitive search
            );
            setJobTitleSuggestions(filtered);
            setShowJobTitleSuggestions(filtered.length > 0);
        } else {
            setShowJobTitleSuggestions(false);
        }
    }, [jobTitle, jobTitleOptions]);

    useEffect(() => {
        if (departmentInput) {
            const filtered = departmentOptions.filter(
                option => option.toLowerCase().includes(departmentInput.toLowerCase())
            );
            setDepartmentSuggestions(filtered);
            setShowDepartmentSuggestions(filtered.length > 0);
        } else {
            setShowDepartmentSuggestions(false);
        }
    }, [departmentInput, departmentOptions]);

    useEffect(() => {
        if (skillInput) {
            const filtered = skillsOptions.filter(
                option => option.toLowerCase().includes(skillInput.toLowerCase())
            );
            setSkillSuggestions(filtered);
            setShowSkillSuggestions(filtered.length > 0);
        } else {
            setShowSkillSuggestions(false);
        }
    }, [skillInput, skillsOptions]);

    // Selectors for job title and skills
    const handleJobTitleSelect = (selected) => {
        setJobTitle(selected);
        setShowJobTitleSuggestions(false);
    };

    const handleSkillSelect = (selected) => {
        if (!skills.includes(selected)) {
            setSkills([...skills, selected]);
        }
        setSkillInput("");
        setShowSkillSuggestions(false);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.suggestion-container')) {
                setShowJobTitleSuggestions(false);
                setShowSkillSuggestions(false);
                setShowDepartmentSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Process files and add to queue - optimized with useCallback and useReducer
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

            // Check if file with same name exists - log for debugging
            console.log("Checking for duplicate file:", fileToProcess.name);
            const existingIndex = updatedFiles.findIndex(file => file.name === fileToProcess.name);
            console.log("Existing file index:", existingIndex);
            
            if (existingIndex !== -1) {
                // We need to use a synchronous approach here since we're in a loop
                const confirmReplace = window.confirm(`A file named "${fileToProcess.name}" already exists. Do you want to replace it?`);
                
                if (confirmReplace) {
                    console.log("Replacing file:", fileToProcess.name);
                    // Replace the file in our updated array
                    updatedFiles[existingIndex] = fileToProcess;
                    
                    // Mark this file to be added to the queue
                    newFiles.push(fileToProcess);
                }
            } else {
                console.log("Adding new file:", fileToProcess.name);
                // New file, add it to both arrays
                updatedFiles.push(fileToProcess);
                newFiles.push(fileToProcess);
            }
        }

        if (newFiles.length > 0) {
            console.log("New files to process:", newFiles.map(f => f.name));
            // Filter out any files from the queue that are being replaced
            const newQueue = [
                ...fileState.uploadQueue.filter(queueFile => 
                    !newFiles.some(newFile => newFile.name === queueFile.name)
                ),
                ...newFiles
            ];
            
            console.log("New upload queue:", newQueue.map(f => f.name));
            
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
        // Only add document-level event listeners when on the upload CV page
        if (currentStep !== "uploadCV") return;

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
    }, [isDragging, processFiles, fileState.isLoading, fileState.processingFiles, currentStep]); // Add currentStep to dependencies

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

    // Add this function to fix the error
    const handleFileInputKeyDown = (e) => {
        // Activate file input on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current.click();
        }
    };

    // Improved file remove function using reducer
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

    // Job details handlers
    const handleAddSkill = () => {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput("");
        }
    };

    const removeSkill = (skill) => {
        setSkills(skills.filter(s => s !== skill));
    };

    const handleSkillKeyPress = (e) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            handleAddSkill();
        }
    };

    // Department handlers
    const handleDepartmentSelect = (department) => {
        if (!departments.includes(department)) {
            setDepartments([...departments, department]);
        }
        setDepartmentInput("");
        setShowDepartmentSuggestions(false);
    };

    const handleAddDepartment = () => {
        if (departmentInput.trim() && !departments.includes(departmentInput.trim())) {
            setDepartments([...departments, departmentInput.trim()]);
            setDepartmentInput("");
        }
    };
    
    const handleDepartmentKeyPress = (e) => {
        if (e.key === 'Enter' && departmentInput.trim()) {
            e.preventDefault();
            handleAddDepartment();
        }
    };

    const removeDepartment = (department) => {
        setDepartments(departments.filter(dept => dept !== department));
    };

    const validateForm = () => {
        if (!jobTitle.trim()) {
            alert("Job Title is required");
            return false;
        }
        
        if (skills.length === 0) {
            alert("At least one Required Skill is required");
            return false;
        }
        
        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Save job details and move to next step
            const jobDetails = {
                jobTitle,
                jobDescription,
                departments,
                minimumCGPA,
                skills
            };
            
            console.log("Job details saved:", jobDetails);
            setJobData(jobDetails);
            setCurrentStep("uploadCV");
            
            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Add handler for going back to job details
    const handleBackToJobDetails = () => {
        setCurrentStep("jobDetails");
        // Scroll to top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Reapply slider fill percentage to fix CGPA slider color issue
        setTimeout(() => {
            updateSliderPercentage(minimumCGPA);
        }, 100);
    };

    // API URL for backend
    const API_URL = "http://localhost:8000"; // Update this with your FastAPI URL
    // Uncomment this line to use the development endpoint if Firebase is not working
    // const API_ENDPOINT = `${API_URL}/upload-job-dev`;
    const API_ENDPOINT = `${API_URL}/upload-job`;

    // Clean up animation frame on component unmount
    useEffect(() => {
        return () => {
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
        };
    }, []);
    
    // Updated LoadingAnimation component with cleaner structure
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

    // Add state for managing success and error modals
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Success Modal Component with improved accessibility
    const SuccessModal = () => (
        <div 
            className="status-modal-overlay" 
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
        >
            <div className="status-modal success-modal">
                <div className="status-icon success-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 id="success-modal-title" className="status-title">Submission Complete!</h3>
                <p className="status-description">
                    <strong>Your files have been uploaded successfully</strong>
                </p>
                <div className="status-buttons">
                    <button 
                        className="status-button secondary-button" 
                        onClick={handleCreateMoreJob}
                    >
                        Create More Job
                    </button>
                    <button 
                        className="status-button primary-button" 
                        onClick={handleGoToDashboard}
                        autoFocus
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );

    // Error Modal Component with improved accessibility
    const ErrorModal = () => (
        <div 
            className="status-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
        >
            <div className="status-modal error-modal">
                <div className="status-icon error-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 id="error-modal-title" className="status-title">Submission Failed!</h3>
                <p className="status-message">{errorMessage || "Please try again"}</p>
                <div className="status-buttons">
                    <button 
                        className="status-button primary-button" 
                        onClick={handleTryAgain}
                        autoFocus
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
    
    // Button action handlers with full reset
    // const handleUploadMoreJobs = () => {
    //     // Reset all form and file states
    //     setCurrentStep("jobDetails");
    //     setJobTitle("");
    //     setJobDescription("");
    //     setDepartments([]);
    //     setMinimumCGPA(2.50);
    //     setSkills([]);
    //     setJobData(null);
    //     fileDispatch({ type: 'RESET' });
    //     setApiStatus("idle");
    //     setSubmitProgress(0);
    //     setShowSuccessModal(false);
    // };
    
    const handleGoToDashboard = () => {
        // Close the modal first
        setShowSuccessModal(false);
        
        // Navigate to dashboard page
        window.location.href = "/dashboard";
        
        // If you're using React Router, you could use navigate instead:
        // navigate("/dashboard");
    };
    
    const handleTryAgain = () => {
        setShowErrorModal(false);
        // Reset API state for retrying
        setApiStatus("idle");
        setSubmitProgress(0);
    };

    // Update the handleFinalSubmit function to use modals instead of alerts
    const handleFinalSubmit = async () => {
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
            setSubmitProgress(0); // Start with 0% progress 
            
            // Add a small delay to ensure loading animation starts properly
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Create form data
            const formData = new FormData();
            
            // Add job data as JSON string
            formData.append("job_data", JSON.stringify(jobData));

            // Add all files
            fileState.selectedFiles.forEach(file => {
                formData.append("files", file);
            });
            
            // Simulate early progress before actual upload starts
            setSubmitProgress(7);

            await new Promise(resolve => setTimeout(resolve, 2750));

            setSubmitProgress(16);

            await new Promise(resolve => setTimeout(resolve, 5450));
            
            
            // Simulate some more progress before sending
            setSubmitProgress(30);

            await new Promise(resolve => setTimeout(resolve, 5450));

            setSubmitProgress(65);
            
            // Function to simulate progress during waiting time - use requestAnimationFrame for smoother updates
            let lastUpdateTime = Date.now();
            const simulateProgress = () => {
                if (apiStatus !== "loading") return; // Stop if no longer loading
                
                const now = Date.now();
                // Only update every 800ms to reduce rendering load
                if (now - lastUpdateTime >= 800) {
                    setSubmitProgress(prev => {
                        const newProgress = prev + (Math.random() * 1.5);
                        return Math.min(newProgress, 90);
                    });
                    lastUpdateTime = now;
                }
                progressAnimationRef.current = requestAnimationFrame(simulateProgress);
            };
            
            // Start progress simulation with requestAnimationFrame
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
            console.log("Server response:", responseData);
            
            // Set the final progress based on response (or 100 if not provided)
            setSubmitProgress(responseData.progress || 100);
            
            // Add a delay to ensure animation completes nicely
            setTimeout(() => {
                setApiStatus("success");
                
                setShowSuccessModal(true);
            }, 1000);
            
        } catch (error) {
            // Clear animation frame in case of error too
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            console.error("Error submitting job:", error);
            setApiStatus("error");
            setErrorMessage(error.message || "Error submitting job. Please try again.");
            setShowErrorModal(true);
            
            // Reset API status after a short delay
            setTimeout(() => {
                setApiStatus("idle");
                setSubmitProgress(0);
            }, 1000);
        }
    };

    // Handle direct CGPA input
    const handleCGPAInputChange = (e) => {
        const inputValue = e.target.value;
        
        // Allow empty field while typing
        if (inputValue === "") {
            setCgpaInputValue("");
            setCgpaError(true);
            return;
        }
        
        // Only allow numeric input with decimal point
        if (!/^\d*\.?\d*$/.test(inputValue)) {
            return;
        }
        
        setCgpaInputValue(inputValue);
        
        // Validate the input value
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 4) {
            setMinimumCGPA(numValue);
            setCgpaError(false);
            // Update the slider's fill percentage for direct input
            updateSliderPercentage(numValue);
        } else {
            setCgpaError(true);
        }
    };
    
    // Handle when input field loses focus
    const handleCGPABlur = () => {
        // If the input is invalid or empty, reset to the current valid CGPA
        if (cgpaError || cgpaInputValue === "") {
            setCgpaInputValue(minimumCGPA.toFixed(2));
            setCgpaError(false);
        }
        // Format the value with 2 decimal places when focus is lost
        else {
            setCgpaInputValue(parseFloat(cgpaInputValue).toFixed(2));
        }
    };
    
    // Update input value when slider changes
    const handleCGPASliderChange = (e) => {
        const newValue = parseFloat(e.target.value);
        setMinimumCGPA(newValue);
        setCgpaInputValue(newValue.toFixed(2));
        setCgpaError(false);
        
        // Update the slider's fill percentage
        updateSliderPercentage(newValue);
    };

    // Helper function to update the slider fill percentage CSS variable
    const updateSliderPercentage = (value) => {
        // Calculate percentage (value from 0-4 to 0-100%)
        const percentage = (value / 4) * 100;
        // Find the slider element and update its CSS variable
        const sliderElement = document.getElementById('cgpa');
        if (sliderElement) {
            sliderElement.style.setProperty('--slider-percentage', `${percentage}%`);
        }
    };

    // Initialize the slider percentage when component mounts
    useEffect(() => {
        updateSliderPercentage(minimumCGPA);
    }, [minimumCGPA]);

    // Add auto-resize function for the job description textarea
    const handleJobDescriptionInput = (e) => {
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    // Add this new function for creating more jobs
    const handleCreateMoreJob = () => {
        // Reset the form and navigate back to job details
        setCurrentStep("jobDetails");
        setJobTitle("");
        setJobDescription("");
        setDepartments([]);
        setMinimumCGPA(2.50);
        setSkills([]);
        setJobData(null);
        fileDispatch({ type: 'RESET' });
        setApiStatus("idle");
        setSubmitProgress(0);
        setShowSuccessModal(false);
    };

    return (
        <div className="app-container">
            {getFullPageOverlay()}
            
            {apiStatus === "loading" && (
                <div className="api-loading-overlay">
                    <div className="api-loading-content">
                        {/* Keep the original loading animation from pageloading.css */}
                        <LoadingAnimation />
                        <p>Submitting job and uploading files...</p>
                        {/* Progress bar positioned below the animation */}
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
            
            {/* Render success and error modals */}
            {showSuccessModal && <SuccessModal />}
            {showErrorModal && <ErrorModal />}
            
            {currentStep === "jobDetails" ? (
                <div className="job-container">
                    <h3 className="job-title-header">Job Details</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="jobTitle" className="form-label">Job Title <span className="required">*</span></label>
                            <div className="suggestion-container">
                                <input
                                    type="text"
                                    id="jobTitle"
                                    className="form-input"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="Enter job title"
                                    required
                                    onBlur={() => {
                                        // Hide suggestions with a small delay to allow click event to complete
                                        setTimeout(() => {
                                            setShowJobTitleSuggestions(false);
                                        }, 200);
                                    }}
                                />
                                {showJobTitleSuggestions && (
                                    <ul className="suggestions-list">
                                        {jobTitleSuggestions.map((suggestion, index) => (
                                            <li 
                                                key={index} 
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent input blur before click
                                                    handleJobTitleSelect(suggestion);
                                                }}
                                            >
                                                {suggestion}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="jobDescription" className="form-label">Description</label>
                            <textarea
                                id="jobDescription"
                                className="form-textarea"
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                onInput={handleJobDescriptionInput} // Added auto-resize handler
                                placeholder="Enter job description"
                                rows="4"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="department" className="form-label">Department</label>
                            <div className="suggestion-container">
                                <div className="input-group">
                                    <input
                                        type="text"
                                        id="department"
                                        className="form-input"
                                        value={departmentInput}
                                        onChange={(e) => setDepartmentInput(e.target.value)}
                                        onKeyPress={handleDepartmentKeyPress}
                                        placeholder="Enter a department"
                                        onBlur={() => {
                                            // Hide suggestions with a small delay to allow click event to complete
                                            setTimeout(() => {
                                                setShowDepartmentSuggestions(false);
                                            }, 200);
                                        }}
                                    />
                                    <button 
                                        type="button" 
                                        className="add-button"
                                        onClick={handleAddDepartment}
                                        disabled={!departmentInput.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                                {showDepartmentSuggestions && (
                                    <ul className="suggestions-list">
                                        {departmentSuggestions.map((suggestion, index) => (
                                            <li 
                                                key={index} 
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent input blur before click
                                                    handleDepartmentSelect(suggestion);
                                                }}
                                            >
                                                {suggestion}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {departments.length > 0 && (
                                <div className="tags-container">
                                    {departments.map((department, index) => (
                                        <div key={index} className="tag">
                                            {department}
                                            <button 
                                                type="button"
                                                className="tag-remove"
                                                onClick={() => removeDepartment(department)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="cgpa" className="form-label">Minimum CGPA</label>
                            <div className="cgpa-container">
                                <input
                                    type="range"
                                    id="cgpa"
                                    min="0"
                                    max="4"
                                    step="0.01"
                                    value={minimumCGPA}
                                    onChange={handleCGPASliderChange}
                                    className="cgpa-slider"
                                    aria-valuemin="0"
                                    aria-valuemax="4"
                                    aria-valuenow={minimumCGPA}
                                    aria-labelledby="cgpa-value"
                                />
                                <input
                                    id="cgpa-value"
                                    type="text"
                                    className={`cgpa-value ${cgpaError ? 'error' : ''}`}
                                    value={cgpaInputValue}
                                    onChange={handleCGPAInputChange}
                                    onBlur={handleCGPABlur}
                                    aria-label="CGPA value"
                                    aria-invalid={cgpaError}
                                />
                            </div>
                            {cgpaError && (
                                <p className="error-message" role="alert">
                                    Please enter a valid CGPA between 0 and 4
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="skills" className="form-label">Required Skills <span className="required">*</span></label>
                            <div className="suggestion-container">
                                <div className="input-group">
                                    <input
                                        type="text"
                                        id="skills"
                                        className="form-input"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyPress={handleSkillKeyPress}
                                        placeholder="Enter a skill"
                                    />
                                    <button 
                                        type="button" 
                                        className="add-button"
                                        onClick={handleAddSkill}
                                        disabled={!skillInput.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                                {showSkillSuggestions && (
                                    <ul className="suggestions-list">
                                        {skillSuggestions.map((suggestion, index) => (
                                            <li 
                                                key={index} 
                                                onClick={() => handleSkillSelect(suggestion)}
                                            >
                                                {suggestion}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {skills.length > 0 && (
                                <div className="tags-container">
                                    {skills.map((skill, index) => (
                                        <div key={index} className="tag">
                                            {skill}
                                            <button 
                                                type="button"
                                                className="tag-remove"
                                                onClick={() => removeSkill(skill)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="submit-button">Next</button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    <div className="step-header">
                        <div className="step-nav">
                            <button onClick={handleBackToJobDetails} className="back-button">
                                <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                                Back to Job Details 
                            </button>
                        </div>
                        <h3 className="job-title-header">Upload Candidate CVs for {jobData?.jobTitle}</h3>
                    </div>
                    
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
                        <h3 className="files-title" id="uploaded-files-heading">Uploaded Files</h3>
                        {fileState.selectedFiles.length === 0 ? (
                            <div className="no-files">
                                <p className="no-files-text">No files uploaded yet</p>
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
                                                    <p className="file-name" title={file.name}>{file.name.length > 100 ? file.name.substring(0, 100) + '...' : file.name}</p>
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
                        
                        <div className="final-submit-container">
                            <button 
                                onClick={handleFinalSubmit} 
                                className="submit-button final-submit"
                                disabled={fileState.isLoading || fileState.processingFiles || apiStatus === "loading"}
                            >
                                {fileState.isLoading || fileState.processingFiles ? 'Uploading Files...' : 
                                 apiStatus === "loading" ? 'Submitting...' : 'Submit Job Details and CV'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UploadCV;