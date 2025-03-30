import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import '../pageloading.css'; // Import the loading animation CSS
import UploadMoreCVModal from '../UploadMoreCVModal';
import RankApplicantsModal from '../RankApplicantsModal';

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

// Helper function to format dates consistently throughout the application
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

export default function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedJob, setEditedJob] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [jobDetailLoading, setJobDetailLoading] = useState(false);  // <-- New state for job details loading
    const [rankDetailLoading, setRankDetailLoading] = useState(false);  // <-- New state for rank details loading   
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showRankErrorModal, setShowRankErrorModal] = useState(false);
    const [showRankSuccessModal, setShowRankSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const descriptionTextareaRef = useRef(null); // Add reference for the textarea
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [rankPrompt, setRankPrompt] = useState("");
    const [processedJobId, setProcessedJobId] = useState("");  // <-- New state for processed job ID
    const [filterStatus, setFilterStatus] = useState('all'); // New state for filter dropdown
    const [jobDetailsExpanded, setJobDetailsExpanded] = useState(true); // New state for collapsible section

    // Add state for department and skill editing
    const [departmentInput, setDepartmentInput] = useState("");
    const [departmentSuggestions, setDepartmentSuggestions] = useState([]);
    const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);

    const [skillInput, setSkillInput] = useState("");
    const [skillSuggestions, setSkillSuggestions] = useState([]);
    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

    // Sample data for suggestions - wrapped in useMemo to avoid recreation on each render
    const departmentOptions = useMemo(() => [
        "Engineering", "Information Technology", "Marketing", "Finance", "Human Resources",
        "Sales", "Operations", "Customer Support", "Research & Development", "Legal",
        "Administration", "Design", "Product Management", "Business Development", "Data Science"
    ], []);

    const skillsOptions = useMemo(() => [
        "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "AWS", "Docker",
        "DevOps", "Machine Learning", "Data Analysis", "Agile", "Scrum",
        "Project Management", "UI/UX Design", "TypeScript", "Go", "Ruby",
        "Communication", "Leadership", "Problem Solving", "C#", "PHP", "Angular",
        "Vue.js", "MongoDB", "GraphQL", "REST API", "Git"
    ], []);

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

    // Add state for Upload CV modal
    const [showUploadCVModal, setShowUploadCVModal] = useState(false);

    // Add state for RankApplicantsModal
    const [showRankApplicantsModal, setShowRankApplicantsModal] = useState(false);

    // Get location to check for state from navigation
    const location = useLocation();
    const navigate = useNavigate();

    // Extract URL parameters
    const queryParams = new URLSearchParams(location.search);
    const urlJobId = queryParams.get('jobId');

    // Check for direct navigation state from AddInterviewQuestions
    const directNavigation = location.state?.directToJobDetails;
    const stateJobId = location.state?.jobId;

    // Combined job ID from either source, with state taking priority
    const targetJobId = stateJobId || urlJobId;

    // On first render, if we have state, clear it from history
    // to prevent issues on page refresh
    useEffect(() => {
        if (location.state?.directToJobDetails) {
            // Replace the current URL without the state to keep the URL clean
            navigate(location.pathname + (targetJobId ? `?jobId=${targetJobId}` : ''),
                { replace: true, state: {} });
        }
    }, []);

    // Fetch jobs when component mounts
    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('http://localhost:8000/api/jobs'); // FIXED: updated to /api/jobs
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const dbJobs = await response.json();
                setJobs(dbJobs); // Assuming dbJobs is an array of job objects

                // If there's a jobId in URL or state, select that job automatically
                // We use the combined targetJobId here
                if (targetJobId && dbJobs.length > 0) {
                    setJobDetailLoading(true); // Show loading state immediately

                    const jobToSelect = dbJobs.find(job => job.jobId === targetJobId);
                    if (jobToSelect) {
                        // If coming from interview questions page via direct navigation,
                        // let's select the job right away to avoid the glitch
                        if (directNavigation) {
                            setSelectedJob(jobToSelect);
                            setEditedJob(jobToSelect);
                            fetchApplicants(jobToSelect.jobId).then(() => {
                                setJobDetailLoading(false);
                            });
                        } else {
                            // Otherwise use the original delayed approach
                            handleJobSelect(jobToSelect);
                        }
                    } else {
                        setJobDetailLoading(false);
                    }
                }

                setIsLoading(false);
            } catch (err) {
                setError("Failed to fetch jobs. Please try again.");
                setIsLoading(false);
                console.error("Error fetching jobs:", err);
            }
        };
        fetchJobs();
    }, [targetJobId, directNavigation]); // Add dependencies

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

    const filteredApplicants = useMemo(() => {
        if (filterStatus === 'all') {
            return applicants;
        }
        return applicants.filter(applicant => {
            const status = (applicant.status || '').toLowerCase();
            switch (filterStatus) {
                case 'approved':
                    return status === 'approved';
                case 'interview-scheduled':  // Add new case for interview scheduled
                    return status === 'interview scheduled';
                case 'interview-completed':
                    return status === 'interview completed';
                case 'accepted':
                    return status === 'accepted';
                case 'new':
                    return status === 'new' || !status;
                case 'rejected':
                    return status === 'rejected';
                default:
                    return true;
            }
        });
    }, [applicants, filterStatus]);

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
            // Fix the API endpoint to match the backend API structure
            const response = await fetch(`http://localhost:8000/api/candidates/applicants?jobId=${jobId}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            const applicantsData = await response.json();

            // Create two arrays: applicants with scores and those without
            const applicantsWithScores = applicantsData.filter(
                applicant => applicant.rank_score && typeof applicant.rank_score.final_score === 'number'
            );
            const applicantsWithoutScores = applicantsData.filter(
                applicant => !applicant.rank_score || typeof applicant.rank_score.final_score !== 'number'
            );

            // Sort applicants with scores in descending order
            const sortedApplicantsWithScores = [...applicantsWithScores].sort(
                (a, b) => b.rank_score.final_score - a.rank_score.final_score
            );

            // Merge the sorted applicants with the unsorted ones
            const mergedApplicants = [...sortedApplicantsWithScores, ...applicantsWithoutScores];

            setApplicants(mergedApplicants);
        } catch (err) {
            console.error("Error fetching applicants:", err);
            setApplicants([]);  // Set empty array on error to prevent undefined issues
        }
    };

    const fetchUnscoredApplicants = async (jobId) => {
        try {
            // Fix the API endpoint to match the backend API structure
            const response = await fetch(`http://localhost:8000/api/candidates/applicants?jobId=${jobId}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            const applicantsData = await response.json();

            const applicantsWithoutScores = applicantsData.filter(
                applicant => !applicant.rank_score || typeof applicant.rank_score.final_score !== 'number'
            );

            return applicantsWithoutScores;
        } catch (err) {
            console.error("Error fetching applicants:", err);
            setApplicants([]);  // Set empty array on error to prevent undefined issues
        }
    };

    // Fetch applicants for a selected job from the backend API
    const fetchJob = async (jobId) => {
        try {
            // Fetch the latest job data to ensure we have the most up-to-date information
            const jobResponse = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
            if (!jobResponse.ok) {
                throw new Error(`Failed to fetch updated job data: ${jobResponse.status}`);
            }
            const updatedJobData = await jobResponse.json();
            console.log("Fetched updated job data:", updatedJobData);

            // Update the selectedJob and editedJob with the latest data from backend
            setSelectedJob(updatedJobData);
            setEditedJob(updatedJobData);

            // Update the job in the jobs array as well
            setJobs(prevJobs => prevJobs.map(job =>
                job.jobId === updatedJobData.jobId ? updatedJobData : job
            ));
        } catch (err) {
            console.error("Error fetching job data:", err);
        }
    };

    const scoreApplicants = async (unscoredApplicants) => {
        try {
            // Rank new applicants based on the existing prompt
            const response = await fetch(`http://localhost:8000/api/candidates/rank`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: selectedJob.prompt,
                    applicants: unscoredApplicants,
                    job_document: selectedJob
                })
            });

            // Handle potential network or server errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || `Ranking request failed: ${response.statusText}`);
            }

            // Parse applicant results
            const scoredApplicants = await response.json();

            return scoredApplicants;

        } catch (err) {
            console.error("Error fetching job data:", err);
        }
    };

    // Modify handleJobSelect to reset modal message when selecting a job
    const handleJobSelect = (job) => {
        setJobDetailLoading(true);
        // Reset modal message to ensure we don't show stale messages
        setModalMessage("Loading job details...");
<<<<<<< Updated upstream
        
=======

>>>>>>> Stashed changes
        // Introduce a short delay to display the loading effect
        setTimeout(() => {
            setSelectedJob(job);
            setEditedJob(job);
            fetchApplicants(job.jobId).then(() => {
                setJobDetailLoading(false);
            });
        }, 300);
    };

    // Modify handleBackToJobs to reset modal message when going back to jobs list
    const handleBackToJobs = () => {
        setJobDetailLoading(true);
        // Reset modal message to ensure we don't show stale messages
        setModalMessage("Returning to job list...");
<<<<<<< Updated upstream
        
=======

>>>>>>> Stashed changes
        setTimeout(() => {
            setSelectedJob(null);
            setIsEditing(false);
            setApplicants([]);
            setJobDetailLoading(false);
            // Clear modal message completely once we're back to the job list
            setModalMessage("");
        }, 300);
    };

    // Modify handleEditToggle to ensure job details are expanded when editing
    const handleEditToggle = () => {
        // If we're starting to edit
        if (!isEditing) {
            // Reset the state to the current job data
            setEditedJob(selectedJob);

            // Clear any pending input in department and skill fields
            setDepartmentInput("");
            setSkillInput("");
            
            // Ensure job details section is expanded when editing starts
            setJobDetailsExpanded(true);

            // Ensure job details section is expanded when editing starts
            setJobDetailsExpanded(true);

            // Schedule the textarea resize after render
            setTimeout(() => {
                adjustTextareaHeight();
            }, 0);
        }

        setIsEditing(!isEditing);
    };

    // Function to adjust textarea height based on content
    const adjustTextareaHeight = () => {
        if (descriptionTextareaRef.current) {
            descriptionTextareaRef.current.style.height = 'auto';
            descriptionTextareaRef.current.style.height = `${descriptionTextareaRef.current.scrollHeight}px`;
        }
    };

    // Ensure the handleSaveChanges function properly formats the data before sending
    const handleSaveChanges = async () => {
        try {
            // Ensure minimumCGPA is formatted to 2 decimal places
            const updatedJobData = {
                ...editedJob,
                minimumCGPA: Number(parseFloat(editedJob.minimumCGPA).toFixed(2)),
                requiredSkills: editedJob.requiredSkills || []
            };

            console.log("Sending job update:", updatedJobData);

            const response = await fetch(`http://localhost:8000/api/jobs/${updatedJobData.jobId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedJobData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(errorData.detail || "Failed to update job");
            }

            const updatedJob = await response.json();
            console.log("Received updated job:", updatedJob); // Debug: check what we received back

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

        // Adjust height when job description changes
        if (name === 'jobDescription' && descriptionTextareaRef.current) {
            setTimeout(() => adjustTextareaHeight(), 0);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSearchCategory(e.target.value);
    };

    // Add new handler for "Upload More CV"
    const handleUploadMoreCV = () => {
        setShowUploadCVModal(true);
    };

    // Handle upload complete event
    const handleUploadComplete = async (count) => {
        try {
            // Close the upload CV modal first
            setShowUploadCVModal(false);

            // Set loading view only if there are new CVs uploaded
            if (count > 0) {
                // Always show the loading screen during uploads - important for all processing
                setRankDetailLoading(true);
                setModalMessage(`Processing ${count} new CV${count !== 1 ? 's' : ''}...`);

                // Update job and applicants list
                await fetchJob(selectedJob.jobId);
                await fetchApplicants(selectedJob.jobId);

                // Check if the job has ranking criteria set up
                const hasRankingSetup = selectedJob.rank_weight !== null &&
                    selectedJob.prompt &&
                    selectedJob.prompt.trim() !== "";

                // Only do the ranking if there's a ranking setup
                if (hasRankingSetup) {
                    const unscoredApplicants = await fetchUnscoredApplicants(selectedJob.jobId);

                    // Only process ranking if there are unscored applicants
                    if (unscoredApplicants && unscoredApplicants.length > 0) {
                        setModalMessage(`Ranking ${unscoredApplicants.length} new candidate${unscoredApplicants.length !== 1 ? 's' : ''}...`);

                        // Score the new applicants
                        const scoredApplicants = await scoreApplicants(unscoredApplicants);

                        // Update candidate rankings if available
                        if (scoredApplicants && scoredApplicants.applicants && scoredApplicants.applicants.length > 0) {
                            const updatePromises = scoredApplicants.applicants.map(applicant => {
                                if (applicant.candidateId) {
                                    return fetch(`http://localhost:8000/api/candidates/candidate/${applicant.candidateId}`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            ...applicant,
                                            rank_score: applicant.rank_score,
                                            reasoning: applicant.reasoning,
                                            job_id: selectedJob.jobId
                                        })
                                    });
                                }
                                return Promise.resolve();
                            });

                            // Wait for all updates to complete
                            await Promise.all(updatePromises);
                        }

                        // Fetch the updated applicants list with new rankings
                        await fetchApplicants(selectedJob.jobId);
                    }
                }

                // Update the local job object with the new application count
                const updatedJob = {
                    ...selectedJob,
                    applicationCount: (selectedJob.applicationCount || 0) + count
                };

                // Update the job in both selectedJob and jobs array
                setSelectedJob(updatedJob);
                setJobs(prevJobs => prevJobs.map(job =>
                    job.jobId === updatedJob.jobId ? updatedJob : job
                ));

                // Show success message
                const successMessage = hasRankingSetup
                    ? `${count} new CV${count !== 1 ? 's' : ''} uploaded and ranked successfully.`
                    : `${count} new CV${count !== 1 ? 's' : ''} uploaded successfully.`;

                setModalMessage(successMessage);
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error("Error processing uploaded CVs:", error);
            setModalMessage(`Error processing new CVs: ${error.message}`);
            setShowErrorModal(true);
        } finally {
            // Set loading state to false
            setRankDetailLoading(false);
        }
    };

    // Handle scoring applicants when they are not scored but others are
    const handleUnscoredApplicants = async () => {
        // This function is now handled directly within handleUploadComplete
        // We'll keep it for backward compatibility and other use cases
    };

    // Add modal message reset to handleRankApplicants
    const handleRankApplicants = () => {
        // Reset any stale messages
        setModalMessage("");
        setShowRankApplicantsModal(true);
    };

    const handlePromptComplete = async (prompt) => {
        // Close the modal first
        setShowRankApplicantsModal(false);

        try {
            // Start loading state for AI processing
            setRankDetailLoading(true);

            // Reset any previous error states
            setModalMessage(null);
            setShowRankErrorModal(false);
            setShowRankSuccessModal(false);

            // Fetch applicants and job data to ensure latest information
            await fetchApplicants(selectedJob.jobId);
            await fetchJob(selectedJob.jobId);

            // Validate input
            if (!selectedJob || !prompt) {
                throw new Error("Missing job or ranking prompt");
            }

            // Check if this is a new prompt or a repeat
            // Check if the current prompt's content is significantly different from the previous prompt
            // by checking if the key terms are included, regardless of order
            const hasSignificantPromptChange = () => {
                if (!rankPrompt || !prompt) return true; // If either is empty, consider it a change

                // Convert both prompts to lowercase for case-insensitive comparison
                const currentPromptLower = prompt.toLowerCase();
                const previousPromptLower = rankPrompt.toLowerCase();

                // Create arrays of significant terms from each prompt
                const currentTerms = currentPromptLower.split(/[,\s]+/).filter(term => term.length > 2);
                const previousTerms = previousPromptLower.split(/[,\s]+/).filter(term => term.length > 2);

                // Check if all significant terms from current prompt exist in previous prompt and vice versa
                const allCurrentTermsInPrevious = currentTerms.every(term =>
                    previousTerms.some(prevTerm => prevTerm.includes(term) || term.includes(prevTerm))
                );
<<<<<<< Updated upstream
                const allPreviousTermsInCurrent = previousTerms.every(prevTerm => 
=======
                const allPreviousTermsInCurrent = previousTerms.every(prevTerm =>
>>>>>>> Stashed changes
                    currentTerms.some(currTerm => currTerm.includes(prevTerm) || prevTerm.includes(currTerm))
                );

                // Consider it the same prompt if terms match in both directions
                return !(allCurrentTermsInPrevious && allPreviousTermsInCurrent);
            };

            // Only process if the prompt has significantly changed or we're processing a different job
            if (hasSignificantPromptChange() || selectedJob.jobId !== processedJobId) {
                // Send ranking request to backend
                const response = await fetch(`http://localhost:8000/api/candidates/rank`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        applicants: applicants,
                        job_document: selectedJob
                    })
                });

                // Handle potential network or server errors
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                    throw new Error(errorData.detail || `Ranking request failed: ${response.statusText}`);
                }

                // Parse ranking results
                const rankingResults = await response.json();

                // Validate ranking results
                if (!rankingResults) {
                    throw new Error("Invalid ranking results received");
                }

                // Update job with new prompt
                await fetch(`http://localhost:8000/api/jobs/${selectedJob.jobId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...selectedJob,
                        prompt: prompt
                    })
                });

                // Update candidate rankings if available
                if (rankingResults.applicants && rankingResults.applicants.length > 0) {
                    for (const applicant of rankingResults.applicants) {
                        if (applicant.candidateId) {
                            await fetch(`http://localhost:8000/api/candidates/candidate/${applicant.candidateId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    ...applicant,
                                    rank_score: applicant.rank_score,
                                    reasoning: applicant.reasoning,
                                    job_id: selectedJob.jobId
                                })
                            });
                        }
                    }

                    // Update local applicants state
                    setApplicants(rankingResults.applicants);
                }

                // Store the new ranking prompt
                setRankPrompt(prompt);

                // Store the processed job id
                setProcessedJobId(selectedJob.jobId);

                // Show success message
                setModalMessage("Applicants have been ranked based on your criteria.");
                setShowRankSuccessModal(true);
            } else {
                // Same prompt used again for the same job
                setModalMessage("Using existing ranking based on the same criteria.");
                setShowRankSuccessModal(true);
            }
