import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedJob, setEditedJob] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applicants, setApplicants] = useState([]);

    // Fetch jobs when component mounts
    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                // In a real app, this would be an API call
                // For now, let's use mock data
                const mockJobs = [
                    {
                        jobId: "job-00000001",
                        jobTitle: "Software Engineer",
                        jobDescription: "We are looking for a skilled software engineer with expertise in React and Node.js.",
                        departments: ["Engineering", "Development"],
                        minimumCGPA: 3.0,
                        createdAt: "2023-04-15T14:30:45.123Z",
                        applicationCount: 5
                    },
                    {
                        jobId: "job-00000002",
                        jobTitle: "UX Designer",
                        jobDescription: "Design intuitive user experiences for our flagship product.",
                        departments: ["Design"],
                        minimumCGPA: 2.8,
                        createdAt: "2023-04-12T09:15:32.456Z",
                        applicationCount: 3
                    },
                    {
                        jobId: "job-00000003",
                        jobTitle: "Product Manager",
                        jobDescription: "Lead product development and strategy for our new service line.",
                        departments: ["Product", "Management"],
                        minimumCGPA: 3.2,
                        createdAt: "2023-04-10T16:45:22.789Z",
                        applicationCount: 7
                    }
                ];

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 800));
                setJobs(mockJobs);
                setIsLoading(false);
            } catch (err) {
                setError("Failed to fetch jobs. Please try again.");
                setIsLoading(false);
                console.error("Error fetching jobs:", err);
            }
        };

        fetchJobs();
    }, []);

    // Fetch applicants for a selected job
    const fetchApplicants = async (jobId) => {
        try {
            // In a real app, this would be an API call using jobId
            // For now, let's use mock data
            const mockApplicants = [
                {
                    applicationId: "app-00000001",
                    candidateId: "cand-00000001",
                    jobId: jobId,
                    applicationDate: "2023-04-16T10:25:32.123Z",
                    status: "new",
                    candidateInfo: {
                        name: "John Smith",
                        email: "john.smith@example.com",
                        phone: "555-123-4567",
                        education: "B.Sc. Computer Science",
                        cgpa: 3.7
                    }
                },
                {
                    applicationId: "app-00000002",
                    candidateId: "cand-00000002",
                    jobId: jobId,
                    applicationDate: "2023-04-17T14:12:45.456Z",
                    status: "reviewed",
                    candidateInfo: {
                        name: "Emma Johnson",
                        email: "emma.j@example.com",
                        phone: "555-987-6543",
                        education: "M.Sc. Software Engineering",
                        cgpa: 3.9
                    }
                },
                {
                    applicationId: "app-00000003",
                    candidateId: "cand-00000003",
                    jobId: jobId,
                    applicationDate: "2023-04-18T09:30:15.789Z",
                    status: "new",
                    candidateInfo: {
                        name: "Michael Chen",
                        email: "m.chen@example.com",
                        phone: "555-456-7890",
                        education: "B.Eng. Computer Engineering",
                        cgpa: 3.5
                    }
                }
            ];

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 600));
            setApplicants(mockApplicants);
        } catch (err) {
            console.error("Error fetching applicants:", err);
        }
    };

    const handleJobSelect = (job) => {
        setSelectedJob(job);
        setEditedJob(job);
        fetchApplicants(job.jobId);
    };

    const handleBackToJobs = () => {
        setSelectedJob(null);
        setIsEditing(false);
        setApplicants([]);
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = async () => {
        try {
            // In a real app, this would be an API call
            console.log("Saving changes to job:", editedJob);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Update the job in the local state
            setJobs(jobs.map(job => 
                job.jobId === editedJob.jobId ? editedJob : job
            ));
            
            setSelectedJob(editedJob);
            setIsEditing(false);
        } catch (err) {
            console.error("Error saving job changes:", err);
            // Show error message to user
            alert("Failed to save changes. Please try again.");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedJob({
            ...editedJob,
            [name]: value
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Loading jobs...</p>
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
            {!selectedJob ? (
                <>
                    <div className="dashboard-header">
                        <h1>Job Dashboard</h1>
                        <button className="create-job-button">Create New Job</button>
                    </div>
                    <div className="jobs-list">
                        {jobs.length === 0 ? (
                            <div className="no-jobs">
                                <p>No jobs found. Create your first job to get started.</p>
                            </div>
                        ) : (
                            jobs.map((job) => (
                                <div 
                                    key={job.jobId} 
                                    className="job-card"
                                    onClick={() => handleJobSelect(job)}
                                >
                                    <h3 className="job-card-title">{job.jobTitle}</h3>
                                    <div className="job-card-details">
                                        <p className="job-card-date">
                                            <span className="detail-label">Posted:</span> 
                                            {formatDate(job.createdAt)}
                                        </p>
                                        <p className="job-card-applications">
                                            <span className="detail-label">Applications:</span> 
                                            {job.applicationCount}
                                        </p>
                                    </div>
                                    <div className="job-card-departments">
                                        {job.departments.map((dept, index) => (
                                            <span key={index} className="department-tag">{dept}</span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="job-detail-view">
                    <button className="back-button" onClick={handleBackToJobs}>
                        &larr; Back to Jobs
                    </button>
                    
                    <div className="job-detail-header">
                        <h2>{selectedJob.jobTitle}</h2>
                        <div className="job-actions">
                            {!isEditing ? (
                                <button className="edit-job-button" onClick={handleEditToggle}>
                                    Edit Job
                                </button>
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
                                            step="0.1"
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
                                            <div className="applicant-header">
                                                <h4>{applicant.candidateInfo.name}</h4>
                                                <span className={`status-badge ${applicant.status}`}>
                                                    {applicant.status}
                                                </span>
                                            </div>
                                            <div className="applicant-details">
                                                <p>
                                                    <span className="detail-label">Education:</span> 
                                                    {applicant.candidateInfo.education}
                                                </p>
                                                <p>
                                                    <span className="detail-label">CGPA:</span> 
                                                    {applicant.candidateInfo.cgpa.toFixed(2)}
                                                </p>
                                                <p>
                                                    <span className="detail-label">Applied:</span> 
                                                    {formatDate(applicant.applicationDate)}
                                                </p>
                                            </div>
                                            <div className="applicant-actions">
                                                <button className="view-resume-button">
                                                    View Resume
                                                </button>
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