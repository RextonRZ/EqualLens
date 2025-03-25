import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pageloading.css';

// LoadingAnimation component
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

// Status Modal Component
const StatusModal = ({ type, title, message, onClose, onAction, actionText }) => (
    <div className="status-modal-overlay" role="dialog" aria-modal="true">
        <div className={`status-modal ${type}-modal`}>
            <div className={`status-icon ${type}-icon`} aria-hidden="true">
                {type === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                )}
            </div>
            <h3 className="status-title">{title}</h3>
            <p className="status-description">{message}</p>
            <div className="status-buttons">
                <button className="status-button primary-button" onClick={onAction || onClose}>
                    {actionText || 'Close'}
                </button>
                {onAction && (
                    <button className="status-button secondary-button" onClick={onClose}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    </div>
);

function InterviewLinkGenerator() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState('');
    const [applications, setApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [selectedApplications, setSelectedApplications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [message, setMessage] = useState('');
    const [modal, setModal] = useState({ show: false, type: 'success', title: '', message: '' });

    // Fetch jobs on component mount
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('http://localhost:8000/jobs');
                if (!response.ok) {
                    throw new Error("Failed to fetch jobs");
                }
                const data = await response.json();
                setJobs(data);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                setModal({
                    show: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to fetch jobs. Please try again.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Fetch applications when a job is selected
    useEffect(() => {
        const fetchApplications = async () => {
            if (!selectedJob) return;

            try {
                setIsLoading(true);
                const response = await fetch(`http://localhost:8000/applicants?jobId=${selectedJob}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch applicants");
                }
                const data = await response.json();

                // Filter out applications that already have interviews scheduled
                const eligibleApplications = data.filter(app => {
                    return app.applicationId && !app.interview?.interviewLink;
                });

                setApplications(eligibleApplications);
                setFilteredApplications(eligibleApplications);
            } catch (error) {
                console.error("Error fetching applicants:", error);
                setModal({
                    show: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to fetch applicants. Please try again.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchApplications();
    }, [selectedJob]);

    // Filter applications based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredApplications(applications);
            return;
        }

        const filtered = applications.filter(app => {
            const candidateName = `${app.extractedText?.applicant_name || ''}`.toLowerCase();
            const candidateEmail = `${app.extractedText?.applicant_mail || ''}`.toLowerCase();
            const searchLower = searchTerm.toLowerCase();

            return candidateName.includes(searchLower) || candidateEmail.includes(searchLower);
        });

        setFilteredApplications(filtered);
    }, [searchTerm, applications]);

    const handleJobChange = (e) => {
        setSelectedJob(e.target.value);
        setSelectedApplications([]);
        setSearchTerm('');
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleApplicationSelect = (applicationId) => {
        setSelectedApplications(prev => {
            if (prev.includes(applicationId)) {
                return prev.filter(id => id !== applicationId);
            } else {
                return [...prev, applicationId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedApplications.length === filteredApplications.length) {
            // If all are selected, deselect all
            setSelectedApplications([]);
        } else {
            // Otherwise, select all filtered applications
            setSelectedApplications(filteredApplications.map(app => app.applicationId));
        }
    };

    const generateLinks = async () => {
        if (selectedApplications.length === 0) {
            setModal({
                show: true,
                type: 'error',
                title: 'No Applications Selected',
                message: 'Please select at least one application to generate an interview link.'
            });
            return;
        }

        if (!scheduledDate) {
            setModal({
                show: true,
                type: 'error',
                title: 'Missing Information',
                message: 'Please set a scheduled date for the interviews.'
            });
            return;
        }

        try {
            setIsLoading(true);
            setMessage('Generating interview links and sending emails...');

            // Get the selected job details for generating links
            const selectedJobData = jobs.find(job => job.jobId === selectedJob);

            // Process each selected application
            const results = [];

            for (const applicationId of selectedApplications) {
                // Find the application data
                const application = applications.find(app => app.applicationId === applicationId);

                if (!application) continue;

                // Extract candidate email or use a default
                const candidateEmail = application.extractedText?.applicant_mail || 'candidate@example.com';

                // Prepare request data
                const requestData = {
                    applicationId: applicationId,
                    candidateId: application.candidateId,
                    jobId: selectedJob,
                    email: candidateEmail,
                    scheduledDate: new Date(scheduledDate).toISOString()
                };

                // Call the API to generate link
                const response = await fetch('http://localhost:8000/api/interviews/generate-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to generate link: ${errorData.detail || 'Unknown error'}`);
                }

                const result = await response.json();
                results.push(result);
            }

            // Show success message
            setModal({
                show: true,
                type: 'success',
                title: 'Success',
                message: `Generated ${results.length} interview links successfully.`
            });

            // Reset selections after successful generation
            setSelectedApplications([]);

        } catch (error) {
            console.error("Error generating links:", error);
            setModal({
                show: true,
                type: 'error',
                title: 'Error',
                message: `Failed to generate interview links: ${error.message}`
            });
        } finally {
            setIsLoading(false);
            setMessage('');
        }
    };

    const closeModal = () => {
        setModal({ ...modal, show: false });
    };

    // Format date for min attribute (today's date)
    const today = new Date().toISOString().split('T')[0];

    if (isLoading) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <LoadingAnimation />
                <p>{message || 'Loading...'}</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {modal.show && (
                <StatusModal
                    type={modal.type}
                    title={modal.title}
                    message={modal.message}
                    onClose={closeModal}
                />
            )}

            <h1 style={{ marginBottom: '20px', color: '#333' }}>Interview Link Generator</h1>

            <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label htmlFor="job-select" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Job</label>
                    <select
                        id="job-select"
                        value={selectedJob}
                        onChange={handleJobChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        <option value="">-- Select a Job --</option>
                        {jobs.map(job => (
                            <option key={job.jobId} value={job.jobId}>
                                {job.jobTitle}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedJob && (
                    <>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="scheduled-date" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Scheduled Interview Date</label>
                            <input
                                type="date"
                                id="scheduled-date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={today}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="candidate-search" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Search Candidates</label>
                            <input
                                type="text"
                                id="candidate-search"
                                value={searchTerm}
                                onChange={handleSearch}
                                placeholder="Search by name or email"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>Candidates</h3>
                                <button
                                    onClick={handleSelectAll}
                                    style={{
                                        background: '#ef402d',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {selectedApplications.length === filteredApplications.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            {filteredApplications.length === 0 ? (
                                <p>No eligible candidates found for this job.</p>
                            ) : (
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                                                <th style={{ padding: '12px', textAlign: 'left', width: '50px' }}>Select</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredApplications.map((application) => (
                                                <tr
                                                    key={application.applicationId}
                                                    style={{
                                                        borderBottom: '1px solid #eee',
                                                        background: selectedApplications.includes(application.applicationId) ? '#fff8f8' : 'white'
                                                    }}
                                                >
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedApplications.includes(application.applicationId)}
                                                            onChange={() => handleApplicationSelect(application.applicationId)}
                                                            style={{ width: '18px', height: '18px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {application.extractedText?.applicant_name || 'Unknown Name'}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {application.extractedText?.applicant_mail || 'No email available'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button
                                onClick={generateLinks}
                                disabled={selectedApplications.length === 0 || !scheduledDate}
                                style={{
                                    background: selectedApplications.length === 0 || !scheduledDate ? '#ccc' : '#ef402d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '4px',
                                    cursor: selectedApplications.length === 0 || !scheduledDate ? 'not-allowed' : 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                Generate Interview Links
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default InterviewLinkGenerator;