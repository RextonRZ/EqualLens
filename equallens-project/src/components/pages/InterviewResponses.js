import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewResponses.css';
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

const AudioPlayer = ({ audioUrl }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [audioStatus, setAudioStatus] = useState("initial"); // "initial", "loading", "ready", "error"

    useEffect(() => {
        if (!audioUrl) {
            setError("No audio URL provided");
            setLoading(false);
            setAudioStatus("error");
            return;
        }

        // Reset states when URL changes
        setLoading(true);
        setError(null);
        setDuration(0);
        setCurrentTime(0);
        setIsPlaying(false);
        setAudioStatus("loading");

        // Debug the audio URL
        console.log("Attempting to load audio from:", audioUrl);

        // Create a new Audio element to test if the file is accessible
        const testAudio = new Audio();

        // Add event listeners to the test audio
        const handleTestCanPlay = () => {
            console.log("Audio file is accessible and can be played");
            setAudioStatus("ready");
            setLoading(false);
            // Clean up test audio
            testAudio.removeEventListener('canplay', handleTestCanPlay);
            testAudio.removeEventListener('error', handleTestError);
        };

        const handleTestError = (e) => {
            console.error("Error testing audio accessibility:", e);
            // Try to get more specific error information
            let errorMessage = "Audio file could not be loaded";
            if (e.target.error) {
                switch (e.target.error.code) {
                    case 1: // MEDIA_ERR_ABORTED
                        errorMessage = "Audio loading aborted";
                        break;
                    case 2: // MEDIA_ERR_NETWORK
                        errorMessage = "Network error while loading audio";
                        break;
                    case 3: // MEDIA_ERR_DECODE
                        errorMessage = "Audio decoding error - file might be corrupted or unsupported format";
                        break;
                    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                        errorMessage = "Audio format not supported by your browser";
                        break;
                    default:
                        errorMessage = `Unknown audio error (${e.target.error.code})`;
                }
            }
            setError(errorMessage);
            setLoading(false);
            setAudioStatus("error");
            // Clean up test audio
            testAudio.removeEventListener('canplay', handleTestCanPlay);
            testAudio.removeEventListener('error', handleTestError);
        };

        testAudio.addEventListener('canplay', handleTestCanPlay);
        testAudio.addEventListener('error', handleTestError);

        // Set the source and start loading
        testAudio.src = audioUrl;
        testAudio.load();

        // Clean up function
        return () => {
            testAudio.removeEventListener('canplay', handleTestCanPlay);
            testAudio.removeEventListener('error', handleTestError);
            testAudio.src = '';
        };
    }, [audioUrl]);

    // Set up audio player once we know the file is accessible
    useEffect(() => {
        if (audioStatus === "ready" && audioRef.current) {
            const audio = audioRef.current;

            const handleLoadedMetadata = () => {
                console.log("Audio metadata loaded, duration:", audio.duration);
                setDuration(audio.duration);
            };

            const handleTimeUpdate = () => {
                setCurrentTime(audio.currentTime);
            };

            const handleEnded = () => {
                setIsPlaying(false);
                setCurrentTime(0);
            };

            // Add event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleEnded);
            };
        }
    }, [audioStatus]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                // Play with error handling
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Error playing audio:", error);
                        setError("Playback failed - try using the direct download link");
                    });
                }
            }
            setIsPlaying(!isPlaying);
        }
    };

    const resetPlay = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Error playing audio:", error);
                    setError("Playback failed - try using the direct download link");
                    setIsPlaying(false);
                });
            }
            setIsPlaying(true);
        }
    };

    const handleProgressChange = (e) => {
        if (audioRef.current) {
            const newTime = parseFloat(e.target.value);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    if (loading) {
        return (
            <div className="audio-loading">
                Loading audio...
                <button onClick={() => window.open(audioUrl, '_blank')}
                    style={{
                        marginLeft: '10px', background: 'none', border: 'none',
                        color: '#0066cc', cursor: 'pointer', textDecoration: 'underline'
                    }}>
                    Open directly
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="audio-error">
                <div>{error}</div>
                <div style={{ marginTop: '10px' }}>
                    <button onClick={() => window.open(audioUrl, '_blank')}
                        style={{
                            background: '#0066cc', color: 'white', border: 'none',
                            padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                        }}>
                        Download audio file
                    </button>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                    <p>The audio file may be in WAV format, which some browsers have trouble playing directly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={audioUrl} preload="auto" />

            <div className="audio-controls">
                <button className="audio-button" onClick={togglePlay}>
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    )}
                </button>

                <button className="audio-button" onClick={resetPlay}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                    </svg>
                </button>

                <div className="audio-progress-container">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime || 0}
                        onChange={handleProgressChange}
                        className="audio-progress"
                    />
                    <div className="audio-time">
                        <span>{formatTime(currentTime || 0)}</span>
                        <span>{formatTime(duration || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InterviewResponses = () => {
    const { jobId, candidateId } = useParams();
    const navigate = useNavigate();

    const [responses, setResponses] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatingFeedback, setGeneratingFeedback] = useState(false);
    const [candidate, setCandidate] = useState(null);
    const [job, setJob] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [applicationId, setApplicationId] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState('');
    const [processingAction, setProcessingAction] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [expandedQuestions, setExpandedQuestions] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // First, fetch the candidate and job info
                const candidateRes = await fetch(`http://localhost:8000/api/candidates/candidate/${candidateId}`);
                if (!candidateRes.ok) throw new Error("Failed to fetch candidate information");
                const candidateData = await candidateRes.json();
                setCandidate(candidateData);

                const jobRes = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
                if (!jobRes.ok) throw new Error("Failed to fetch job information");
                const jobData = await jobRes.json();
                setJob(jobData);

                // We need to get the applicationId based on the candidateId and jobId
                const applicationsRes = await fetch(`http://localhost:8000/api/candidates/applicants?jobId=${jobId}`);
                if (!applicationsRes.ok) throw new Error("Failed to fetch applications");
                const applications = await applicationsRes.json();

                const application = applications.find(app => app.candidateId === candidateId);
                if (!application) throw new Error("Application not found");

                setApplicationId(application.applicationId);

                // Now fetch the interview responses using the applicationId
                const responsesRes = await fetch(`http://localhost:8000/api/interviews/responses/${application.applicationId}`);
                if (!responsesRes.ok) {
                    // If 404, it means no responses yet
                    if (responsesRes.status === 404) {
                        setResponses(null);
                        setError("No interview responses found for this candidate");
                        setLoading(false);
                        return;
                    }
                    throw new Error("Failed to fetch interview responses");
                }

                const responsesData = await responsesRes.json();
                setResponses(responsesData);

                // Fetch the actual interview questions to get the question text
                const questionsRes = await fetch(`http://localhost:8000/api/interview-questions/actual-questions/${application.applicationId}`);
                if (questionsRes.ok) {
                    const questionsData = await questionsRes.json();
                    setQuestions(questionsData.questions || []);
                }

                // Generate AI feedback for responses that don't have it
                if (responsesData && responsesData.questions && responsesData.questions.length > 0) {
                    const needsFeedback = responsesData.questions.some(q => !q.AIFeedback);

                    if (needsFeedback) {
                        setGeneratingFeedback(true);
                        await generateAIFeedback(responsesData, application.applicationId);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setError(error.message || "An error occurred while fetching data");
                setLoading(false);
            }
        };

        fetchData();
    }, [jobId, candidateId]);

    useEffect(() => {
        if (responses && responses.questions && responses.questions.length > 0) {
            const initialExpandedState = {};
            responses.questions.forEach((_, index) => {
                initialExpandedState[index] = true; // Start with all questions expanded
            });
            setExpandedQuestions(initialExpandedState);
        }
    }, [responses]);

    const toggleQuestionExpansion = (index) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const generateAIFeedback = async (responsesData, appId) => {
        try {
            // Create array of responses that need feedback
            const responsesNeedingFeedback = responsesData.questions
                .filter(q => !q.AIFeedback)
                .map(q => ({
                    questionId: q.questionId,
                    responseId: q.responseId,
                    transcript: q.transcript || ''
                }));

            if (responsesNeedingFeedback.length === 0) {
                setGeneratingFeedback(false);
                return;
            }

            // Get the question text for each response
            const questionsWithText = responsesNeedingFeedback.map(response => {
                // Find the corresponding question text from questions array
                const questionText = questions.find(q => q.questionId === response.questionId)?.text || 'Unknown question';
                return {
                    ...response,
                    questionText
                };
            });

            // Call API to generate feedback for each response
            const feedbackRes = await fetch('http://localhost:8000/api/interviews/generate-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    applicationId: appId,
                    responses: questionsWithText,
                    jobTitle: job?.jobTitle || 'Unknown position'
                })
            });

            if (!feedbackRes.ok) {
                throw new Error("Failed to generate AI feedback");
            }

            const feedbackData = await feedbackRes.json();

            // Update responses with new feedback
            const updatedResponses = {
                ...responsesData,
                questions: responsesData.questions.map(q => {
                    const feedback = feedbackData.feedback.find(f => f.responseId === q.responseId);
                    return feedback ? { ...q, AIFeedback: feedback.feedback } : q;
                })
            };

            setResponses(updatedResponses);

            // Update the responses in the database
            await fetch(`http://localhost:8000/api/interviews/update-responses/${appId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedResponses)
            });

        } catch (error) {
            console.error("Error generating AI feedback:", error);
        } finally {
            setGeneratingFeedback(false);
        }
    };

    const handleSendEmail = (type) => {
        setConfirmActionType(type);
        setShowConfirmModal(true);
    };

    const handleConfirmAction = async () => {
        setShowConfirmModal(false);
        setProcessingAction(true);

        try {
            const endpoint = confirmActionType === 'approve'
                ? 'http://localhost:8000/api/interviews/send-offer'
                : 'http://localhost:8000/api/interviews/send-rejection';

            const email = candidate?.extractedText?.applicant_mail || '';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    applicationId,
                    candidateId,
                    jobId,
                    email,
                    candidateName: candidate?.extractedText?.applicant_name || 'Candidate',
                    jobTitle: job?.jobTitle || 'the position'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to send ${confirmActionType === 'approve' ? 'offer' : 'rejection'} email`);
            }

            setModalMessage(
                confirmActionType === 'approve'
                    ? 'Job offer email has been sent successfully!'
                    : 'Rejection email has been sent successfully!'
            );
            setShowSuccessModal(true);

            // Update application status
            const newStatus = confirmActionType === 'approve' ? 'approved' : 'rejected';
            await fetch(`http://localhost:8000/api/candidates/update-status/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

        } catch (error) {
            setModalMessage(`Error: ${error.message}`);
            setShowSuccessModal(true); // Reuse success modal for errors too
        } finally {
            setProcessingAction(false);
        }
    };

    const handleCancelAction = () => {
        setShowConfirmModal(false);
    };

    const getQuestionText = (questionId) => {
        const question = questions.find(q => q.questionId === questionId);
        return question ? question.text : 'Unknown question';
    };

    const SuccessModal = () => (
        <div className="status-modal-overlay">
            <div className="status-modal">
                <div className={`status-icon ${modalMessage.includes('Error') ? 'error-icon' : 'success-icon'}`}>
                    {modalMessage.includes('Error') ? (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    )}
                </div>
                <h3 className="status-title">{modalMessage.includes('Error') ? 'Error' : 'Success'}</h3>
                <p className="status-description">{modalMessage}</p>
                <div className="status-buttons">
                    <button className="status-button primary-button" onClick={() => setShowSuccessModal(false)}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    const ConfirmModal = () => (
        <div className="status-modal-overlay">
            <div className="status-modal">
                <div className="status-icon warning-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3 className="status-title">Confirm Action</h3>
                <p className="status-description">
                    {confirmActionType === 'approve'
                        ? 'Are you sure you want to send a job offer email to this candidate?'
                        : 'Are you sure you want to send a rejection email to this candidate?'}
                </p>
                <div className="status-buttons">
                    <button className="status-button secondary-button" onClick={handleCancelAction}>
                        Cancel
                    </button>
                    <button className="status-button primary-button" onClick={handleConfirmAction}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading || processingAction) {
        return (
            <div className="interview-responses-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80vh'
            }}>
                <div className="loading-indicator" style={{ textAlign: 'center' }}>
                    <LoadingAnimation />
                    <p style={{ marginTop: '20px' }}>
                        {processingAction ? 'Processing your request...' : 'Loading interview responses...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error && !responses) {
        return (
            <div className="interview-responses-container">
                <div className="error-container">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button className="back-button" onClick={() => navigate(`/dashboard/${jobId}/${candidateId}`)}>
                        Return to Candidate Profile
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-responses-container">
            {showSuccessModal && <SuccessModal />}
            {showConfirmModal && <ConfirmModal />}

            <button className="back-button" onClick={() => navigate(-1)}>
                <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back
            </button>

            <div className="responses-header">
                <h1>Interview Responses</h1>
                <div className="candidate-info">
                    <span className="candidate-id">Candidate ID: {candidateId}</span>
                    {job && <span className="job-title">Position: {job.jobTitle}</span>}
                </div>
            </div>

            {generatingFeedback && (
                <div className="generating-feedback-banner">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Generating AI feedback on responses...</span>
                </div>
            )}

            <div className="response-list">
                {responses && responses.questions && responses.questions.length > 0 ? (
                    responses.questions.map((response, index) => (
                        <div 
                            key={response.responseId} 
                            className={`response-card ${expandedQuestions[index] ? 'expanded' : 'collapsed'}`}
                        >
                            {/* Clickable Question Header for expanding/collapsing */}
                            <div 
                                className="question-header" 
                                onClick={() => toggleQuestionExpansion(index)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div
                                        className="question-icon"
                                        style={{
                                            backgroundColor: '#4caf50',
                                            color: 'white',
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Q{index + 1}</span>
                                    </div>
                                    <h3
                                        style={{
                                            color: '#333',
                                            fontSize: '1.2rem',
                                            lineHeight: '1.5',
                                            margin: 0,
                                            fontWeight: '600'
                                        }}
                                    >
                                        {getQuestionText(response.questionId)}
                                    </h3>
                                    
                                    {/* Add expand/collapse indicator */}
                                    <div className="toggle-indicator">
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            width="20" 
                                            height="20" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        >
                                            {expandedQuestions[index] ? (
                                                <polyline points="18 15 12 9 6 15"></polyline>
                                            ) : (
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            )}
                                        </svg>
                                    </div>
                                </div>
                                {response.wordCount > 0 && (
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: '#666',
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginLeft: '48px'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            Response length: {response.wordCount} words
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Collapsible content area */}
                            <div className="question-content">
                                {/* Audio Section */}
                                {(response.modifiedAudioUrl || response.audioExtractUrl) && (
                                    <div className="audio-section" style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{
                                            color: '#4a5568',
                                            marginBottom: '0.75rem',
                                            fontSize: '1rem',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                            </svg>
                                            Candidate's Response:
                                        </h4>
                                        <AudioPlayer audioUrl={response.modifiedAudioUrl || response.audioExtractUrl} />

                                        <div style={{
                                            marginTop: '15px',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <strong>Having trouble playing the audio?</strong>
                                            </div>
                                            <div>
                                                <a
                                                    href={response.modifiedAudioUrl || response.audioExtractUrl}
                                                    download={`response-${index + 1}.wav`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        backgroundColor: '#4caf50',
                                                        color: 'white',
                                                        padding: '6px 12px',
                                                        borderRadius: '4px',
                                                        textDecoration: 'none',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    <svg
                                                        style={{ verticalAlign: 'middle', marginRight: '5px' }}
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="7 10 12 15 17 10"></polyline>
                                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                                    </svg>
                                                    Download Audio
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Transcript Section */}
                                {response.transcript && (
                                    <div className="transcript-section" style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{
                                            color: '#4a5568',
                                            marginBottom: '0.75rem',
                                            fontSize: '1rem',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                            Transcript:
                                        </h4>
                                        <div className="transcript-text" style={{
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            border: '1px solid #e2e8f0',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: '1.6',
                                            color: '#4a5568'
                                        }}>
                                            {response.transcript}
                                        </div>
                                    </div>
                                )}

                                {/* Improved AI Feedback Display */}
                                <div className="feedback-section" style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div
                                            style={{
                                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                                color: '#4caf50',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '10px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                            </svg>
                                        </div>
                                        <h4 style={{ color: '#4a5568', margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                                            AI Feedback
                                        </h4>
                                    </div>

                                    <div className="feedback-content" style={{
                                        backgroundColor: 'rgba(76, 175, 80, 0.05)',
                                        borderLeft: '3px solid #4caf50',
                                        borderRadius: '0 4px 4px 0',
                                        padding: '1.25rem',
                                        marginLeft: '16px'
                                    }}>
                                        {response.AIFeedback ? (
                                            <div
                                                className="ai-feedback-text"
                                                style={{ color: '#333', lineHeight: '1.6' }}
                                                dangerouslySetInnerHTML={{ __html: response.AIFeedback }}
                                            />
                                        ) : (
                                            <div className="feedback-loading" style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                padding: '1rem',
                                                color: '#718096',
                                                fontStyle: 'italic'
                                            }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                    style={{ marginRight: '8px', animation: 'spin 2s linear infinite' }}>
                                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                                </svg>
                                                <p style={{ margin: 0 }}>Generating feedback...</p>
                                                <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-responses">
                        <p>No interview responses found for this candidate.</p>
                    </div>
                )}
            </div>

            <div className="action-buttons">
                <button
                    className="reject-button"
                    onClick={() => handleSendEmail('reject')}
                >
                    Send Rejection Email
                </button>
                <button
                    className="approve-button"
                    onClick={() => handleSendEmail('approve')}
                >
                    Send Job Offer Email
                </button>
            </div>
        </div>
    );
};

export default InterviewResponses;