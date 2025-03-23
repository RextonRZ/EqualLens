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

    // Show loading when navigating back
    if (isNavigatingBack) {
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

    // Show loading while initially fetching job details
    if (isLoading) {
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
            
            <div className="header">
                <div className="header-content">
                    <button className="back-button" onClick={handleGoBackToJobDetails}>
                        <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Back to Job Details
                    </button>
                    <h1>Interview Questions</h1>
                    {jobDetails && <p className="job-title-reference">for {jobDetails.jobTitle}</p>}
                </div>
                <button className="ai-generate-button" onClick={handleAIGenerate}>
                    <svg className="ai-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    AI Generate
                </button>
            </div>
            
            <div className="new-section-container">
                <input
                    type="text"
                    className="new-section-input"
                    placeholder="Enter section title (e.g., Technical Skills, Work Experience)"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
                />
                <button className="add-section-button" onClick={handleAddSection}>
                    Add Section
                </button>
            </div>

            {sections.length === 0 ? (
                <div className="no-sections">
                    <p>No interview question sections added yet. Add a section to get started or use AI Generate.</p>
                </div>
            ) : (
                <div className="sections-container">
                    {sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="section">
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
                                + Add Question
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="save-container">
                <button 
                    className="save-button" 
                    onClick={handleSave}
                    disabled={sections.length === 0}
                >
                    Save Questions
                </button>
            </div>
        </div>
    );
};

export default AddInterviewQuestions;
