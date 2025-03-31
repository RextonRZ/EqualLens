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
                                    <div className="education-display">
                                        {detail.detailed_profile.education.map((edu, index) => (
                                            <span key={index} className="education-tag">{edu}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {detail.detailed_profile.certifications && detail.detailed_profile.certifications.length > 0 && (
                                <div className="profile-section">
                                    <h4>Certifications</h4>
                                    <div className="education-display">
                                        {detail.detailed_profile.certifications.map((cert, index) => (
                                            <span key={index} className="education-tag">{cert}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Experience */}
                            <div className="profile-section">
                                <h4>Experience</h4>
                                
                                {/* Work Experience */}
                                {detail.detailed_profile.work_experience && detail.detailed_profile.work_experience.length > 0 && (
                                    <div className="experience-group">
                                        <p className="info-label">Work Experience:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.work_experience.map((exp, index) => (
                                                <span key={index} className="experience-tag">{exp}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Projects */}
                                {detail.detailed_profile.projects && detail.detailed_profile.projects.length > 0 && (
                                    <div className="experience-group">
                                        <p className="info-label">Projects:</p>
                                        <div className="experience-display">
                                            {detail.detailed_profile.projects.map((project, index) => (
                                                <span key={index} className="experience-tag">{project}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
