import React, { useState, useEffect } from 'react';
import './Dashboard.css';
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

export default function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedJob, setEditedJob] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [jobDetailLoading, setJobDetailLoading] = useState(false);  // <-- New state for job details loading
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    // Search functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCategory, setSearchCategory] = useState('jobTitle');
    
    // Sorting functionality
    const [sortBy, setSortBy] = useState('latest');
    
    // Add handler for Create New Job button
    const handleCreateNewJob = () => {
        // Navigate to the UploadCV page which handles job creation
        window.location.href = "/upload-cv";
        
        // If you're using React Router, you could use navigate instead:
        // navigate("/upload-cv");
    };

    // Fetch jobs when component mounts
    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('http://localhost:8000/jobs'); // Adjust endpoint as needed
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const dbJobs = await response.json();
                setJobs(dbJobs); // Assuming dbJobs is an array of job objects
                setIsLoading(false);
            } catch (err) {
                setError("Failed to fetch jobs. Please try again.");
                setIsLoading(false);
                console.error("Error fetching jobs:", err);
            }
        };
        fetchJobs();
    }, []);

    // Filter jobs based on search term and category
    const filteredJobs = jobs.filter(job => {
        if (!searchTerm.trim()) return true;
        
        const term = searchTerm.toLowerCase();
        
        switch (searchCategory) {
            case 'jobTitle':
                return job.jobTitle.toLowerCase().includes(term);
            case 'department':
                return job.departments.some(dept => dept.toLowerCase().includes(term));
            case 'requiredSkills':
                return job.requiredSkills && job.requiredSkills.some(skill => skill.toLowerCase().includes(term));
            default:
                return true;
        }
    });
    
    // Sort filtered jobs based on sortBy value
    const sortedJobs = [...filteredJobs].sort((a, b) => {
        switch (sortBy) {
            case 'most-applications':
                return b.applicationCount - a.applicationCount;
            case 'latest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'a-z':
                return a.jobTitle.localeCompare(b.jobTitle);
            case 'z-a':
                return b.jobTitle.localeCompare(a.jobTitle);
            default:
                return 0;
        }
    });
    
    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    // Fetch applicants for a selected job from the backend API
    const fetchApplicants = async (jobId) => {
        try {
            const response = await fetch(`http://localhost:8000/applicants?jobId=${jobId}`);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const applicantsData = await response.json();
            setApplicants(applicantsData);
        } catch (err) {
            console.error("Error fetching applicants:", err);
        }
    };

    // Modify handleJobSelect to add loading effect
    const handleJobSelect = (job) => {
        setJobDetailLoading(true);
        // Introduce a short delay to display the loading effect
        setTimeout(() => {
            setSelectedJob(job);
            setEditedJob(job);
            fetchApplicants(job.jobId).then(() => {
                setJobDetailLoading(false);
            });
        }, 300);
    };

    // Modify handleBackToJobs to add a loading effect when clicking "Back to Jobs"
    const handleBackToJobs = () => {
        setJobDetailLoading(true);
        setTimeout(() => {
            setSelectedJob(null);
            setIsEditing(false);
            setApplicants([]);
            setJobDetailLoading(false);
        }, 300);
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = async () => {
        try {
            // Ensure minimumCGPA is formatted to 2 decimal places
            const updatedJobData = {
                ...editedJob,
                minimumCGPA: Number(parseFloat(editedJob.minimumCGPA).toFixed(2))
            };

            const response = await fetch(`http://localhost:8000/jobs/${updatedJobData.jobId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedJobData)
            });
            if (!response.ok) {
                throw new Error("Failed to update job");
            }
            const updatedJob = await response.json();
            setJobs(jobs.map(job => job.jobId === updatedJob.jobId ? updatedJob : job));
            setSelectedJob(updatedJob);
            setIsEditing(false);
            setModalMessage("Your changes have been saved successfully.");
            setShowSuccessModal(true);
        } catch (err) {
            console.error("Error updating job:", err);
            setModalMessage(err.message || "Failed to update job. Please try again.");
            setShowErrorModal(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedJob({
            ...editedJob,
            [name]: value
        });
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSearchCategory(e.target.value);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        // Convert to 12-hour format with AM/PM
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    };

    // Add new handler for "Upload More CV"
    const handleUploadMoreCV = () => {
        // window.location.href = `/upload-cv?jobId=${selectedJob.jobId}`;
    };

    const handleMinimumCGPABlur = () => {
        const value = parseFloat(editedJob.minimumCGPA);
        if (!isNaN(value)) {
            setEditedJob({ ...editedJob, minimumCGPA: Number(value.toFixed(2)) });
        }
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
                <h3 className="status-title">Job Updated Successfully!</h3>
                <p className="status-description">{modalMessage || "Your changes have been saved."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={() => setShowSuccessModal(false)}>
                        Close
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
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 className="status-title">Update Failed!</h3>
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
            <div className="dashboard-container" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '80vh' 
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px' }}>Loading jobs...</p>
                </div>
            </div>
        );
    }

    // Add loading state for job details view
    if (selectedJob && jobDetailLoading) {
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

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="error-message">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {showSuccessModal && <SuccessModal />}
            {showErrorModal && <ErrorModal />}
            {!selectedJob ? (
                <>
                    <div className="dashboard-header">
                        <h1>Job Dashboard</h1>
                        <button className="create-job-button" onClick={handleCreateNewJob}>Create New Job</button>
                    </div>
                    
                    <div className="search-container">
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search jobs..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            <select 
                                className="search-category" 
                                value={searchCategory}
                                onChange={handleCategoryChange}
                            >
                                <option value="jobTitle">Job Title</option>
                                <option value="department">Department</option>
                                <option value="requiredSkills">Required Skills</option>
                            </select>
                        </div>
                        
                        <div className="sort-container">
                            <label htmlFor="sort-select">Sort by:</label>
                            <select 
                                id="sort-select"
                                className="sort-select" 
                                value={sortBy}
                                onChange={handleSortChange}
                            >
                                <option value="latest">Latest</option>
                                <option value="oldest">Oldest</option>
                                <option value="most-applications">Most Applications</option>
                                <option value="a-z">A-Z</option>
                                <option value="z-a">Z-A</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="jobs-list-single-column">
                        {sortedJobs.length === 0 ? (
                            <div className="no-jobs">
                                <p>No jobs found matching your search.</p>
                            </div>
                        ) : (
                            sortedJobs.map((job) => (
                                <div 
                                    key={job.jobId} 
                                    className="job-card-row"
                                    onClick={() => handleJobSelect(job)}
                                >
                                    <div className="job-card-main-content">
                                        <h3 className="job-card-title">{job.jobTitle}</h3>
                                        <p className="job-card-description">{job.jobDescription}</p>
                                        <div className="job-card-departments">
                                            {job.departments.map((dept, index) => (
                                                <span key={index} className="department-tag">{dept}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="job-card-side-content">
                                        <p className="job-card-date">
                                            <span className="detail-label">Posted: </span> 
                                            {formatDate(job.createdAt)}
                                        </p>
                                        <p className="job-card-applications">
                                            <span className="detail-label">Applications: </span> 
                                            {job.applicationCount}
                                        </p>
                                        <div className="job-card-skills">
                                            <span className="detail-label">Required Skills: </span>
                                            <div className="skills-tags">
                                                {job.requiredSkills && job.requiredSkills.map((skill, index) => (
                                                    <span key={index} className="skill-tag">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="job-detail-view">
                    <button className="back-button" onClick={handleBackToJobs}>
                        <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Back to Jobs
                    </button>
                    <div className="job-detail-header">
                        <h2>{selectedJob.jobTitle}</h2>
                        <div className="job-actions">
                            {!isEditing ? (
                                <>
                                    <button className="edit-job-button" onClick={handleEditToggle}>
                                        Edit Job
                                    </button>
                                    <button className="upload-more-cv-button" onClick={handleUploadMoreCV}>
                                        Upload More CV
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="cancel-button" onClick={() => {
                                        setIsEditing(false);
                                        setEditedJob(selectedJob); // Reset changes
                                    }}>
                                        Cancel
                                    </button>
                                    <button className="save-button" onClick={handleSaveChanges}>
                                        Save Changes
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="job-detail-content">
                        <div className="job-info-container">
                            <h3>Job Details</h3>
                            {isEditing ? (
                                <div className="job-edit-form">
                                    <div className="form-group">
                                        <label>Job Title</label>
                                        <input 
                                            type="text"
                                            name="jobTitle"
                                            value={editedJob.jobTitle}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Job Description</label>
                                        <textarea
                                            name="jobDescription"
                                            value={editedJob.jobDescription}
                                            onChange={handleInputChange}
                                            rows="4"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Minimum CGPA</label>
                                        <input 
                                            type="number" 
                                            name="minimumCGPA"
                                            value={editedJob.minimumCGPA}
                                            onChange={handleInputChange}
                                            onBlur={handleMinimumCGPABlur}
                                            step="0.01"
                                            min="0"
                                            max="4.0"
                                        />
                                    </div>

                                    {/* Departments would need a more complex editor component */}
                                    <div className="form-group">
                                        <label>Departments</label>
                                        <p className="helper-text">Editing departments is not available in this view</p>
                                        <div className="departments-display">
                                            {editedJob.departments?.map((dept, index) => (
                                                <span key={index} className="department-tag">{dept}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="job-info">
                                    <div className="info-group">
                                        <p className="info-label">Posted:</p>
                                        <p className="info-value">{formatDate(selectedJob.createdAt)}</p>
                                    </div>
                                    
                                    <div className="info-group">
                                        <p className="info-label">Departments:</p>
                                        <div className="departments-display">
                                            {selectedJob.departments.map((dept, index) => (
                                                <span key={index} className="department-tag">{dept}</span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="info-group">
                                        <p className="info-label">Minimum CGPA:</p>
                                        <p className="info-value">{selectedJob.minimumCGPA.toFixed(2)}</p>
                                    </div>
                                    
                                    <div className="info-group">
                                        <p className="info-label">Required Skills:</p>
                                        <div className="skills-display">
                                            {selectedJob.requiredSkills && selectedJob.requiredSkills.map((skill, index) => (
                                                <span key={index} className="skill-tag">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="info-group description-group">
                                        <p className="info-label">Description:</p>
                                        <p className="info-value">{selectedJob.jobDescription}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="applicants-container">
                            <h3>Applicants ({applicants.length})</h3>
                            {applicants.length === 0 ? (
                                <div className="no-applicants">
                                    <p>No applications have been received for this job yet.</p>
                                </div>
                            ) : (
                                <div className="applicants-list">
                                    {applicants.map((applicant) => (
                                        <div key={applicant.applicationId} className="applicant-card">
                                            <div className="applicant-info">
                                                <h4>
                                                    { applicant.candidateInfo?.name ||
                                                      applicant.extractedText?.applicant_name ||
                                                      "Candidate Name Not Available" }
                                                </h4>
                                                <p className="applicant-email">
                                                    { applicant.candidateInfo?.email ||
                                                      applicant.extractedText?.applicant_mail ||
                                                      "Email Not Available" }
                                                </p>
                                            </div>
                                            <div className="applicant-status-actions">
                                                <span className={`status-badge ${applicant.status || 'new'}`}>
                                                    { applicant.status || 'new' }
                                                </span>
                                                <button className="view-profile-button">
                                                    Full Profile
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}