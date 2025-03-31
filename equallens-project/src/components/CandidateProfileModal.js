import React, { useState, useEffect } from 'react';
import './pages/ApplicantDetails.css';
import './pageloading.css';
import './CandidateProfileModal.css';

// LoadingAnimation component for consistent loading UI
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

const CandidateProfileModal = ({ candidateId, isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applicant, setApplicant] = useState(null);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        if (!isOpen || !candidateId) return;

        const fetchCandidateData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // First get basic candidate info
                const candidateResponse = await fetch(`http://localhost:8000/api/candidates/candidate/${candidateId}`);
                
                if (!candidateResponse.ok) {
                    throw new Error(`Failed to fetch candidate data: ${candidateResponse.status}`);
                }
                
                const candidateData = await candidateResponse.json();
                setApplicant(candidateData);

                // Check if the candidate has detailed profile already
                if (!candidateData.detailed_profile || candidateData.detailed_profile === "") {
                    // Generate detailed profile if it doesn't exist
                    const detailResponse = await fetch(`http://localhost:8000/api/candidates/detail/${candidateId}`);
                    
                    if (!detailResponse.ok) {
                        throw new Error(`Failed to generate detailed profile: ${detailResponse.status}`);
                    }
                    
                    const detailData = await detailResponse.json();
                    setDetail(detailData);
                } else {
                    // Use existing detailed profile
                    setDetail({ detailed_profile: candidateData.detailed_profile });
                }
            } catch (err) {
                console.error("Error fetching candidate profile:", err);
                setError(err.message || "Failed to load candidate profile");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCandidateData();
    }, [candidateId, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="candidate-modal-overlay" onClick={onClose}>
            <div className="candidate-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="candidate-modal-header">
                    <h2 className="candidate-modal-title">Candidate Profile</h2>
                    <button className="candidate-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="candidate-modal-body">
                    {isLoading ? (
                        <div className="modal-loading-container">
                            <LoadingAnimation />
                            <p>Loading candidate profile...</p>
                        </div>
                    ) : error ? (
                        <div className="modal-error-container">
                            <div className="error-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                            </div>
                            <h3>Error Loading Profile</h3>
                            <p>{error}</p>
                            <button onClick={onClose}>Close</button>
                        </div>
                    ) : applicant && detail ? (
                        <div className="candidate-profile-content">
                            {/* Candidate Basic Info */}
                            <div className="candidate-basic-info">
                                <h3>Candidate ID: {applicant.candidateId}</h3>
                                {applicant.status && (
                                    <div className="applicant-status-badge">
                                        <span className={`status-badge ${applicant.status.toLowerCase()}`}>{applicant.status}</span>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            {detail.detailed_profile.summary && (
                                <div className="profile-section">
                                    <h4>Summary</h4>
                                    <div className="experience-container">
                                        <div className="experience-card">{detail.detailed_profile.summary}</div>
                                    </div>
                                </div>
                            )}

                            {/* Skills Sections */}
                            <div className="profile-section">
                                <h4>Skills</h4>
                                
                                {/* Soft Skills */}
                                {detail.detailed_profile.soft_skills && detail.detailed_profile.soft_skills.length > 0 && (
                                    <div className="skills-group">
                                        <p className="info-label">Soft Skills:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.soft_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Technical Skills */}
                                {detail.detailed_profile.technical_skills && detail.detailed_profile.technical_skills.length > 0 && (
                                    <div className="skills-group">
                                        <p className="info-label">Technical Skills:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.technical_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Languages */}
                                {detail.detailed_profile.languages && detail.detailed_profile.languages.length > 0 && (
                                    <div className="skills-group">
                                        <p className="info-label">Languages:</p>
                                        <div className="skills-display">
                                            {detail.detailed_profile.languages.map((language, index) => (
                                                <span key={index} className="skill-tag">{language}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Education */}
                            {detail.detailed_profile.education && detail.detailed_profile.education.length > 0 && (
                                <div className="profile-section">
                                    <h4>Education</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.education.map((edu, index) => (
                                            <div key={index} className="info-card education">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0066cc" className="bi bi-mortarboard-fill" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0-1 1v2h3v-2a1 1 0 0 0-1-1V6.739l.686-.275a.5.5 0 0 0 .025-.917l-7.5-3.5Z"/>
                                                        <path d="M4.176 9.032a.5.5 0 0 0-.656.327l-.5 1.7a.5.5 0 0 0 .294.605l4.5 1.8a.5.5 0 0 0 .372 0l4.5-1.8a.5.5 0 0 0 .294-.605l-.5-1.7a.5.5 0 0 0-.656-.327L8 10.466 4.176 9.032Z"/>
                                                    </svg>
                                                    Education
                                                </div>
                                                <div className="info-card-content">{edu}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {detail.detailed_profile.certifications && detail.detailed_profile.certifications.length > 0 && (
                                <div className="profile-section">
                                    <h4>Certifications</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.certifications.map((cert, index) => (
                                            <div key={index} className="info-card certification">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#2e7d32" className="bi bi-award-fill" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M8 0l1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864 8 0z"/>
                                                        <path d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1 4 11.794z"/>
                                                    </svg>
                                                    Certification
                                                </div>
                                                <div className="info-card-content">{cert}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Work Experience */}
                            {detail.detailed_profile.work_experience && detail.detailed_profile.work_experience.length > 0 && (
                                <div className="profile-section">
                                    <h4>Work Experience</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.work_experience.map((exp, index) => (
                                            <div key={index} className="info-card experience">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#dd20c1" className="bi bi-briefcase-fill" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v1.384l7.614 2.03a1.5 1.5 0 0 0 .772 0L16 5.884V4.5A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5z"/>
                                                        <path d="M0 12.5A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6.85L8.129 8.947a.5.5 0 0 1-.258 0L0 6.85v5.65z"/>
                                                    </svg>
                                                    Experience
                                                </div>
                                                <div className="info-card-content">{exp}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Projects */}
                            {detail.detailed_profile.projects && detail.detailed_profile.projects.length > 0 && (
                                <div className="profile-section">
                                    <h4>Projects</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.projects.map((project, index) => (
                                            <div key={index} className="info-card project">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff9800" className="bi bi-kanban" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M13.5 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h11zm-11-1a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11z"/>
                                                        <path d="M6.5 3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3zm-4 0a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3zm8 0a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3z"/>
                                                    </svg>
                                                    Project
                                                </div>
                                                <div className="info-card-content">{project}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Co-curricular Activities */}
                            {detail.detailed_profile.co_curricular_activities && detail.detailed_profile.co_curricular_activities.length > 0 && (
                                <div className="profile-section">
                                    <h4>Co-curricular Activities</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.co_curricular_activities.map((activity, index) => (
                                            <div key={index} className="info-card project">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ff9800" className="bi bi-people-fill" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                                                    </svg>
                                                    Activity
                                                </div>
                                                <div className="info-card-content">{activity}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Awards */}
                            {detail.detailed_profile.awards && detail.detailed_profile.awards.length > 0 && (
                                <div className="profile-section">
                                    <h4>Awards & Achievements</h4>
                                    <div className="profile-grid">
                                        {detail.detailed_profile.awards.map((award, index) => (
                                            <div key={index} className="info-card certification">
                                                <div className="info-card-title">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#2e7d32" className="bi bi-trophy-fill" viewBox="0 0 16 16" style={{ marginRight: "8px" }}>
                                                        <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z"/>
                                                    </svg>
                                                    Award
                                                </div>
                                                <div className="info-card-content">{award}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="modal-error-container">
                            <p>No candidate data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CandidateProfileModal;
