// Import the loading animation CSS
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "./UploadCV.css";
import "../pageloading.css"; // Import the loading animation CSS

const UploadCV = () => {
  
    const [currentStep, setCurrentStep] = useState("jobDetails"); // "jobDetails" or "uploadCV"
    const [jobData, setJobData] = useState(null); // To store submitted job details
    
    // Add API state variables
    const [apiStatus, setApiStatus] = useState("idle"); // idle, loading, success, error
    const [submitProgress, setSubmitProgress] = useState(0); // Track overall submission progress
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadQueue, setUploadQueue] = useState([]);
    const [processingFiles, setProcessingFiles] = useState(false);
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
    const [searchLanguage, setSearchLanguage] = useState("");
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [languages, setLanguages] = useState([]);
    const [minimumCGPA, setMinimumCGPA] = useState(2.50);
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

    const languageOptions = useMemo(() => [
        "English", "Mandarin","Malay", "Spanish", "French", "Arabic", "Russian",
        "Portuguese", "Japanese", "German", "Hindi", "Korean", "Italian",
        "Dutch", "Swedish", "Turkish", "Vietnamese", "Thai", "Greek"
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

    const filteredLanguages = searchLanguage
        ? languageOptions.filter(lang => 
            lang.toLowerCase().includes(searchLanguage.toLowerCase()))
        : languageOptions;

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.suggestion-container') && 
                !event.target.closest('.language-dropdown-container')) {
                setShowJobTitleSuggestions(false);
                setShowSkillSuggestions(false);
                setShowLanguageDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Process files and add to queue
    const processFiles = useCallback((files) => {
        let updatedFiles = [...selectedFiles];
        let newFiles = [];

        for (const newFile of files) {
            // Check file format
            const extension = newFile.name.split('.').pop().toLowerCase();
            const validExtensions = ['pdf', 'doc', 'docx'];
            
            if (!validExtensions.includes(extension)) {
                alert(`${newFile.name} is not a supported file type. Please upload PDF, DOC, or DOCX files only.`);
                continue; 
            }

            const existingIndex = updatedFiles.findIndex(file => file.name === newFile.name);

            if (existingIndex !== -1) {
                if (window.confirm(`A file named "${newFile.name}" already exists. Do you want to replace it?`)) {
                    updatedFiles[existingIndex] = newFile;
                }
            } else {
                newFiles.push(newFile);
                updatedFiles.push(newFile);
            }
        }

        if (newFiles.length > 0 || updatedFiles.length !== selectedFiles.length) {
            setProcessingFiles(true);
            setSelectedFiles(updatedFiles);
            
            // Add new files to the upload queue
            setUploadQueue(prevQueue => [...prevQueue, ...newFiles]);
        }
    }, [selectedFiles]);

    // Process upload queue sequentially
    useEffect(() => {
        if (uploadQueue.length === 0) {
            setProcessingFiles(false);
            return;
        }

        // Process one file at a time
        const processNextFile = async () => {
            setIsLoading(true);
            const fileToProcess = uploadQueue[0];
            
            // Initialize progress for this file
            setUploadProgress(prev => ({
                ...prev,
                [fileToProcess.name]: 0
            }));

            // Simulate upload for current file
            await new Promise(resolve => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress > 100) progress = 100;

                    setUploadProgress(prev => ({
                        ...prev,
                        [fileToProcess.name]: Math.floor(progress)
                    }));

                    if (progress === 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            resolve();
                        }, 500);
                    }
                }, 200);
            });

            // Remove processed file from queue
            setUploadQueue(prev => prev.slice(1));
        };

        processNextFile();
    }, [uploadQueue]);

    // Check when the upload queue is empty to set loading state to false
    useEffect(() => {
        if (uploadQueue.length === 0 && processingFiles) {
            setIsLoading(false);
        }
    }, [uploadQueue, processingFiles]);

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
        const handleDocumentDragOver = (event) => {
            event.preventDefault();
            if (!isDragging) {
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
    }, [isDragging, processFiles]);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            processFiles(files);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    };

    const removeFile = (index) => {
        const fileToRemove = selectedFiles[index];
        
        // If file is in upload queue, remove it from there too
        if (fileToRemove) {
            setUploadQueue(prev => prev.filter(queueFile => queueFile.name !== fileToRemove.name));
        }
        
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
                        {selectedFiles.length > 0 && <div className="copy-badge">Copy</div>}
                    </div>
                    <h2 className="drop-title">Drop files anywhere</h2>
                    <p className="drop-subtitle">Drop file(s) to upload it</p>
                </div>
            </div>
        );
    };

    // Job details handlers
    const removeLanguage = (language) => {
        setLanguages(languages.filter(lang => lang !== language));
    };

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

    const validateForm = () => {
        if (!jobTitle.trim()) {
            alert("Job Title is required");
            return false;
        }
        
        if (languages.length === 0) {
            alert("At least one Language Requirement is required");
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
                languages,
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
    };

    // API URL for backend
    const API_URL = "http://localhost:8000"; // Update this with your FastAPI URL
    // Uncomment this line to use the development endpoint if Firebase is not working
    // const API_ENDPOINT = `${API_URL}/upload-job-dev`;
    const API_ENDPOINT = `${API_URL}/upload-job`;

    // Add handler for final submission
    const handleFinalSubmit = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            alert("Please upload at least one CV file");
            return;
        }
        
        try {
            // Cancel any existing animation frame
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            setApiStatus("loading");
            setSubmitProgress(5); // Start with 5% progress to show initial activity
            
            // Add a small delay to ensure loading animation starts properly
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Create form data
            const formData = new FormData();
            
            // Add job data as JSON string
            formData.append("job_data", JSON.stringify(jobData));
            
            // Simulate early progress before actual upload starts
            setSubmitProgress(0);

            await new Promise(resolve => setTimeout(resolve, 2750));

            setSubmitProgress(16);

            await new Promise(resolve => setTimeout(resolve, 5450));
            
            // Add all files
            selectedFiles.forEach(file => {
                formData.append("files", file);
            });
            
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
                
                // Show success message with job ID
                alert(`Job details and CVs submitted successfully!\nJob ID: ${responseData.jobId || 'Unknown'}`);
                
                // Reset form for new submission
                setCurrentStep("jobDetails");
                setJobTitle("");
                setJobDescription("");
                setLanguages([]);
                setMinimumCGPA(2.50);
                setSkills([]);
                setSelectedFiles([]);
                setJobData(null);
                setUploadProgress({});
                setUploadQueue([]);
                setApiStatus("idle");
                setSubmitProgress(0);
            }, 1000);
            
        } catch (error) {
            // Clear animation frame in case of error too
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
            
            console.error("Error submitting job:", error);
            setApiStatus("error");
            alert(`Error submitting job: ${error.message}`);
            
            // Reset API status after a short delay
            setTimeout(() => {
                setApiStatus("idle");
                setSubmitProgress(0);
            }, 3000);
        }
    };

    // Clean up animation frame on component unmount
    useEffect(() => {
        return () => {
            if (progressAnimationRef.current) {
                cancelAnimationFrame(progressAnimationRef.current);
                progressAnimationRef.current = null;
            }
        };
    }, []);
    
    // Language handlers
    const handleLanguageSelect = (language) => {
        if (!languages.includes(language)) {
            setLanguages([...languages, language]);
        }
        setSearchLanguage("");
        setShowLanguageDropdown(false);
    };

    const handleLanguageSearch = (e) => {
        const value = e.target.value;
        setSearchLanguage(value);
        // Show dropdown when typing
        if (value.length > 0) {
            setShowLanguageDropdown(true);
        }
    };

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
            
            {currentStep === "jobDetails" ? (
                <div className="job-container">
                    <h3 className="job-title-header">Job Details</h3>
                    <div className="job-details-card">
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
                                    placeholder="Enter job description"
                                    rows="4"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="language" className="form-label">Language Requirements <span className="required">*</span></label>
                                <div className="language-dropdown-container">
                                    <div className="input-group">
                                        <div className="searchable-select">
                                            <input 
                                                type="text"
                                                className="form-input"
                                                value={searchLanguage}
                                                onChange={handleLanguageSearch}
                                                placeholder="Search or select a language"
                                                onClick={() => setShowLanguageDropdown(true)}
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            className="add-button"
                                            onClick={() => {
                                                if (searchLanguage && !languages.includes(searchLanguage)) {
                                                    setLanguages([...languages, searchLanguage]);
                                                    setSearchLanguage("");
                                                }
                                            }}
                                            disabled={!searchLanguage}
                                        >
                                            Add
                                        </button>
                                    </div>
                                    {showLanguageDropdown && (
                                        <ul className="language-dropdown-list">
                                            {filteredLanguages.length > 0 ? (
                                                filteredLanguages.map((language, index) => (
                                                    <li 
                                                        key={index}
                                                        onClick={() => handleLanguageSelect(language)}
                                                    >
                                                        {language}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="no-results">No matching languages</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                {languages.length > 0 && (
                                    <div className="tags-container">
                                        {languages.map((language, index) => (
                                            <div key={index} className="tag">
                                                {language}
                                                <button 
                                                    type="button"
                                                    className="tag-remove"
                                                    onClick={() => removeLanguage(language)}
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
                                        onChange={(e) => setMinimumCGPA(parseFloat(e.target.value))}
                                        className="cgpa-slider"
                                    />
                                    <span className="cgpa-value">{minimumCGPA.toFixed(2)}</span>
                                </div>
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
                                    className="upload-dropzone"
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                >
                                    <div className="upload-icon-container">
                                        <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                    </div>
                                    <p className="upload-text">Drag and Drop files to upload</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden-input"
                                    />
                                    <button
                                        className="browse-button"
                                        onClick={handleChooseFile}
                                    >
                                        Browse Files
                                    </button>
                                    <p className="upload-subtext">Supports PDF, DOC, DOCX</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="files-container">
                        <h3 className="files-title">Uploaded Files</h3>
                        {selectedFiles.length === 0 ? (
                            <div className="no-files">
                                <p className="no-files-text">No files uploaded yet</p>
                            </div>
                        ) : (
                            <div className="files-list">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="file-item">
                                        <div className="file-content">
                                            {getFileIcon(file.name)}
                                            <div className="file-details">
                                                <div className="file-header">
                                                    <p className="file-name" title={file.name}>{file.name.length > 100 ? file.name.substring(0, 100) + '...' : file.name}</p>
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="delete-button"
                                                        aria-label="Remove file"
                                                        disabled={isLoading || processingFiles}
                                                    >
                                                        <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                                {isLoading && uploadProgress[file.name] !== undefined && uploadProgress[file.name] < 100 ? (
                                                    <div className="progress-bar-container">
                                                        <div className="progress-bar" style={{ width: `${uploadProgress[file.name]}%` }}></div>
                                                        <span className="progress-text">{uploadProgress[file.name]}%</span>
                                                    </div>
                                                ) : processingFiles && uploadProgress[file.name] === undefined && uploadQueue && uploadQueue.some(queueFile => queueFile.name === file.name) ? (
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
                                disabled={isLoading || processingFiles || apiStatus === "loading"}
                            >
                                {isLoading || processingFiles ? 'Uploading Files...' : 
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