<<<<<<< Updated upstream
            
            // Reload job data to update the UI with new ranking criteria
            await fetchJob(selectedJob.jobId);
            await fetchApplicants(selectedJob.jobId);
            
=======

            // Reload job data to update the UI with new ranking criteria
            await fetchJob(selectedJob.jobId);
            await fetchApplicants(selectedJob.jobId);

>>>>>>> Stashed changes
        } catch (error) {
            // Centralized error handling
            console.error("Error in ranking applicants:", error);
            setModalMessage(`Failed to rank applicants: ${error.message}`);
            setShowRankErrorModal(true);
        } finally {
            // Ensure loading state is always turned off
            setRankDetailLoading(false);
        }
    };

    const handleMinimumCGPABlur = () => {
        const value = parseFloat(editedJob.minimumCGPA);
        if (!isNaN(value)) {
            setEditedJob({ ...editedJob, minimumCGPA: Number(value.toFixed(2)) });
        }
    };

    // Add reset to handleInterviewQuestionsClick
    const handleInterviewQuestionsClick = () => {
        // Set loading state
        setJobDetailLoading(true);
<<<<<<< Updated upstream
        
        // Set a fresh message specific to this action
        setModalMessage("Loading interview questions...");
        
=======

        // Set a fresh message specific to this action
        setModalMessage("Loading interview questions...");

>>>>>>> Stashed changes
        // Use a longer timeout to ensure the loading state and message are fully visible
        setTimeout(() => {
            navigate(`/add-interview-questions?jobId=${selectedJob.jobId}`);
        }, 300);
    };

    // Add a cleanup function to reset the modal message when the component unmounts
    useEffect(() => {
        return () => {
            // Clean up modal messages when component unmounts
            setModalMessage("");
        };
    }, []);

    // Also reset modal messages when specific modals are closed
    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setModalMessage("");
    };

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
        setModalMessage("");
    };

    const handleCloseRankSuccessModal = () => {
        setShowRankSuccessModal(false);
        setModalMessage("");
    };

    const handleCloseRankErrorModal = () => {
        setShowRankErrorModal(false);
        setModalMessage("");
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
                <h3 className="status-title">{"Job Updated Successfully!"}</h3>
                <p className="status-description">{modalMessage || "Your changes have been saved."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={handleCloseSuccessModal}>
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
                <h3 className="status-title">{"Update Failed!"}</h3>
                <p className="status-description">{modalMessage || "Failed to update job details."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={handleCloseErrorModal}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    const RankSuccessModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal success-modal">
                <div className="status-icon success-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 className="status-title">{"Rank Successful!"}</h3>
                <p className="status-description">{modalMessage || "Applicants have been ranked according to the prompt."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={handleCloseRankSuccessModal}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    const RankErrorModal = () => (
        <div className="status-modal-overlay" role="dialog" aria-modal="true">
            <div className="status-modal error-modal">
                <div className="status-icon error-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 className="status-title">{"Rank Failed!"}</h3>
                <p className="status-description">{modalMessage || "Failed to rank applicants."}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={handleCloseRankErrorModal}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    // Create the confirmation modal component
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
                <p className="status-description">Are you sure you want to discard your unsaved changes?</p>
                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={handleCancelDiscard}>
                        No, Keep Editing
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmDiscard}>
                        Yes, Discard Changes
                    </button>
                </div>
            </div>
        </div>
    );

    // Function to check if any changes were made to the job
    const hasChanges = () => {
        if (!selectedJob || !editedJob) return false;

        // Check basic fields
        if (selectedJob.jobTitle !== editedJob.jobTitle) return true;
        if (selectedJob.jobDescription !== editedJob.jobDescription) return true;
        if (selectedJob.minimumCGPA !== editedJob.minimumCGPA) return true;

        // Check arrays (departments and skills)
        if (selectedJob.departments.length !== editedJob.departments.length) return true;
        if (selectedJob.requiredSkills.length !== editedJob.requiredSkills.length) return true;

        // Check if departments have changed
        for (let i = 0; i < selectedJob.departments.length; i++) {
            if (!editedJob.departments.includes(selectedJob.departments[i])) return true;
        }

        // Check if required skills have changed
        for (let i = 0; i < selectedJob.requiredSkills.length; i++) {
            if (!editedJob.requiredSkills.includes(selectedJob.requiredSkills[i])) return true;
        }

        return false;
    };

    const handleCancelClick = () => {
        if (hasChanges()) {
            setShowConfirmModal(true);
        } else {
            // No changes, just exit edit mode
            handleCancelEdit();
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedJob(selectedJob); // Reset changes to original job
        setDepartmentInput("");
        setSkillInput("");
    };

    const handleConfirmDiscard = () => {
        setShowConfirmModal(false);
        handleCancelEdit();
    };

    const handleCancelDiscard = () => {
        setShowConfirmModal(false);
        // Stay in edit mode, do nothing
    };

    // Filter suggestions based on input
    useEffect(() => {
        if (departmentInput && isEditing) {
            const filtered = departmentOptions.filter(
                option => option.toLowerCase().includes(departmentInput.toLowerCase())
            );
            setDepartmentSuggestions(filtered);
            setShowDepartmentSuggestions(filtered.length > 0);
        } else {
            setShowDepartmentSuggestions(false);
        }
    }, [departmentInput, departmentOptions, isEditing]);

    useEffect(() => {
        if (skillInput && isEditing) {
            const filtered = skillsOptions.filter(
                option => option.toLowerCase().includes(skillInput.toLowerCase())
            );
            setSkillSuggestions(filtered);
            setShowSkillSuggestions(filtered.length > 0);
        } else {
            setShowSkillSuggestions(false);
        }
    }, [skillInput, skillsOptions, isEditing]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.suggestion-container')) {
                setShowDepartmentSuggestions(false);
                setShowSkillSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Department handlers
    const handleDepartmentSelect = (department) => {
        if (!editedJob.departments.includes(department)) {
            setEditedJob({
                ...editedJob,
                departments: [...editedJob.departments, department]
            });
        }
        setDepartmentInput("");
        setShowDepartmentSuggestions(false);
    };

    const handleAddDepartment = () => {
        if (departmentInput.trim() && !editedJob.departments.includes(departmentInput.trim())) {
            setEditedJob({
                ...editedJob,
                departments: [...editedJob.departments, departmentInput.trim()]
            });
            setDepartmentInput("");
        }
    };

    const handleDepartmentKeyPress = (e) => {
        if (e.key === 'Enter' && departmentInput.trim()) {
            e.preventDefault();
            handleAddDepartment();
        }
    };

    const removeDepartment = (department) => {
        setEditedJob({
            ...editedJob,
            departments: editedJob.departments.filter(dept => dept !== department)
        });
    };

    // Skill handlers
    const handleSkillSelect = (skill) => {
        if (!editedJob.requiredSkills.includes(skill)) {
            const updatedSkills = [...editedJob.requiredSkills, skill];
            setEditedJob({
                ...editedJob,
                requiredSkills: updatedSkills
            });
        }
        setSkillInput("");
        setShowSkillSuggestions(false);
    };

    const handleAddSkill = () => {
        if (skillInput.trim() && !editedJob.requiredSkills.includes(skillInput.trim())) {
            const updatedSkills = [...editedJob.requiredSkills, skillInput.trim()];
            setEditedJob({
                ...editedJob,
                requiredSkills: updatedSkills
            });
            setSkillInput("");
        }
    };

    const handleSkillKeyPress = (e) => {
        if (e.key === 'Enter' && skillInput.trim()) {
            e.preventDefault();
            handleAddSkill();
        }
    };

    const removeSkill = (skill) => {
        const updatedSkills = editedJob.requiredSkills.filter(s => s !== skill);
        setEditedJob({
            ...editedJob,
            requiredSkills: updatedSkills
        });
        console.log("After removing skill:", editedJob.requiredSkills); // Debug logging
    };

    // Add function to toggle job details visibility
    const toggleJobDetails = () => {
        setJobDetailsExpanded(!jobDetailsExpanded);
    };

    if (isLoading) {
        return (
            <div className="dashboard-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80vh',
                backgroundColor: 'rgb(255, 255, 255)'
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
                minHeight: '80vh',
                backgroundColor: 'rgb(255, 255, 255)'
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px', fontSize: '1.1rem', fontWeight: '500' }}>
                        {modalMessage || "Loading job details..."}
                    </p>
                </div>
            </div>
        );
    }

    // Add loading state for rank details view
    if (selectedJob && rankDetailLoading) {
        return (
            <div className="dashboard-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80vh',
                backgroundColor: 'rgb(255, 255, 255)'
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px', fontSize: '1.1rem', fontWeight: '500' }}>
                        {modalMessage || "Processing candidates..."}
                    </p>
                    <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                        This may take a moment as we analyze and rank the new candidates
                    </p>
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
            {showRankSuccessModal && <RankSuccessModal />}
            {showRankErrorModal && <RankErrorModal />}
            {showConfirmModal && <ConfirmModal />}
            {showUploadCVModal && (
                <UploadMoreCVModal  // Updated component name
                    isOpen={showUploadCVModal}
                    onClose={() => setShowUploadCVModal(false)}
                    jobId={selectedJob?.jobId}
                    jobTitle={selectedJob?.jobTitle}
                    onUploadComplete={handleUploadComplete}
                />
            )}
            {showRankApplicantsModal && (
                <RankApplicantsModal
                    isOpen={showRankApplicantsModal}
                    onClose={() => setShowRankApplicantsModal(false)}
                    jobId={selectedJob?.jobId}
                    jobTitle={selectedJob?.jobTitle}
                    onSubmit={handlePromptComplete}
                    currentPrompt={selectedJob?.prompt || ""}
                />
            )}
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
                        Back
                    </button>
                    <div className="job-detail-header">
                        <h2>{selectedJob.jobTitle}</h2>
                        <div className="job-actions">
                            {!isEditing ? (
                                <>
                                    <button className="edit-job-button" onClick={handleEditToggle}>
                                        Edit Job
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="cancel-button"
                                        onClick={handleCancelClick}
                                    >
                                        Cancel
                                    </button>
                                    <button className="edit-job-button" onClick={handleSaveChanges}>
                                        Save Changes
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="job-detail-content">
                        <div className="job-info-container">
<<<<<<< Updated upstream
                            <div className={`collapsible-header ${!jobDetailsExpanded ? 'collapsed' : ''}`} 
                                 onClick={toggleJobDetails}>
=======
                            <div className={`collapsible-header ${!jobDetailsExpanded ? 'collapsed' : ''}`}
                                onClick={toggleJobDetails}>
>>>>>>> Stashed changes
                                <h3>
                                    Job Details
                                    <div className="collapse-icon">
                                        {jobDetailsExpanded ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="18 15 12 9 6 15"></polyline>
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                </h3>
<<<<<<< Updated upstream
                                
=======

>>>>>>> Stashed changes
                                {!isEditing && (
                                    <div className="header-actions">
                                        <button
                                            className="interview-questions-button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent toggling when clicking the button
                                                handleInterviewQuestionsClick();
                                            }}
                                        >
                                            Interview Questions
                                        </button>
                                    </div>
                                )}
                            </div>

                            {jobDetailsExpanded && (
                                <>
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
                                                    ref={descriptionTextareaRef}
                                                    className="auto-resize-textarea"
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

                                            {/* Editable departments field */}
                                            <div className="form-group">
                                                <label>Departments</label>
                                                <div className="suggestion-container">
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={departmentInput}
                                                            onChange={(e) => setDepartmentInput(e.target.value)}
                                                            onKeyPress={handleDepartmentKeyPress}
                                                            placeholder="Enter a department"
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    setShowDepartmentSuggestions(false);
                                                                }, 200);
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="add-button"
                                                            onClick={handleAddDepartment}
                                                            disabled={!departmentInput.trim()}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {showDepartmentSuggestions && (
                                                        <ul className="suggestions-list">
                                                            {departmentSuggestions.map((suggestion, index) => (
                                                                <li
                                                                    key={index}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleDepartmentSelect(suggestion);
                                                                    }}
                                                                >
                                                                    {suggestion}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                {editedJob.departments && editedJob.departments.length > 0 && (
                                                    <div className="tags-container departments-container">
                                                        {editedJob.departments.map((department, index) => (
                                                            <div key={index} className="tag">
                                                                {department}
                                                                <button
                                                                    type="button"
                                                                    className="tag-remove"
                                                                    onClick={() => removeDepartment(department)}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Editable required skills field */}
                                            <div className="form-group">
                                                <label>Required Skills</label>
                                                <div className="suggestion-container">
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={skillInput}
                                                            onChange={(e) => setSkillInput(e.target.value)}
                                                            onKeyPress={handleSkillKeyPress}
                                                            placeholder="Enter a skill"
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    setShowSkillSuggestions(false);
                                                                }, 200);
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="add-button"
                                                            onClick={handleAddSkill}
                                                            disabled={!skillInput.trim()}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {showSkillSuggestions && (
                                                        <ul className="suggestions-list">
                                                            {skillSuggestions.map((suggestion, index) => (
                                                                <li
                                                                    key={index}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleSkillSelect(suggestion);
                                                                    }}
                                                                >
                                                                    {suggestion}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                {editedJob.requiredSkills && editedJob.requiredSkills.length > 0 && (
                                                    <div className="tags-container skills-container">
                                                        {editedJob.requiredSkills.map((skill, index) => (
                                                            <div key={index} className="tag">
                                                                {skill}
                                                                <button
                                                                    type="button"
                                                                    className="tag-remove"
                                                                    onClick={() => removeSkill(skill)}
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="job-info">
                                            <div className="info-columns">
                                                <div className="info-column">
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
                                                </div>

                                            </div>

                                            <div className="info-group description-group">
                                                <p className="info-label">Description:</p>
                                                <p className="info-value">{selectedJob.jobDescription}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="job-info-container">
                            <div className="applicants-header">
                                <h3>Applicants ({filteredApplicants.length})</h3>
                                {!isEditing && (
                                    <div className="applicants-actions">
                                        <div className="filter-container">
                                            <select
                                                className="filter-select"
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                            >
                                                <option value="all">All Applicants</option>
                                                <option value="approved">Approved Applicants</option>
                                                <option value="interview-scheduled">Interview Scheduled</option>
                                                <option value="interview-completed">Completed Interviews</option>
                                                <option value="accepted">Accepted Applicants</option>
                                                <option value="new">New Applicants</option>
                                                <option value="rejected">Rejected Applicants</option>
                                            </select>
                                        </div>
<<<<<<< Updated upstream
                                        
                                        <button className="rank-button" onClick={handleRankApplicants}>
                                            <svg className="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 15L8.5 10L15.5 10L12 15Z" fill="currentColor"/>
                                                <path d="M7 5H17L21 9L12 20L3 9L7 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M12 20V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M12 8V8.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
=======

                                        <button className="rank-button" onClick={handleRankApplicants}>
                                            <svg className="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 15L8.5 10L15.5 10L12 15Z" fill="currentColor" />
                                                <path d="M7 5H17L21 9L12 20L3 9L7 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 20V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M12 8V8.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
>>>>>>> Stashed changes
                                            </svg>
                                            {selectedJob.prompt ? "Rerank Applicants with AI" : "Rank Applicants with AI"}
                                        </button>

                                        <button className="upload-more-cv-button" onClick={handleUploadMoreCV}>
                                            Upload More CV
                                        </button>
                                    </div>
                                )}
                            </div>

                            {filteredApplicants.length === 0 ? (
                                <div className="no-applicants">
                                    <p>No applications have been received for this job yet.</p>
                                </div>
                            ) : (
                                <div className="applicants-list">
<<<<<<< Updated upstream
<<<<<<< HEAD
=======
>>>>>>> Stashed changes
                                    {/* Ranking status title - new element */}
                                    <div className="ranking-status-container">
                                        {selectedJob.prompt ? (
                                            <h3 className="ranking-status ranked">
                                                Ranked by: <span className="ranking-criteria">{selectedJob.prompt}</span>
                                            </h3>
                                        ) : (
                                            <h3 className="ranking-status unranked">Unranked Applicants</h3>
                                        )}
<<<<<<< Updated upstream
=======
                                    {filteredApplicants.length === 1 && (
                                        /* Single applicant layout - only middle position */
                                        <div key={filteredApplicants[0].candidateId} className="applicant-card">
                                            <div className="applicant-rank-info">
                                                <div className="rank-number">
                                                    <span className="rank-circle">1</span>
                                                </div>
                                                <div className="applicant-info">
                                                    <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                </div>
                                            </div>

                                            <div className="applicant-status-actions">
                                                <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                    {filteredApplicants[0].status || 'new'}
                                                </span>
                                                <div className="rank-score-container">
                                                    <span className="rank-score-label">Score: </span>
                                                    <span className="rank-score-value">
                                                        {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                            ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                            : "N/A"}
                                                    </span>
                                                </div>
                                                <div className="button-container">
                                                    {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                        <button
                                                            className="view-responses-button"
                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                        >
                                                            Interview Responses
                                                        </button>
                                                    )}
                                                    <button
                                                        className="view-profile-button"
                                                        onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                    >
                                                        Full Profile
                                                    </button>
                                                    {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                        <button
                                                            className="view-responses-button"
                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                        >
                                                            Interview Responses
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="top-applicants-container">
                                        <div className="top-three-applicants">
                                            <div className="top-applicants-row">
                                                {/* Display different layouts based on number of applicants */}
                                                {filteredApplicants.length === 2 && (
                                                    /* Two applicants layout - position 1 and 2 */
                                                    <>
                                                        {/* First applicant */}
                                                        <div className="applicant-card top-applicant-card" style={{ flex: '1' }}>
                                                            <div className="rank-number-container">
                                                                <div className="rank-number">
                                                                    <span className="rank-circle">1</span>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-info">
                                                                    <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-status-actions-2">
                                                                    <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                                        {filteredApplicants[0].status || 'new'}
                                                                    </span>
                                                                    <div className="rank-score-container">
                                                                        <span className="rank-score-label">Score: </span>
                                                                        <span className="rank-score-value">
                                                                            {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                                ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                            {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                                ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="button-container">
                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="view-profile-button"
                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                                        >
                                                                            Full Profile
                                                                        </button>
                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Second applicant */}
                                                        <div className="applicant-card top-applicant-card" style={{ flex: '1' }}>
                                                            <div className="rank-number-container">
                                                                <div className="rank-number">
                                                                    <span className="rank-circle">2</span>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-info">
                                                                    <h4>{renderApplicantID(filteredApplicants[1])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[1]))}</p>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-status-actions-2">
                                                                    <span className={`status-badge ${filteredApplicants[1].status || 'new'}`}>
                                                                        {filteredApplicants[1].status || 'new'}
                                                                    </span>
                                                                    <div className="rank-score-container">
                                                                        <span className="rank-score-label">Score: </span>
                                                                        <span className="rank-score-value">
                                                                            {filteredApplicants[1].rank_score && filteredApplicants[1].rank_score.final_score
                                                                                ? filteredApplicants[1].rank_score.final_score.toFixed(2)
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="button-container">
                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'approved' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="view-profile-button"
                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}`)}
                                                                        >
                                                                            Full Profile
                                                                        </button>
                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'interview completed' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {filteredApplicants.length >= 3 && (
                                                    /* Three or more applicants - show top 3 */
                                                    <>
                                                        {/* First applicant - displayed first */}
                                                        <div className="applicant-card top-applicant-card">
                                                            <div className="rank-number-container">
                                                                <div className="rank-number">
                                                                    <span className="rank-circle">1</span>
                                                                </div>
                                                            </div>

                                                            <div className="applicant-content-container">
                                                                <div className="applicant-info">
                                                                    <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                                </div>
                                                            </div>

                                                            <div className="applicant-content-container">
                                                                <div className="applicant-status-actions-2">
                                                                    <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                                        {filteredApplicants[0].status || 'new'}
                                                                    </span>
                                                                    <div className="rank-score-container">
                                                                        <span className="rank-score-label">Score: </span>
                                                                        <span className="rank-score-value">
                                                                            {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                                ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="button-container">
                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="view-profile-button"
                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                                        >
                                                                            Full Profile
                                                                        </button>
                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Second applicant - displayed second */}
                                                        <div className="applicant-card top-applicant-card">
                                                            <div className="rank-number-container">
                                                                <div className="rank-number">
                                                                    <span className="rank-circle">2</span>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-info">
                                                                    <h4>{renderApplicantID(filteredApplicants[1])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[1]))}</p>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-status-actions-2">
                                                                    <span className={`status-badge ${filteredApplicants[1].status || 'new'}`}>
                                                                        {filteredApplicants[1].status || 'new'}
                                                                    </span>
                                                                    <div className="rank-score-container">
                                                                        <span className="rank-score-label">Score: </span>
                                                                        <span className="rank-score-value">
                                                                            {filteredApplicants[1].rank_score && filteredApplicants[1].rank_score.final_score
                                                                                ? filteredApplicants[1].rank_score.final_score.toFixed(2)
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="button-container">
                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'approved' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="view-profile-button"
                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}`)}
                                                                        >
                                                                            Full Profile
                                                                        </button>
                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'interview completed' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Third applicant - displayed last */}
                                                        <div className="applicant-card top-applicant-card">
                                                            <div className="rank-number-container">
                                                                <div className="rank-number">
                                                                    <span className="rank-circle">3</span>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-info">
                                                                    <h4>{renderApplicantID(filteredApplicants[2])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[2]))}</p>
                                                                    <h4>{renderApplicantID(filteredApplicants[2])}</h4>
                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[2]))}</p>
                                                                </div>
                                                            </div>
                                                            <div className="applicant-content-container">
                                                                <div className="applicant-status-actions-2">
                                                                    <span className={`status-badge ${filteredApplicants[2].status || 'new'}`}>
                                                                        {filteredApplicants[2].status || 'new'}
                                                                    </span>
                                                                    <div className="rank-score-container">
                                                                        <span className="rank-score-label">Score: </span>
                                                                        <span className="rank-score-value">
                                                                            {filteredApplicants[2].rank_score && filteredApplicants[2].rank_score.final_score
                                                                                ? filteredApplicants[2].rank_score.final_score.toFixed(2)
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="button-container">
                                                                        {filteredApplicants[2].status && filteredApplicants[2].status.toLowerCase() === 'approved' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="view-profile-button"
                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}`)}
                                                                        >
                                                                            Full Profile
                                                                        </button>
                                                                        {filteredApplicants[2].status && filteredApplicants[2].status.toLowerCase() === 'interview completed' && (
                                                                            <button
                                                                                className="view-responses-button"
                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}/interview-responses`)}
                                                                            >
                                                                                Interview Responses
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
>>>>>>> 9e13ed84 (Resolved merge conflict in InterviewResponses.js)
                                    </div>
                                    
                                    {selectedJob.prompt ? (
                                        /* RANKED APPLICANTS: Display top 3 in podium arrangement */
                                        <>
                                            {filteredApplicants.length === 1 && (
                                                /* Single applicant layout - only middle position */
                                                <div key={filteredApplicants[0].candidateId} className="applicant-card">
                                                    <div className="applicant-rank-info">
                                                        <div className="rank-number">
                                                            <span className="rank-circle">1</span>
                                                        </div>
                                                        <div className="applicant-info">
                                                            <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                            <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                        </div>
                                                    </div>

=======
                                    </div>

                                    {selectedJob.prompt ? (
                                        /* RANKED APPLICANTS: Display top 3 in podium arrangement */
                                        <>
                                            {filteredApplicants.length === 1 && (
                                                /* Single applicant layout - only middle position */
                                                <div key={filteredApplicants[0].candidateId} className="applicant-card">
                                                    <div className="applicant-rank-info">
                                                        <div className="rank-number">
                                                            <span className="rank-circle">1</span>
                                                        </div>
                                                        <div className="applicant-info">
                                                            <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                            <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                        </div>
                                                    </div>

>>>>>>> Stashed changes
                                                    <div className="applicant-status-actions">
                                                        <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                            {filteredApplicants[0].status || 'new'}
                                                        </span>
                                                        <div className="rank-score-container">
                                                            <span className="rank-score-label">Score: </span>
                                                            <span className="rank-score-value">
                                                                {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                    ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                    : "N/A"}
                                                            </span>
                                                        </div>
                                                        <div className="button-container">
                                                            {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                                <button
                                                                    className="view-responses-button"
                                                                    onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                >
                                                                    Interview Responses
                                                                </button>
                                                            )}
                                                            <button
                                                                className="view-profile-button"
                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                            >
                                                                Full Profile
                                                            </button>
                                                            {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                                <button
                                                                    className="view-responses-button"
                                                                    onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                >
                                                                    Interview Responses
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
<<<<<<< Updated upstream
                                            
=======

>>>>>>> Stashed changes
                                            {filteredApplicants.length >= 2 && (
                                                <div className="top-applicants-container">
                                                    <div className="top-three-applicants">
                                                        <div className="top-applicants-row">
                                                            {filteredApplicants.length === 2 ? (
                                                                /* Two applicants layout - position 1 and 2 */
                                                                <>
                                                                    {/* First applicant */}
                                                                    <div className="applicant-card top-applicant-card" style={{ flex: '1' }}>
                                                                        <div className="rank-number-container">
                                                                            <div className="rank-number">
                                                                                <span className="rank-circle">1</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="applicant-content-container">
                                                                            <div className="applicant-info">
                                                                                <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                                                <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="applicant-content-container">
                                                                            <div className="applicant-status-actions-2">
                                                                                <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                                                    {filteredApplicants[0].status || 'new'}
                                                                                </span>
                                                                                <div className="rank-score-container">
                                                                                    <span className="rank-score-label">Score: </span>
                                                                                    <span className="rank-score-value">
                                                                                        {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                                            ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                                            : "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="button-container">
                                                                                    {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                                                        <button
                                                                                            className="view-responses-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                                        >
                                                                                            Interview Responses
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        className="view-profile-button"
                                                                                        onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                                                    >
                                                                                        Full Profile
                                                                                    </button>
                                                                                    {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                                                        <button
                                                                                            className="view-responses-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                                        >
                                                                                            Interview Responses
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Second applicant */}
                                                                    <div className="applicant-card top-applicant-card" style={{ flex: '1' }}>
                                                                        <div className="rank-number-container">
                                                                            <div className="rank-number">
                                                                                <span className="rank-circle">2</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="applicant-content-container">
                                                                            <div className="applicant-info">
                                                                                <h4>{renderApplicantID(filteredApplicants[1])}</h4>
                                                                                <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[1]))}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="applicant-content-container">
                                                                            <div className="applicant-status-actions-2">
                                                                                <span className={`status-badge ${filteredApplicants[1].status || 'new'}`}>
                                                                                    {filteredApplicants[1].status || 'new'}
                                                                                </span>
                                                                                <div className="rank-score-container">
                                                                                    <span className="rank-score-label">Score: </span>
                                                                                    <span className="rank-score-value">
                                                                                        {filteredApplicants[1].rank_score && filteredApplicants[1].rank_score.final_score
                                                                                            ? filteredApplicants[1].rank_score.final_score.toFixed(2)
                                                                                            : "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="button-container">
                                                                                    {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'approved' && (
                                                                                        <button
                                                                                            className="view-responses-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                                        >
                                                                                            Interview Responses
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        className="view-profile-button"
                                                                                        onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}`)}
                                                                                    >
                                                                                        Full Profile
                                                                                    </button>
                                                                                    {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'interview completed' && (
                                                                                        <button
                                                                                            className="view-responses-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                                        >
                                                                                            Interview Responses
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                /* Three or more applicants - show top 3 in podium layout */
                                                                <>
                                                                    <div className="top-applicants-row">
                                                                        {/* Second applicant - displayed on the left */}
                                                                        <div className="applicant-card top-applicant-card" data-rank="2">
                                                                            <div className="rank-badge" data-rank="2">
                                                                                2
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-info">
                                                                                    <h4>{renderApplicantID(filteredApplicants[1])}</h4>
                                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[1]))}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-status-actions-2">
                                                                                    <span className={`status-badge ${filteredApplicants[1].status || 'new'}`}>
                                                                                        {filteredApplicants[1].status || 'new'}
                                                                                    </span>
                                                                                    <div className="rank-score-container">
                                                                                        <span className="rank-score-label">Score: </span>
                                                                                        <span className="rank-score-value">
                                                                                            {filteredApplicants[1].rank_score && filteredApplicants[1].rank_score.final_score
                                                                                                ? filteredApplicants[1].rank_score.final_score.toFixed(2)
                                                                                                : "N/A"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="button-container">
                                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'approved' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            className="view-profile-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}`)}
                                                                                        >
                                                                                            Full Profile
                                                                                        </button>
                                                                                        {filteredApplicants[1].status && filteredApplicants[1].status.toLowerCase() === 'interview completed' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[1].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* First applicant - displayed in the center (taller) */}
                                                                        <div className="applicant-card top-applicant-card" data-rank="1">
                                                                            <div className="rank-badge" data-rank="1">
                                                                                <svg className="crown-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<<<<<<< Updated upstream
                                                                                    <path d="M3 17L6 9L12 12L18 9L21 17H3Z" fill="#FFD700"/>
                                                                                    <path d="M3 17L6 9L12 12L18 9L21 17M3.5 21H20.5M12 7C13.1046 7 14 6.10457 14 5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5C10 6.10457 10.8954 7 12 7Z" 
                                                                                        stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
=======
                                                                                    <path d="M3 17L6 9L12 12L18 9L21 17H3Z" fill="#FFD700" />
                                                                                    <path d="M3 17L6 9L12 12L18 9L21 17M3.5 21H20.5M12 7C13.1046 7 14 6.10457 14 5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5C10 6.10457 10.8954 7 12 7Z"
                                                                                        stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
>>>>>>> Stashed changes
                                                                                </svg>
                                                                                1
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-info">
                                                                                    <h4>{renderApplicantID(filteredApplicants[0])}</h4>
                                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[0]))}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-status-actions-2">
                                                                                    <span className={`status-badge ${filteredApplicants[0].status || 'new'}`}>
                                                                                        {filteredApplicants[0].status || 'new'}
                                                                                    </span>
                                                                                    <div className="rank-score-container">
                                                                                        <span className="rank-score-label">Score: </span>
                                                                                        <span className="rank-score-value">
                                                                                            {filteredApplicants[0].rank_score && filteredApplicants[0].rank_score.final_score
                                                                                                ? filteredApplicants[0].rank_score.final_score.toFixed(2)
                                                                                                : "N/A"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="button-container">
                                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'approved' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            className="view-profile-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}`)}
                                                                                        >
                                                                                            Full Profile
                                                                                        </button>
                                                                                        {filteredApplicants[0].status && filteredApplicants[0].status.toLowerCase() === 'interview completed' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[0].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Third applicant - displayed on the right */}
                                                                        <div className="applicant-card top-applicant-card" data-rank="3">
                                                                            <div className="rank-badge" data-rank="3">
                                                                                3
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-info">
                                                                                    <h4>{renderApplicantID(filteredApplicants[2])}</h4>
                                                                                    <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(filteredApplicants[2]))}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="applicant-content-container">
                                                                                <div className="applicant-status-actions-2">
                                                                                    <span className={`status-badge ${filteredApplicants[2].status || 'new'}`}>
                                                                                        {filteredApplicants[2].status || 'new'}
                                                                                    </span>
                                                                                    <div className="rank-score-container">
                                                                                        <span className="rank-score-label">Score: </span>
                                                                                        <span className="rank-score-value">
                                                                                            {filteredApplicants[2].rank_score && filteredApplicants[2].rank_score.final_score
                                                                                                ? filteredApplicants[2].rank_score.final_score.toFixed(2)
                                                                                                : "N/A"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="button-container">
                                                                                        {filteredApplicants[2].status && filteredApplicants[2].status.toLowerCase() === 'approved' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            className="view-profile-button"
                                                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}`)}
                                                                                        >
                                                                                            Full Profile
                                                                                        </button>
                                                                                        {filteredApplicants[2].status && filteredApplicants[2].status.toLowerCase() === 'interview completed' && (
                                                                                            <button
                                                                                                className="view-responses-button"
                                                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${filteredApplicants[2].candidateId}/interview-responses`)}
                                                                                            >
                                                                                                Interview Responses
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
<<<<<<< Updated upstream
                                            
=======

>>>>>>> Stashed changes
                                            {/* Remaining applicants (4th and beyond) for ranked jobs */}
                                            {filteredApplicants.length > 3 && filteredApplicants.slice(3).map((applicant, index) => (
                                                <div key={applicant.candidateId || index} className="applicant-card">
                                                    <div className="applicant-rank-info">
                                                        <div className="rank-number">
                                                            <span className="rank-circle">{index + 4}</span>
                                                        </div>
                                                        <div className="applicant-info">
                                                            <h4>{renderApplicantID(applicant)}</h4>
                                                            <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(applicant))}</p>
                                                        </div>
                                                    </div>

                                                    <div className="applicant-status-actions">
                                                        <span className={`status-badge ${applicant.status || 'new'}`}>
                                                            {applicant.status || 'new'}
                                                        </span>
                                                        <div className="rank-score-container">
                                                            <span className="rank-score-label">Score: </span>
                                                            <span className="rank-score-value">
                                                                {applicant.rank_score && applicant.rank_score.final_score
                                                                    ? applicant.rank_score.final_score.toFixed(2)
                                                                    : "N/A"}
                                                            </span>
                                                        </div>
                                                        <div className="button-container">
                                                            {applicant.status && applicant.status.toLowerCase() === 'approved' && (
                                                                <button
                                                                    className="view-responses-button"
                                                                    onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}/interview-responses`)}
                                                                >
                                                                    Interview Responses
                                                                </button>
                                                            )}
                                                            <button
                                                                className="view-profile-button"
                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}`)}
                                                            >
                                                                Full Profile
                                                            </button>
                                                            {applicant.status && applicant.status.toLowerCase() === 'interview completed' && (
                                                                <button
                                                                    className="view-responses-button"
                                                                    onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}/interview-responses`)}
                                                                >
                                                                    Interview Responses
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        /* UNRANKED APPLICANTS: Display all applicants in sequential order */
                                        filteredApplicants.map((applicant, index) => (
                                            <div key={applicant.candidateId || index} className="applicant-card">
                                                <div className="applicant-rank-info">
                                                    <div className="rank-number">
                                                        <span className="rank-circle">{index + 1}</span>
                                                    </div>
                                                    <div className="applicant-info">
                                                        <h4>{renderApplicantID(applicant)}</h4>
                                                        <p className="applicant-email">{'CV Uploaded on ' + (renderApplicantSubmitDate(applicant))}</p>
                                                    </div>
                                                </div>

                                                <div className="applicant-status-actions">
                                                    <span className={`status-badge ${applicant.status || 'new'}`}>
                                                        {applicant.status || 'new'}
                                                    </span>
                                                    <div className="rank-score-container">
                                                        <span className="rank-score-label">Score: </span>
                                                        <span className="rank-score-value">
                                                            {applicant.rank_score && applicant.rank_score.final_score
                                                                ? applicant.rank_score.final_score.toFixed(2)
                                                                : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="button-container">
                                                        {applicant.status && applicant.status.toLowerCase() === 'approved' && (
                                                            <button
                                                                className="view-responses-button"
                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}/interview-responses`)}
                                                            >
                                                                Interview Responses
                                                            </button>
                                                        )}
                                                        <button
                                                            className="view-profile-button"
                                                            onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}`)}
                                                        >
                                                            Full Profile
                                                        </button>
                                                        {applicant.status && applicant.status.toLowerCase() === 'interview completed' && (
                                                            <button
                                                                className="view-responses-button"
                                                                onClick={() => navigate(`/dashboard/${selectedJob.jobId}/${applicant.candidateId}/interview-responses`)}
                                                            >
                                                                Interview Responses
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Improved applicant data rendering with fallbacks and debugging
const renderApplicantID = (applicant) => {
    // Directly return candidateId instead of name
    return applicant.candidateId || "ID Not Available";
};

const renderApplicantSubmitDate = (applicant) => {
    // Check multiple possible locations for the upload date
    let uploadDate = null;

    // Try direct uploadedAt property
    if (applicant.uploadedAt) {
        uploadDate = applicant.uploadedAt;
    }
    // Try applicationDate property (often used for timestamps in applications)
    else if (applicant.applicationDate) {
        uploadDate = applicant.applicationDate;
    }
    // Try nested locations
    else if (applicant.candidateInfo && applicant.candidateInfo.uploadedAt) {
        uploadDate = applicant.candidateInfo.uploadedAt;
    }
    // Try extracted text data
    else if (applicant.extractedText && applicant.extractedText.uploadedAt) {
        uploadDate = applicant.extractedText.uploadedAt;
    }
    // Look for Firebase timestamp format (could be in seconds or milliseconds)
    else if (applicant.timestamp) {
        // Firebase timestamps can be objects with seconds and nanoseconds
        if (typeof applicant.timestamp === 'object' && applicant.timestamp.seconds) {
            uploadDate = new Date(applicant.timestamp.seconds * 1000).toISOString();
        } else {
            uploadDate = applicant.timestamp;
        }
    }

    // If we found a date value, format it
    if (uploadDate) {
        return formatDate(uploadDate);
    }

    // For debugging, log the full applicant object to see its structure
    console.log("Applicant structure for debugging upload date:", applicant);

    return "Upload Date Not Available";
};