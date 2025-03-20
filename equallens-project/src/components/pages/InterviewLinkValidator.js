// src/components/pages/InterviewLinkValidator.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../App.css';
import './Interview.css';

const InterviewLinkValidator = () => {
    const { interviewId, linkCode } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [interviewData, setInterviewData] = useState(null);

    useEffect(() => {
        // Validate the interview link
        const validateLink = async () => {
            try {
                setIsLoading(true);

                // API URL for validation
                const API_URL = "http://localhost:8000"; // Update with your API URL
                const validationUrl = `${API_URL}/api/interviews/validate/${interviewId}/${linkCode}`;

                const response = await fetch(validationUrl);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Invalid or expired interview link');
                }

                if (!data.valid) {
                    throw new Error('Invalid or expired interview link');
                }

                // Set interview data
                setInterviewData(data.interview);

                // Redirect to ID verification page after a short delay
                setTimeout(() => {
                    navigate(`/interview/${interviewId}/${linkCode}/id-verification`, {
                        state: { interview: data.interview }
                    });
                }, 1500);

            } catch (error) {
                console.error('Error validating interview link:', error);
                setError(error.message || 'Failed to validate interview link');
            } finally {
                setIsLoading(false);
            }
        };

        validateLink();
    }, [interviewId, linkCode, navigate]);

    return (
        <div className="interview-validator-container">
            <div className="interview-validator-card">
                <div className="interview-logo">
                    EqualLens
                </div>

                {isLoading ? (
                    <div className="validator-loading">
                        <div className="seesaw-container">
                            <div className="ball"></div>
                            <div className="bar"></div>
                        </div>
                        <p className="validator-message">Validating your interview link...</p>
                    </div>
                ) : error ? (
                    <div className="validator-error">
                        <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h2>Link Error</h2>
                        <p className="validator-message">{error}</p>
                        <p className="validator-info">Please contact the hiring manager for assistance.</p>
                    </div>
                ) : (
                    <div className="validator-success">
                        <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <h2>Link Validated</h2>
                        <p className="validator-message">Your interview link is valid.</p>
                        <p className="validator-info">Redirecting to ID verification...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewLinkValidator;