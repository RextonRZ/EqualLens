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
            setSections([...sections, { title: newSectionTitle, questions: [] }]);
            setNewSectionTitle("");
        }
    };

    const handleRemoveSection = (sectionIndex) => {
        const updatedSections = [...sections];
        updatedSections.splice(sectionIndex, 1);
        setSections(updatedSections);
    };

    const handleAddQuestion = (sectionIndex) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions.push("");
        setSections(updatedSections);
    };

    const handleQuestionChange = (sectionIndex, questionIndex, value) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions[questionIndex] = value;
        setSections(updatedSections);
    };

    const handleRemoveQuestion = (sectionIndex, questionIndex) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions.splice(questionIndex, 1);
        setSections(updatedSections);
    };

    const handleViewProfile = () => {
        // Placeholder for view profile functionality
        console.log("View profile for candidate:", selectedApplicant);
        // This would typically navigate to a candidate profile page
    };

    const handleSave = async () => {
        // Filter out empty questions
        const validSections = sections.map(section => ({
            ...section,
            questions: section.questions.filter(q => q.trim() !== "")
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

    const handleAIGenerate = () => {
        // Placeholder for AI generation functionality
        const aiGeneratedSections = [
            {
                title: "Technical Skills",
                questions: [
                    "Can you describe your experience with our required technologies?",
                    "What technical challenges have you faced in your previous roles?",
                    "How do you stay updated with industry developments?"
                ]
            },
            {
                title: "Problem Solving",
                questions: [
                    "Describe a complex problem you solved in your previous role.",
                    "How do you approach troubleshooting technical issues?",
                    "Tell me about a time when you had to make a decision with incomplete information."
                ]
            },
            {
                title: "Team Collaboration",
                questions: [
                    "How do you handle disagreements within your team?",
                    "Describe your experience working in cross-functional teams.",
                    "How do you ensure effective communication in remote work settings?"
                ]
            }
        ];
        
        setSections(aiGeneratedSections);
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
                                <option value="all">Apply to all</option>
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
                                    <h2 className="section-title">{section.title}</h2>
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
                                
                                <div className="questions-container">
                                    {section.questions.map((question, questionIndex) => (
                                        <div key={questionIndex} className="question-item">
                                            <textarea
                                                className="question-textarea"
                                                placeholder="Enter interview question"
                                                value={question}
                                                onChange={(e) =>
                                                    handleQuestionChange(sectionIndex, questionIndex, e.target.value)
                                                }
                                            />
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
