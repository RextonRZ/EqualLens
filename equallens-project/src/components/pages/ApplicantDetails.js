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

// Generate detailed information for a specific applicant from the backend API
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

// Fetch the latest job data to ensure we have the most up-to-date information
const fetchJob = async (jobId) => {
    try {
        // Fetch the latest job data to ensure we have the most up-to-date information
        const jobResponse = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
        if (!jobResponse.ok) {
            throw new Error(`Failed to fetch updated job data: ${jobResponse.status}`);
        }
        const updatedJobData = await jobResponse.json();
        console.log("Fetched updated job data:", updatedJobData);
        return updatedJobData;
    } catch (err) {
        console.error("Error fetching job data:", err);
    }
};

export default function ApplicantDetails() {
    const [isLoading, setIsLoading] = useState(true);
    const [processingAction, setProcessingAction] = useState(false);
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState('');
    const [modalMessage, setModalMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const [applicant, setApplicant] = useState(null);
    const [job, setJob] = useState(null);
    const [detail, setDetail] = useState(null);
    const [job_id, setJob_id] = useState(null);
    const [totalScore, setTotalScore] = useState(0);
    const [outcomeScore, setOutcomeScore] = useState(0);
    const [prompt, setPrompt] = useState("");
    const [showQuestionReminderModal, setShowQuestionReminderModal] = useState(false);


    useEffect(() => {
        // Set all to default
        setIsLoading(true);
        setError(null);
        setShowErrorModal(false);
        setModalMessage("");
        setApplicant(null);
        setJob(null);
        setDetail(null);
        setJob_id(null);
        setTotalScore(0);
        setOutcomeScore(0);
        setPrompt("");

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

            try {
                const applicants = await fetchApplicants(jobId);
                const jobData = await fetchJob(jobId);

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

                const detailData = await generateApplicantDetail(id);
                setApplicant(candidateData);
                setJob(jobData);
                setDetail(detailData);

                if (
                    candidateData?.rank_score?.skill_score &&
                    jobData?.rank_weight?.skill_weight
                ) {
                    setOutcomeScore(
                        (candidateData.rank_score.skill_score * jobData.rank_weight.skill_weight / 10.0) +
                        (candidateData.rank_score.experience_score * jobData.rank_weight.experience_weight / 10.0) +
                        (candidateData.rank_score.education_score * jobData.rank_weight.education_weight / 10.0)
                    );
                    setTotalScore(
                        jobData.rank_weight.skill_weight +
                        jobData.rank_weight.experience_weight +
                        jobData.rank_weight.education_weight
                    );
                } else {
                    console.warn("Missing rank_score or rank_weight data for candidate or job.");
                }

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

    const checkApplicationStatus = (action) => {
        // Check if application has a status that would prevent the action
        if (!applicant || !applicant.status) {
            // If no status, assume it's a new application
            return true;
        }

        const status = applicant.status.toLowerCase();

        if (action === 'accept') {
            // If already interviewed or rejected, don't allow accepting
            if (status === 'interview scheduled' || status === 'interview completed') {
                setModalMessage("This candidate already has an interview scheduled.");
                setShowInfoModal(true);
                return false;
            } else if (status === 'rejected') {
                setModalMessage("This candidate has already been rejected.");
                setShowInfoModal(true);
                return false;
            }
        } else if (action === 'reject') {
            // If already rejected or completed interview, don't allow rejecting
            if (status === 'rejected') {
                setModalMessage("This candidate has already been rejected.");
                setShowInfoModal(true);
                return false;
            } else if (status === 'interview completed') {
                setModalMessage("This candidate has already completed their interview.");
                setShowInfoModal(true);
                return false;
            }
        }

        return true;
    };

    const handleAcceptCandidate = () => {
        if (!checkApplicationStatus('accept')) {
            return;
        }

        setConfirmAction('accept');
        setModalMessage("Are you sure you want to invite this candidate for an interview? The interview link will expire in 7 days.");
        setShowConfirmModal(true);
    };

    const handleRejectCandidate = () => {
        if (!checkApplicationStatus('reject')) {
            return;
        }
        setConfirmAction('reject');
        setModalMessage("Are you sure you want to reject this candidate?");
        setShowConfirmModal(true);
    };

    const handleConfirmAction = async () => {
        setShowConfirmModal(false);
        setProcessingAction(true);

        try {
            if (confirmAction === 'accept') {
                // Generate interview link and send email
                const response = await fetch('http://localhost:8000/api/interviews/generate-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        applicationId: applicant.applicationId,
                        candidateId: applicant.candidateId,
                        jobId: job_id,
                        email: applicant.extractedText?.applicant_mail || ''
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate interview link');
                }

                const data = await response.json();
                setModalMessage(`Interview invitation has been sent to the candidate. The link will expire in 7 days.`);
                setShowSuccessModal(true);

                // Update local applicant status
                setApplicant({
                    ...applicant,
                    status: 'interview scheduled'
                });

                // After showing success modal, we'll show question reminder
                // We set a timeout to ensure the success modal is seen first
                setTimeout(() => {
                    setShowSuccessModal(false);
                    setShowQuestionReminderModal(true);
                }, 1500);

            } else if (confirmAction === 'reject') {
                // Reject the candidate
                const response = await fetch(`http://localhost:8000/api/interviews/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        applicationId: applicant.applicationId,
                        candidateId: applicant.candidateId,
                        jobId: job_id,
                        email: applicant.extractedText?.applicant_mail || ''
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to reject candidate');
                }

                setModalMessage('Rejection email has been sent to the candidate.');
                setShowSuccessModal(true);

                // Update local applicant status
                setApplicant({
                    ...applicant,
                    status: 'rejected'
                });
            }
        } catch (error) {
            console.error("Error processing candidate action:", error);
            setModalMessage(`Error: ${error.message}`);
            setShowErrorModal(true);
        } finally {
            setProcessingAction(false);
        }
    };


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


    const InfoModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal info-modal">
                <div className="status-icon info-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <h3 className="status-title">Information</h3>
                <p className="status-description">{modalMessage}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={() => setShowInfoModal(false)}>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );

    const SuccessModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal success-modal">
                <div className="status-icon success-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 className="status-title">Success</h3>
                <p className="status-description">{modalMessage}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={() => {
                        setShowSuccessModal(false);
                        // Only navigate back if it's not an 'accept' action
                        if (confirmAction !== 'accept') {
                            handleBackToJob();
                        }
                    }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

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
                <h3 className="status-title">Confirm Action</h3>
                <p className="status-description">{modalMessage}</p>

                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={() => setShowConfirmModal(false)}>
                        Cancel
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmAction}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );

    const QuestionReminderModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal">
                <div className="status-icon warning-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 className="status-title">Create Interview Questions</h3>
                <p className="status-description">
                    Remember to create interview questions for this candidate to ensure a structured interview process. Would you like to create questions now?
                </p>
                <div className="status-buttons">
                    <button
                        className="status-button secondary-button"
                        onClick={() => {
                            setShowQuestionReminderModal(false);
                            handleBackToJob(); // Return to job details if canceled
                        }}
                    >
                        Not Now
                    </button>
                    <button
                        className="status-button primary-button"
                        onClick={() => {
                            setShowQuestionReminderModal(false);
                            window.location.href = `/add-interview-questions?jobId=${job_id}`;
                        }}
                    >
                        Create Questions
                    </button>
                </div>
            </div>
        </div>
    );

    const getStatusBadge = () => {
        if (!applicant || !applicant.status) return null;

        const status = applicant.status.toLowerCase();
        let badgeClass = 'status-badge new';

        if (status === 'interview scheduled') {
            badgeClass = 'status-badge interview';
        } else if (status === 'interview completed') {
            badgeClass = 'status-badge completed';
        } else if (status === 'rejected') {
            badgeClass = 'status-badge rejected';
        }

        return (
            <div className="applicant-status-badge">
                <span className={badgeClass}>{applicant.status}</span>
            </div>
        );
    };

    if (isLoading || processingAction) {
        return (
            <div className="detail-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80vh',
                backgroundColor: 'rgb(255, 255, 255)'
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px' }}>
                        {processingAction ? "Processing your request..." : "Loading profile details..."}
                    </p>
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
            {showSuccessModal && <SuccessModal />}
            {showConfirmModal && <ConfirmModal />}
            {showInfoModal && <InfoModal />}
            {showQuestionReminderModal && <QuestionReminderModal />}

            {!isLoading && applicant && detail && (
                <div className="applicant-detail-view">
                    <button className="back-button" onClick={handleBackToJob}>
                        <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Back to Job Details
                    </button>
                    <div className="applicant-detail-header">
                        <div className="applicant-header-left">
                        <h1>{applicant.candidateId ? applicant.candidateId + "\'s" : ""} Profile</h1>
                            {getStatusBadge()}
                        </div>
                        <div className="applicant-action-buttons">
                            <button
                                className="accept-button"
                                onClick={handleAcceptCandidate}
                                disabled={applicant.status === 'interview scheduled' ||
                                    applicant.status === 'interview completed' ||
                                    applicant.status === 'rejected'}
                            >
                                Accept
                            </button>
                            <button
                                className="reject-button"
                                onClick={handleRejectCandidate}
                                disabled={applicant.status === 'rejected' ||
                                    applicant.status === 'interview completed'}
                            >
                                Reject
                            </button>
                        </div>
                    </div>

                    <div className="applicant-detail-content" style={{ gap: "10px" }}>
                        <div className="info-container" style={{ gap: "10px" }}>
                            <div className="additional-info" style={{ marginBottom: "10px" }}>
                                {detail.detailed_profile.summary ? (
                                    <div className="info-group">
                                        <p className="info-label">Overall Summary:</p>
                                        <div className="experience-container">
                                            <div className="experience-card">{detail.detailed_profile.summary}</div>
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            <div className="additional-info-2" style={{ marginBottom: "10px" }}>
                                <div className="info-group">
                                    <p className="info-label">Rank Score:</p>
                                    <div className="experience-container" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        {/* Skill Circle */}
                                        <div className="skill" style={{ marginLeft: "10px", marginTop: "10px" }}>
                                            <div className="outer">
                                                <div className="inner">
                                                    <div id="number">
                                                        {applicant.rank_score && applicant.rank_score.final_score !== undefined
                                                            ? `${applicant.rank_score.final_score}%`
                                                            : "N/A"}
                                                    </div>
                                                    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="160px" height="160px">
                                                        <defs>
                                                            <linearGradient id="GradientColor">
                                                                <stop offset="0%" stop-color="#ef402d" />
                                                                <stop offset="100%" stop-color="#f9a825" />
                                                            </linearGradient>
                                                        </defs>
                                                        <circle
                                                            cx="80"
                                                            cy="80"
                                                            r="70"
                                                            stroke-linecap="round"
                                                            transform="rotate(-90 80 80)"
                                                            style={{
                                                                strokeDashoffset:
                                                                    applicant.rank_score && applicant.rank_score.final_score !== undefined
                                                                        ? 450 - 450 * (applicant.rank_score.final_score / 100.0)
                                                                        : 450,
                                                            }}
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "center", marginTop: "5px", fontWeight: "bold", fontSize: "1rem" }}>
                                                {outcomeScore && totalScore
                                                    ? `${outcomeScore} / ${totalScore}`
                                                    : "Not scored yet"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="additional-info-3" style={{ marginBottom: "5px" }}>
                                <div className="info-group">
                                    <p className="info-label">Score Breakdown:</p>
                                    <div className="scores-container">
                                        {/* Skill Score */}
                                        <div className="score-card">
                                            <h4>Skill Score</h4>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${applicant.rank_score?.skill_score && job?.rank_weight?.skill_weight ?
                                                            (applicant.rank_score?.skill_score * job.rank_weight.skill_weight / 10.0 / job.rank_weight.skill_weight * 100) : 0}%`,
                                                        backgroundColor: '#8250c8'
                                                    }}
                                                ></div>
                                            </div>
                                            <p>{applicant.rank_score?.skill_score && job?.rank_weight?.skill_weight ?
                                                (applicant.rank_score?.skill_score * job.rank_weight.skill_weight / 10.0 + "/" + job?.rank_weight?.skill_weight) : "N/A"}</p>
                                        </div>

                                        {/* Education Score */}
                                        <div className="score-card">
                                            <h4>Education Score</h4>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${applicant.rank_score?.education_score && job?.rank_weight?.education_weight ?
                                                            (applicant.rank_score.education_score * job.rank_weight.education_weight / 10.0 / job.rank_weight.education_weight * 100) : 0}%`,
                                                        backgroundColor: '#0066cc'
                                                    }}
                                                ></div>
                                            </div>
                                            <p>{applicant.rank_score?.education_score && job?.rank_weight?.education_weight ?
                                                (applicant.rank_score?.education_score * job.rank_weight.education_weight / 10.0 + "/" + job?.rank_weight?.education_weight) : "N/A"}</p>
                                        </div>

                                        {/* Experience Score */}
                                        <div className="score-card">
                                            <h4>Experience Score</h4>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${applicant.rank_score?.experience_score && job?.rank_weight?.experience_weight ?
                                                            (applicant.rank_score.experience_score * job.rank_weight.experience_weight / 10.0 / job.rank_weight.experience_weight * 100) : 0}%`,
                                                        backgroundColor: '#dd20c1'
                                                    }}
                                                ></div>
                                            </div>
                                            <p>{applicant.rank_score?.experience_score && job?.rank_weight?.experience_weight ?
                                                (applicant.rank_score?.experience_score * job.rank_weight.experience_weight / 10.0 + "/" + job?.rank_weight?.experience_weight) : "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="info-group-2" style={{ marginTop: "10px" }}>
                                    <p className="info-label">Prompt:</p>
                                    <div style={{ flex: 1, fontSize: "1rem", color: "#555" }}>
                                        {job?.prompt ? job.prompt : "No prompt reference"}
                                    </div>
                                    <div className="experience-container">
                                        {applicant.rank_score ? (
                                            <div className="experience-card">
                                                <p>Final Score: {applicant.rank_score.final_score || 'N/A'}</p>
                                                <p>Skills: {applicant.rank_score.skill_score || 'N/A'}</p>
                                                <p>Education: {applicant.rank_score.education_score || 'N/A'}</p>
                                                <p>Experience: {applicant.rank_score.experience_score || 'N/A'}</p>
                                            </div>
                                        ) : (
                                            <p>No rank score available</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Skill Large Container */}
                        <div className="applicant-info-container" style={{ marginTop: "5px" }}>
                            <div className="section-header">
                                <h2>Skills</h2>
                            </div>
                            {/* Soft Skill Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.soft_skills && detail.detailed_profile.soft_skills.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Soft Skills:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.soft_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Technical Skill Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.technical_skills && detail.detailed_profile.technical_skills.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Technical Skills:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.technical_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Language Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.languages && detail.detailed_profile.languages.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Languages:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.languages.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                        </div>

                        {/* Education Large Container */}
                        <div className="applicant-info-container" style={{ marginTop: "5px" }}>
                            <div className="section-header">
                                <h2>Education</h2>
                            </div>
                            {/* Education Level Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.education && detail.detailed_profile.education.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Education Level:</p>
                                        <div className="education-display">
                                            {detail.detailed_profile.education.map((level, index) => (
                                                <span key={index} className="education-tag">{level}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Certifications Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.certifications && detail.detailed_profile.certifications.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Certifications:</p>
                                        <div className="education-display">
                                            {detail.detailed_profile.certifications.map((level, index) => (
                                                <span key={index} className="education-tag">{level}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Awards Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.awards && detail.detailed_profile.awards.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Awards:</p>
                                        <div className="education-display">
                                            {detail.detailed_profile.awards.map((level, index) => (
                                                <span key={index} className="education-tag">{level}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                        </div>

                        {/* Experience Large Container */}
                        <div className="applicant-info-container" style={{ marginTop: "5px" }}>
                            <div className="section-header">
                                <h2>Experience</h2>
                            </div>
                            {/* Work Experience Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.work_experience && detail.detailed_profile.work_experience.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Work Experience:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.work_experience.map((work, index) => (
                                                <span key={index} className="experience-tag">{work}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Projects Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.projects && detail.detailed_profile.projects.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Projects:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.projects.map((work, index) => (
                                                <span key={index} className="experience-tag">{work}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                            {/* Co-curricular Activities Container */}
                            <div className="applicant-info">
                                {detail.detailed_profile.co_curricular_activities && detail.detailed_profile.co_curricular_activities.length > 0 ? (
                                    <div className="info-group" style={{ marginBottom: "10px" }}>
                                        <p className="info-label">Co-curricular Activities:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.co_curricular_activities.map((work, index) => (
                                                <span key={index} className="experience-tag">{work}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : <div></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}