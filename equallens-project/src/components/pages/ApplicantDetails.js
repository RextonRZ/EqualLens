import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ApplicantDetails.css';
import '../pageloading.css'; // Import the loading animation CSS

// LoadingAnimation component for consistent loading UI across the application
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

// Fetch applicants for a selected job from the backend API
const fetchApplicants = async (jobId) => {
    try {
        // Fix the API endpoint to match the backend API structure
        const response = await fetch(`http://localhost:8000/api/candidates/applicants?jobId=${jobId}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        const applicantsData = await response.json();
        console.log("Fetched applicants data:", applicantsData); // Debug: log the received data
        return applicantsData;
    } catch (err) {
        console.error("Error fetching applicants:", err);
    }
};

// Fetch applicants for a selected job from the backend API
const generateApplicantDetail = async (candidateId) => {
    try {
        // Fix the API endpoint to match the backend API structure
        const response = await fetch(`http://localhost:8000/api/candidates/detail/${candidateId}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        const applicantDetails = await response.json();
        console.log("Generated applicant detail:", applicantDetails); // Debug: log the received data
        return applicantDetails;
    } catch (err) {
        console.error("Error generating applicant details:", err);
    }
};

export default function ApplicantDetails() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const [applicant, setApplicant] = useState(null);
    const [detail, setDetail] = useState(null);
    const [job_id, setJob_id] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            // Extract candidateId from the URL path
            const pathSegments = location.pathname.split("/");
            const id = pathSegments[pathSegments.length - 1]; // Gets the last segment
            const jobId = pathSegments[pathSegments.length - 2]; // Gets the second-to-last segment
            setJob_id(jobId);

            if (!id) {
                setModalMessage("Candidate ID not found in URL.");
                setShowErrorModal(true);
                setTimeout(() => {
                    navigate(-1);
                }, 3000);
                return;
            }

            if (!jobId) {
                setModalMessage("Job ID not found in URL.");
                setShowErrorModal(true);
                setTimeout(() => {
                    navigate(-1);
                }, 3000);
                return;
            }

            // Only proceed with fetching if we have a valid ID
            if (!id || !jobId) {
                return;
            }

            console.log("Fetching candidate id", id);
            console.log("Fetching job id", jobId);

            try {
                const applicants = await fetchApplicants(jobId);

                // Make sure we have applicants data to work with
                if (!applicants || applicants.length === 0) {
                    throw new Error("No applicants found for this job.");
                }

                // Find the candidate with matching ID in the applicants array
                const candidateData = applicants.find(candidate =>
                    candidate.candidateId && candidate.candidateId.toString() === id
                );

                if (!candidateData) {
                    throw new Error(`Candidate with ID ${id} not found in the applicants list.`);
                }

                console.log("After fetching candidate data", candidateData);

                const detailData = await generateApplicantDetail(id);
                setApplicant(candidateData);
                setDetail(detailData);

                console.log("After fetching candidate details", detailData);

                setIsLoading(false);
            } catch (err) {
                console.error("Comprehensive error fetching candidate:", err);
                setModalMessage(`Error: ${err.message}`);
                setShowErrorModal(true);
                setTimeout(() => {
                    navigate(-1);
                }, 3000);
                setIsLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleBackToJob = () => {
        // Use React Router's navigate
        setTimeout(() => {
            if (job_id) {
                navigate(`/dashboard`, {
                    state: {
                        directToJobDetails: true,
                        jobId: job_id
                    }
                });
            } else {
                navigate("/dashboard");
            }
        }, 800);
    };

    /* TODO: Implement accept and reject candidate functionality */

    const handleAcceptCandidate = () => {

    }
    const handleRejectCandidate = () => {

    }
    

    const ErrorModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal error-modal">
                <div className="status-icon error-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 className="status-title">Profile Loading Failed!</h3>
                <p className="status-description">{modalMessage || "Failed to update job details."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={() => setShowErrorModal(false)}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="detail-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80vh'
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px' }}>Loading profile details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="detail-container">
                <div className="error-message">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="detail-container">
            {showErrorModal && <ErrorModal />}

            {!isLoading && applicant && detail && (
                <div className="applicant-detail-view">
                    <button className="back-button" onClick={handleBackToJob}>
                        <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Back to Job Details
                    </button>
                    <div className="applicant-detail-header">
                        <h1>{applicant.candidateId ? applicant.candidateId + "\'s" : ""} Profile</h1>
                        <div className="applicant-action-buttons">
                            <button className="accept-button" onClick={handleAcceptCandidate}>Accept</button>
                            <button className="reject-button" onClick={handleRejectCandidate}>Reject</button>
                        </div>
                    </div>

                    <div className="applicant-detail-content">
                        <div className="info-container">
                            <div className="additional-info">
                                {detail.detailed_profile.summary ? (
                                    <div className="info-group">
                                        <p className="info-label">Overall Summary:</p>
                                        <div className="experience-container">
                                            <div className="experience-card">{detail.detailed_profile.summary}</div>
                                        </div>
                                    </div>) : <div></div>}
                            </div>
                            <div className="additional-info">
                                <div className="info-group">
                                    <p className="info-label">Rank Score:</p>
                                    <div className="experience-container">
                                        <p> Hello </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="applicant-info-container">
                            <div className="applicant-info">
                                {detail.detailed_profile.skills.length > 0 ? (
                                    <div className="info-group">
                                        <p className="info-label">Skills:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>) : <div></div>}
                                {detail.detailed_profile.education.length > 0 ? (
                                    <div className="info-group">
                                        <p className="info-label">Education Level:</p>
                                        <div className="education-display">
                                            {detail.detailed_profile.education.map((level, index) => (
                                                <span key={index} className="education-tag">{level}</span>
                                            ))}
                                        </div>
                                    </div>) : <div></div>}
                                {detail.detailed_profile.experience.length > 0 ? (
                                    <div className="info-group">
                                        <p className="info-label">Experience:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.education.map((work, index) => (
                                                <span key={index} className="experience-tag">{work}</span>
                                            ))}
                                        </div>
                                    </div>) : <div></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}