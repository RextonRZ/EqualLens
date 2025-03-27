import React, { useState, useEffect } from "react";
import "./RankApplicantsModal.css"; // Make sure to create this CSS file

const RankApplicantsModal = ({ isOpen, onClose, jobId, jobTitle, onSubmit }) => {
    const [prompt, setPrompt] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showMissingModal, setShowMissingModal] = useState(false);
    
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

    const handlePromptChange = (e) => {
        setPrompt(e.target.value);
    };

    const handleSubmit = () => {
        const trimmedPrompt = prompt.trim();
        
        // Check if the prompt contains at least one required keyword
        const containsKeyword = 
            trimmedPrompt.toLowerCase().includes('education') ||
            trimmedPrompt.toLowerCase().includes('experience') ||
            trimmedPrompt.toLowerCase().includes('skill');
            
        if (trimmedPrompt && containsKeyword) {
            // Pass the prompt to the parent component via onSubmit prop
            onSubmit(trimmedPrompt);
            
            // Reset prompt and close modal
            setPrompt("");
            onClose();
        } else if (trimmedPrompt) {
            // Prompt exists but doesn't contain required keywords
            setShowMissingModal(true);
        }
    };

    const handleCancelClick = () => {
        // If there's text in the prompt field, show confirmation dialog
        if (prompt.trim().length > 0) {
            setShowConfirmModal(true);
        } else {
            // No text, just close the modal
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        // If there's text in the prompt field, show confirmation dialog
        if (prompt.trim().length > 0) {
            setShowConfirmModal(true);
        } else {
            // No text, just close the modal
            onClose();
        }
    };

    const handleMissingModalClose = () => {
        setShowMissingModal(false);
    }

    const handleConfirmDiscard = () => {
        setShowConfirmModal(false);
        setPrompt("");
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
                <h3 className="status-title">Discard Changes?</h3>
                <p className="status-description">Are you sure you want to discard your prompt?</p>
                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={handleCancelDiscard}>
                        No, Continue Editing
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmDiscard}>
                        Yes, Discard
                    </button>
                </div>
            </div>
        </div>
    );

    const MissingModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal">
                <div className="status-icon warning-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3 className="status-title">Missing Keyword</h3>
                <p className="status-description">Please include at least one keyword from the following: <br></br>
                    Skill <br></br>
                    Education <br></br>
                    Experience</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={handleMissingModalClose}>
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={handleOverlayClick}
            role="dialog"
            aria-labelledby="modal-title"
            aria-modal="true"
        >
            <div 
                className="modal-content" 
                onClick={e => e.stopPropagation()}
            >
                {showConfirmModal && <ConfirmModal />}
                {showMissingModal && <MissingModal />}
                
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">
                        Rank Applicants for {jobTitle}
                    </h2>
                    <button 
                        className="modal-close" 
                        onClick={handleCancelClick}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="prompt-container">
                        <label htmlFor="prompt-input" className="prompt-label">
                            Enter your ranking criteria:
                        </label>
                        <div className="spacer" style={{ height: "1em" }}></div>
                        <textarea
                            id="prompt-input"
                            className="textbox"
                            value={prompt}
                            onChange={handlePromptChange}
                            placeholder="Rank candidates based on their experience, skills, and education level"
                            rows={6}
                            style={{ resize: "none" }}
                        />
                    </div>
                </div>
                
                <div className="modal-footer">
                    <button 
                        className="modal-button secondary-button" 
                        onClick={handleCancelClick}
                    >
                        Cancel
                    </button>
                    <button 
                        className="modal-button primary-button"
                        onClick={handleSubmit}
                        disabled={prompt.trim().length === 0}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RankApplicantsModal;