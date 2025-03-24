import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AddInterviewQuestions.css";
import '../pageloading.css'; // Import the loading animation CSS

// Add LoadingAnimation component for consistency
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

const AddInterviewQuestions = () => {
    const [sections, setSections] = useState([]);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [jobDetails, setJobDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isNavigatingBack, setIsNavigatingBack] = useState(false);
    // New state variables for applicant selection
    const [applicants, setApplicants] = useState([]);
    const [selectedApplicant, setSelectedApplicant] = useState("");
    const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
    // Add new state to track which section title is being edited
    const [editingSectionIndex, setEditingSectionIndex] = useState(null);
    const [editedSectionTitle, setEditedSectionTitle] = useState("");
    // Add new state for validation error modal
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    // Add new state for section deletion confirmation
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState(null);
    
    // Get job ID from URL query params
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const jobId = queryParams.get('jobId');
    
    // Add navigate for programmatic navigation
    const navigate = useNavigate();
    
    // Fetch job details when component mounts
    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!jobId) return;
            
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch job details");
                }
                const data = await response.json();
                setJobDetails(data);
            } catch (error) {
                console.error("Error fetching job details:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchJobDetails();
    }, [jobId]);

    // Fetch applicants for the job
    useEffect(() => {
        const fetchApplicants = async () => {
            if (!jobId) return;
            
            setIsLoadingApplicants(true);
            try {
                const response = await fetch(`http://localhost:8000/api/candidates/applicants?jobId=${jobId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch applicants");
                }
                const data = await response.json();
                setApplicants(data);
            } catch (error) {
                console.error("Error fetching applicants:", error);
            } finally {
                setIsLoadingApplicants(false);
            }
        };
        
        fetchApplicants();
    }, [jobId]);

    const handleAddSection = () => {
        if (newSectionTitle.trim()) {
            setSections([...sections, { 
                title: newSectionTitle, 
                questions: [],
                randomSettings: {
                    enabled: false,
                    count: 0
                }
            }]);
            setNewSectionTitle("");
        }
    };

    const handleRemoveSection = (sectionIndex) => {
        // Check if section has questions before showing confirmation
        if (sections[sectionIndex].questions.length > 0) {
            setSectionToDelete(sectionIndex);
            setShowConfirmModal(true);
        } else {
            // If no questions, delete immediately
            removeSection(sectionIndex);
        }
    };

    // New function to actually remove the section after confirmation
    const removeSection = (sectionIndex) => {
        const updatedSections = [...sections];
        updatedSections.splice(sectionIndex, 1);
        setSections(updatedSections);
    };

    // Handle confirmation modal actions
    const handleConfirmSectionDelete = () => {
        if (sectionToDelete !== null) {
            removeSection(sectionToDelete);
            setSectionToDelete(null);
        }
        setShowConfirmModal(false);
    };

    const handleCancelSectionDelete = () => {
        setSectionToDelete(null);
        setShowConfirmModal(false);
    };

    const handleAddQuestion = (sectionIndex) => {
        const updatedSections = [...sections];
        // Initialize each question with empty text, a default time of 60 seconds, and isCompulsory flag
        updatedSections[sectionIndex].questions.push({ 
            text: "", 
            timeLimit: 60,
            isCompulsory: true 
        });
        setSections(updatedSections);
    };

    const handleQuestionChange = (sectionIndex, questionIndex, value) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions[questionIndex].text = value;
        setSections(updatedSections);
    };
    
    const handleQuestionTimeChange = (sectionIndex, questionIndex, value) => {
        const updatedSections = [...sections];
        // Ensure the time is a positive number
        const timeLimit = Math.max(1, parseInt(value) || 0);
        updatedSections[sectionIndex].questions[questionIndex].timeLimit = timeLimit;
        setSections(updatedSections);
    };

    const handleQuestionCompulsoryChange = (sectionIndex, questionIndex, isCompulsory) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions[questionIndex].isCompulsory = isCompulsory;
        
        // Count non-compulsory questions after this change
        const nonCompulsoryCount = updatedSections[sectionIndex].questions.filter(q => !q.isCompulsory).length;
        
        // If making a question compulsory reduces non-compulsory count below 2, disable random
        if (isCompulsory && nonCompulsoryCount < 2 && updatedSections[sectionIndex].randomSettings.enabled) {
            updatedSections[sectionIndex].randomSettings.enabled = false;
        }
        
        setSections(updatedSections);
    };
    
    const handleSectionRandomSettingsChange = (sectionIndex, enabled) => {
        const updatedSections = [...sections];
        const nonCompulsoryCount = updatedSections[sectionIndex].questions.filter(q => !q.isCompulsory).length;
        
        // Check if there are enough non-compulsory questions to enable random selection
        if (enabled && nonCompulsoryCount < 2) {
            // If there are less than 2 non-compulsory questions, show an error
            setErrorMessage(
                `Please ensure you have at least 2 non-compulsory questions in order to enable random selection.
                The ${updatedSections[sectionIndex].title} section only has ${nonCompulsoryCount} non-compulsory question${nonCompulsoryCount === 1 ? '' : 's'}.`
            );
            setShowErrorModal(true);
            return; // Exit without updating the state - leave the checkbox unchecked
        }
        
        // Set the enabled state as requested
        updatedSections[sectionIndex].randomSettings.enabled = enabled;
        
        // If enabling random mode, set default count to half of non-compulsory questions (minimum 1)
        // But ensure it's not equal to the total number of non-compulsory questions
        if (enabled) {
            const maxAllowed = Math.max(1, nonCompulsoryCount - 1); // Maximum is total count - 1
            const defaultCount = Math.min(Math.floor(nonCompulsoryCount / 2), maxAllowed);
            updatedSections[sectionIndex].randomSettings.count = Math.max(1, defaultCount);
        }
        
        setSections(updatedSections);
    };
    
    const handleRandomCountChange = (sectionIndex, count) => {
        const updatedSections = [...sections];
        const nonCompulsoryCount = updatedSections[sectionIndex].questions.filter(q => !q.isCompulsory).length;
        
        // Allow user to enter the number, but track if it's valid
        // Maximum allowed is (nonCompulsoryCount - 1) to ensure it's truly random
        const parsedCount = parseInt(count) || 0;
        const maxAllowed = Math.max(1, nonCompulsoryCount - 1);
        const validCount = Math.min(parsedCount, maxAllowed);
        
        updatedSections[sectionIndex].randomSettings.count = validCount;
        updatedSections[sectionIndex].randomSettings.isCountValid = validCount > 0 && validCount <= maxAllowed;
        
        setSections(updatedSections);
    };

    const handleRemoveQuestion = (sectionIndex, questionIndex) => {
        const updatedSections = [...sections];
        
        // Check if this is a non-compulsory question that's being removed
        const isNonCompulsory = !updatedSections[sectionIndex].questions[questionIndex].isCompulsory;
        
        // Remove the question
        updatedSections[sectionIndex].questions.splice(questionIndex, 1);
        
        // If it was a non-compulsory question, check if we need to disable random selection
        if (isNonCompulsory) {
            const remainingNonCompulsoryCount = updatedSections[sectionIndex].questions.filter(q => !q.isCompulsory).length;
            
            // If fewer than 2 non-compulsory questions remain, disable random selection
            if (remainingNonCompulsoryCount < 2 && updatedSections[sectionIndex].randomSettings.enabled) {
                updatedSections[sectionIndex].randomSettings.enabled = false;
                
                // Can also display a brief notification to explain why it was automatically disabled
                // Example: toast.info("Random selection was disabled as there are no longer enough non-compulsory questions.")
            }
        }
        
        setSections(updatedSections);
    };

    const handleViewProfile = () => {
        // Placeholder for view profile functionality
        console.log("View profile for candidate:", selectedApplicant);
        // This would typically navigate to a candidate profile page
    };

    const validateSections = () => {
        // First check for empty question fields
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            for (let j = 0; j < section.questions.length; j++) {
                if (!section.questions[j].text.trim()) {
                    setErrorMessage(
                        `Please fill in all question fields. There is an empty question in the "${section.title}" section.`
                    );
                    setShowErrorModal(true);
                    return false;
                }
            }
            
            // Check each section with random questions enabled
            if (section.randomSettings.enabled) {
                const nonCompulsoryCount = section.questions.filter(q => !q.isCompulsory).length;
                const selectedCount = section.randomSettings.count;
                const maxAllowed = Math.max(1, nonCompulsoryCount - 1);
                
                // Check if there are enough non-compulsory questions
                if (nonCompulsoryCount < 2) {
                    setErrorMessage(
                        `Random selection requires at least 2 non-compulsory questions. 
                        The "${section.title}" section only has ${nonCompulsoryCount} non-compulsory question${nonCompulsoryCount === 1 ? '' : 's'}.`
                    );
                    setShowErrorModal(true);
                    return false;
                }
                
                // Validate that the selected count is in the valid range
                if (selectedCount <= 0 || selectedCount > maxAllowed) {
                    setErrorMessage(
                        `In "${section.title}" section, you can select between 1 and ${maxAllowed} random questions.`
                    );
                    setShowErrorModal(true);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        // Validate before saving - don't filter out empty questions, validate them instead
        if (!validateSections()) {
            return;
        }
        
        // Now that validation passed, we can filter out any potential empty questions
        // (though they should all be filled at this point)
        const validSections = sections.map(section => ({
            ...section,
            questions: section.questions.filter(q => q.text.trim() !== "")
        })).filter(section => section.questions.length > 0);
        
        try {
            // Mock API call
            console.log("Saving interview questions:", {
                jobId,
                candidateId: selectedApplicant === "all" ? "all" : selectedApplicant,
                sections: validSections
            });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error saving questions:", error);
        }
    };

    const handleGoBackToJobDetails = () => {
        // Show loading animation
        setIsNavigatingBack(true);
        
        // Extract jobId from the URL query params to navigate back to job details
        const jobId = queryParams.get('jobId');
        
        // Instead of window.location.href, use React Router's navigate
        // This will preserve React's state management and prevent the glitch
        setTimeout(() => {
            if (jobId) {
                // Use state to indicate this is a direct navigation to job details
                navigate(`/dashboard`, { 
                    state: { 
                        directToJobDetails: true,
                        jobId: jobId 
                    }
                });
            } else {
                navigate("/dashboard");
            }
        }, 800);
    };

    const SuccessModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal success-modal">
                <div className="status-icon success-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 className="status-title">Questions Saved!</h3>
                <p className="status-description">Your interview questions have been saved successfully.</p>
                <div className="status-buttons">
                    <button 
                        className="status-button primary-button" 
                        onClick={() => setShowSuccessModal(false)}
                    >
                        Add More Questions
                    </button>
                    <button 
                        className="status-button secondary-button" 
                        onClick={handleGoBackToJobDetails}
                    >
                        Return to Job Details
                    </button>
                </div>
            </div>
        </div>
    );

    const ErrorModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal error-modal">
                <div className="status-icon error-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 className="status-title">Validation Error</h3>
                <p className="status-description">{errorMessage}</p>
                <div className="status-buttons">
                    <button 
                        className="status-button primary-button" 
                        onClick={() => setShowErrorModal(false)}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );

    // Add confirmation modal component
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
                <h3 className="status-title">Delete Section?</h3>
                <p className="status-description">Are you sure you want to delete this section? All questions in this section will be lost.</p>
                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={handleCancelSectionDelete}>
                        Cancel
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmSectionDelete}>
                        Delete Section
                    </button>
                </div>
            </div>
        </div>
    );

    const handleAIGenerate = () => {
        // Placeholder for AI generation functionality
        const aiGeneratedSections = [
            {
                title: "Technical Skills",
                questions: [
                    { text: "Can you describe your experience with our required technologies?", timeLimit: 60, isCompulsory: true },
                    { text: "What technical challenges have you faced in your previous roles?", timeLimit: 90, isCompulsory: false },
                    { text: "How do you stay updated with industry developments?", timeLimit: 45, isCompulsory: false }
                ],
                randomSettings: {
                    enabled: true,
                    count: 1
                }
            },
            {
                title: "Problem Solving",
                questions: [
                    { text: "Describe a complex problem you solved in your previous role.", timeLimit: 120, isCompulsory: true },
                    { text: "How do you approach troubleshooting technical issues?", timeLimit: 60, isCompulsory: false },
                    { text: "Tell me about a time when you had to make a decision with incomplete information.", timeLimit: 90, isCompulsory: false }
                ],
                randomSettings: {
                    enabled: true,
                    count: 1
                }
            },
            {
                title: "Team Collaboration",
                questions: [
                    { text: "How do you handle disagreements within your team?", timeLimit: 60, isCompulsory: true },
                    { text: "Describe your experience working in cross-functional teams.", timeLimit: 75, isCompulsory: false },
                    { text: "How do you ensure effective communication in remote work settings?", timeLimit: 60, isCompulsory: false }
                ],
                randomSettings: {
                    enabled: true,
                    count: 1
                }
            }
        ];
        
        setSections(aiGeneratedSections);
    };

    const handleStartEditingSection = (sectionIndex, currentTitle) => {
        setEditingSectionIndex(sectionIndex);
        setEditedSectionTitle(currentTitle);
    };

    const handleSaveSectionTitle = (sectionIndex) => {
        if (editedSectionTitle.trim()) {
            const updatedSections = [...sections];
            updatedSections[sectionIndex].title = editedSectionTitle.trim();
            setSections(updatedSections);
        }
        setEditingSectionIndex(null);
    };

    const handleKeyPressSectionTitle = (e, sectionIndex) => {
        if (e.key === 'Enter') {
            handleSaveSectionTitle(sectionIndex);
        } else if (e.key === 'Escape') {
            setEditingSectionIndex(null);
        }
    };

    // Show loading when navigating back or initially fetching job details
    if (isNavigatingBack || isLoading) {
        return (
            <div className="dashboard-container" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '80vh' 
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px' }}>Loading job details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="add-interview-questions-container">
            {showSuccessModal && <SuccessModal />}
            {showErrorModal && <ErrorModal />}
            {showConfirmModal && <ConfirmModal />}
            
            {/* Header section with back button and title */}
            <div className="page-header">
                <button className="back-button" onClick={handleGoBackToJobDetails}>
                    <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Back to Job Details
                </button>
                <div className="title-container">
                    <h1>Interview Questions</h1>
                    {jobDetails && <p className="job-title-reference">for {jobDetails.jobTitle}</p>}
                </div>
            </div>
            
            {/* Main content area */}
            <div className="interview-content">
                {/* Controls panel */}
                <div className="controls-panel">
                    <div className="applicant-selector">
                        <label htmlFor="applicant-select">Select an applicant:</label>
                        <div className="select-actions">
                            <select 
                                id="applicant-select" 
                                value={selectedApplicant}
                                onChange={(e) => setSelectedApplicant(e.target.value)}
                                disabled={isLoadingApplicants}
                                title={selectedApplicant}
                            >
                                <option value="">-- Select applicant --</option>
                                <option value="all">Apply to All</option>
                                {applicants.map(app => (
                                    <option key={app.candidateId} value={app.candidateId} title={app.candidateId}>
                                        {app.candidateId}
                                    </option>
                                ))}
                            </select>
                            
                            {selectedApplicant && selectedApplicant !== "all" && (
                                <button 
                                    className="view-profile-button" 
                                    onClick={handleViewProfile}
                                    aria-label="View applicant profile"
                                >
                                    View Profile
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="ai-generate-button-container">
                        <div className="butterfly"></div>
                        <div className="butterfly"></div>
                        <div className="butterfly"></div>
                        <div className="butterfly"></div>
                        <button className="ai-generate-button" onClick={handleAIGenerate}>
                            <svg className="ai-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            AI Generate Questions
                        </button>
                    </div>
                </div>
                
                {/* Section creator */}
                <div className="section-creator">
                    <h2>Add New Section</h2>
                    <div className="section-input-group">
                        <input
                            type="text"
                            className="section-title-input"
                            placeholder="Enter section title (e.g., Technical Skills, Work Experience)"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
                        />
                        <button className="add-section-button" onClick={handleAddSection}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="add-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Section
                        </button>
                    </div>
                </div>
                
                {/* Sections container */}
                {sections.length === 0 ? (
                    <div className="no-sections">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="empty-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                        <p>No interview question sections added yet.</p>
                        <p>Add a section to get started or use AI Generate.</p>
                    </div>
                ) : (
                    <div className="sections-container">
                        {sections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="section-card">
                                <div className="section-header">
                                    {editingSectionIndex === sectionIndex ? (
                                        <div className="section-title-edit-container">
                                            <input
                                                type="text"
                                                className="section-title-input-edit"
                                                value={editedSectionTitle}
                                                onChange={(e) => setEditedSectionTitle(e.target.value)}
                                                onBlur={() => handleSaveSectionTitle(sectionIndex)}
                                                onKeyDown={(e) => handleKeyPressSectionTitle(e, sectionIndex)}
                                                autoFocus
                                            />
                                            <div className="edit-actions">
                                                <button 
                                                    className="save-edit-button"
                                                    onClick={() => handleSaveSectionTitle(sectionIndex)}
                                                    title="Save title"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                </button>
                                                <button 
                                                    className="cancel-edit-button"
                                                    onClick={() => setEditingSectionIndex(null)}
                                                    title="Cancel edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="section-title-editable">
                                            <h2 className="section-title">{section.title}</h2>
                                            <button 
                                                className="edit-title-button"
                                                onClick={() => handleStartEditingSection(sectionIndex, section.title)}
                                                aria-label={`Edit section ${section.title}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                    <button 
                                        className="remove-section-button"
                                        onClick={() => handleRemoveSection(sectionIndex)}
                                        aria-label={`Remove section ${section.title}`}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="section-random-settings">
                                    <div className="random-toggle">
                                        <label className="random-label">
                                            <input
                                                type="checkbox"
                                                checked={section.randomSettings.enabled}
                                                onChange={(e) => handleSectionRandomSettingsChange(sectionIndex, e.target.checked)}
                                                className="random-checkbox"
                                                // Remove the 'disabled' attribute to allow toggling off
                                            />
                                            <span>Enable random question selection</span>
                                        </label>
                                        
                                        {/* Show the help text whether random is enabled or not */}
                                        {section.questions.filter(q => !q.isCompulsory).length < 2 && (
                                            <span className="random-disabled-note">
                                                (Requires at least 2 non-compulsory questions)
                                            </span>
                                        )}
                                    </div>
                                    
                                    {section.randomSettings.enabled && (
                                        <div className="random-count-selector">
                                            <label htmlFor={`random-count-${sectionIndex}`}>
                                                <span>Select</span>
                                                <input
                                                    id={`random-count-${sectionIndex}`}
                                                    type="number"
                                                    min="1"
                                                    max={Math.max(1, section.questions.filter(q => !q.isCompulsory).length - 1)}
                                                    value={section.randomSettings.count}
                                                    onChange={(e) => handleRandomCountChange(sectionIndex, e.target.value)}
                                                    className={`random-count-input ${
                                                        section.randomSettings.count > Math.max(1, section.questions.filter(q => !q.isCompulsory).length - 1) ? 'invalid' : ''
                                                    }`}
                                                />
                                                <span>out of {section.questions.filter(q => !q.isCompulsory).length} non-compulsory questions</span>
                                            </label>
                                            
                                            {section.randomSettings.count > Math.max(1, section.questions.filter(q => !q.isCompulsory).length - 1) && (
                                                <div className="random-count-warning">
                                                    <svg className="warning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                    </svg>
                                                    <span>You can select at most {Math.max(1, section.questions.filter(q => !q.isCompulsory).length - 1)} questions to maintain randomness</span>
                                                </div>
                                            )}
                                            
                                            <div className="random-help-text">
                                                <span>Compulsory questions always appear. Random questions will be selected from the remaining pool.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="questions-container">
                                    {section.questions.map((question, questionIndex) => (
                                        <div key={questionIndex} className={`question-item ${question.isCompulsory ? 'compulsory-item' : 'optional-item'}`}>
                                            <div className="question-content">
                                                <div className="question-header">
                                                    <div className="question-number">{questionIndex + 1}</div>
                                                    <div className="question-type-indicator">
                                                        {question.isCompulsory ? 
                                                            <span className="compulsory-badge">Compulsory</span> : 
                                                            <span className="optional-badge">Optional</span>
                                                        }
                                                    </div>
                                                    <button 
                                                        className="remove-question-button"
                                                        onClick={() => handleRemoveQuestion(sectionIndex, questionIndex)}
                                                        aria-label="Remove question"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                                
                                                <textarea
                                                    className={`question-textarea ${question.isCompulsory ? 'compulsory' : 'optional'}`}
                                                    placeholder="Enter interview question"
                                                    value={question.text}
                                                    onChange={(e) => handleQuestionChange(sectionIndex, questionIndex, e.target.value)}
                                                />
                                                
                                                <div className="question-controls">
                                                    <div className="question-time-control">
                                                        <svg className="time-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <polyline points="12 6 12 12 16 14"></polyline>
                                                        </svg>
                                                        <label htmlFor={`time-limit-${sectionIndex}-${questionIndex}`}>
                                                            Time Limit:
                                                        </label>
                                                        <input
                                                            id={`time-limit-${sectionIndex}-${questionIndex}`}
                                                            type="number"
                                                            min="1"
                                                            max="300"
                                                            value={question.timeLimit}
                                                            onChange={(e) => 
                                                                handleQuestionTimeChange(sectionIndex, questionIndex, e.target.value)
                                                            }
                                                            className="time-input"
                                                        />
                                                        <span className="time-unit">seconds</span>
                                                    </div>
                                                    
                                                    <div className="question-compulsory-control">
                                                        <label className="compulsory-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={question.isCompulsory}
                                                                onChange={(e) => 
                                                                    handleQuestionCompulsoryChange(sectionIndex, questionIndex, e.target.checked)
                                                                }
                                                                className="compulsory-checkbox"
                                                            />
                                                            Make compulsory
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <button
                                    className="add-question-button"
                                    onClick={() => handleAddQuestion(sectionIndex)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="add-q-icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add Question
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Save button container */}
                <div className="save-container">
                    <button 
                        className="save-button" 
                        onClick={handleSave}
                        disabled={sections.length === 0 || !selectedApplicant}
                    >
                        Save Questions
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddInterviewQuestions;
