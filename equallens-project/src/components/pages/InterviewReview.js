import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

function InterviewReview() {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    // State variables
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [candidateInfo, setCandidateInfo] = useState(null);
    const [jobInfo, setJobInfo] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState([]);
    const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
    const [feedback, setFeedback] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    // Rating categories
    const ratingCategories = [
        { id: 'clarity', name: 'Clarity', description: 'How clearly did the candidate express their ideas?' },
        { id: 'confidence', name: 'Confidence', description: 'How confident did the candidate appear?' },
        { id: 'relevance', name: 'Relevance', description: 'How relevant were the candidate\'s answers to the questions?' },
        { id: 'technical', name: 'Technical Knowledge', description: 'How strong was the candidate\'s technical knowledge?' }
    ];

    // Initial feedback state
    useEffect(() => {
        // Initialize feedback state for each response
        if (responses.length > 0) {
            const initialFeedback = {};
            responses.forEach(response => {
                initialFeedback[response.responseId] = {
                    clarity: 0,
                    confidence: 0,
                    relevance: 0,
                    technical: 0,
                    notes: ''
                };
            });
            setFeedback(initialFeedback);
        }
    }, [responses]);

    // Fetch interview data on component mount
    useEffect(() => {
        const fetchInterviewData = async () => {
            try {
                setLoading(true);

                // Fetch interview details
                const interviewResponse = await fetch(`http://localhost:8000/api/interviews/review/${interviewId}`);
                if (!interviewResponse.ok) {
                    const errorData = await interviewResponse.json();
                    throw new Error(errorData.detail || 'Failed to fetch interview details');
                }

                const interviewData = await interviewResponse.json();

                // Set candidate and job info
                setCandidateInfo(interviewData.candidateInfo);
                setJobInfo(interviewData.jobInfo);

                // Set questions and responses
                setQuestions(interviewData.questions);
                setResponses(interviewData.responses);

                // If responses already have feedback, set it
                if (interviewData.responses && interviewData.responses.length > 0) {
                    const existingFeedback = {};
                    interviewData.responses.forEach(response => {
                        if (response.analysis) {
                            existingFeedback[response.responseId] = {
                                clarity: response.analysis.clarity || 0,
                                confidence: response.analysis.confidence || 0,
                                relevance: response.analysis.relevance || 0,
                                technical: response.analysis.totalScore / 3 || 0, // Approximation
                                notes: response.analysis.feedback || ''
                            };
                        }
                    });

                    // Only set feedback if there's existing data
                    if (Object.keys(existingFeedback).length > 0) {
                        setFeedback(existingFeedback);
                    }
                }

            } catch (error) {
                console.error("Error fetching interview data:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInterviewData();
    }, [interviewId]);

    const handleRatingChange = (responseId, category, value) => {
        setFeedback(prev => ({
            ...prev,
            [responseId]: {
                ...prev[responseId],
                [category]: parseInt(value)
            }
        }));
    };

    const handleNotesChange = (responseId, notes) => {
        setFeedback(prev => ({
            ...prev,
            [responseId]: {
                ...prev[responseId],
                notes
            }
        }));
    };

    const getCurrentResponse = () => {
        return responses[currentResponseIndex] || null;
    };

    const getCurrentQuestion = () => {
        const response = getCurrentResponse();
        if (!response) return null;

        // Find the question that matches this response
        return questions.find(q => q.questionId === response.questionId) || null;
    };

    const getResponseIdFromIndex = (index) => {
        return responses[index]?.responseId || null;
    };

    const calculateAverageRating = (responseId) => {
        if (!feedback[responseId]) return 0;

        const { clarity, confidence, relevance, technical } = feedback[responseId];
        return ((clarity + confidence + relevance + technical) / 4).toFixed(1);
    };

    const navigateToNextResponse = () => {
        if (currentResponseIndex < responses.length - 1) {
            setCurrentResponseIndex(currentResponseIndex + 1);
        }
    };

    const navigateToPrevResponse = () => {
        if (currentResponseIndex > 0) {
            setCurrentResponseIndex(currentResponseIndex - 1);
        }
    };

    const submitFeedback = async () => {
        try {
            setSubmitting(true);

            // Prepare feedback data
            const feedbackData = {
                interviewId,
                responses: Object.keys(feedback).map(responseId => ({
                    responseId,
                    analysis: {
                        clarity: feedback[responseId].clarity,
                        confidence: feedback[responseId].confidence,
                        relevance: feedback[responseId].relevance,
                        totalScore: (
                            feedback[responseId].clarity +
                            feedback[responseId].confidence +
                            feedback[responseId].relevance
                        ) / 3, // Average as the total score
                        feedback: feedback[responseId].notes
                    }
                }))
            };

            // Submit to API
            const response = await fetch('http://localhost:8000/api/interviews/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit feedback');
            }

            // Show success message
            setSubmissionSuccess(true);

            // Navigate to dashboard after a delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);

        } catch (error) {
            console.error("Error submitting feedback:", error);
            setError(`Failed to submit feedback: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <LoadingAnimation />
                <h2 style={{ marginTop: '30px', color: '#333' }}>Loading interview data...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                maxWidth: '600px',
                margin: '40px auto',
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#ffdddd',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h2 style={{ color: '#e53935', marginBottom: '20px' }}>Error</h2>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    {error}
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        backgroundColor: '#ef402d',
                        color: 'white',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (submissionSuccess) {
        return (
            <div style={{
                maxWidth: '600px',
                margin: '40px auto',
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h2 style={{ color: '#4caf50', marginBottom: '20px' }}>Feedback Submitted Successfully</h2>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    Your feedback has been submitted and saved successfully.
                </p>
                <p style={{ color: '#777' }}>
                    Redirecting to dashboard...
                </p>
            </div>
        );
    }

    const currentResponse = getCurrentResponse();
    const currentQuestion = getCurrentQuestion();

    if (!currentResponse || !currentQuestion) {
        return (
            <div style={{
                maxWidth: '600px',
                margin: '40px auto',
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
                <h2 style={{ color: '#333', marginBottom: '20px' }}>No Responses Available</h2>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    There are no interview responses available for review.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        backgroundColor: '#ef402d',
                        color: 'white',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '40px auto',
            padding: '30px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            {/* Header with candidate and job info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '30px',
                borderBottom: '1px solid #eee',
                paddingBottom: '20px'
            }}>
                <div>
                    <h1 style={{ color: '#333', marginBottom: '10px', fontSize: '28px' }}>
                        Interview Review
                    </h1>
                    <h2 style={{ color: '#666', fontSize: '20px', fontWeight: 'normal' }}>
                        {candidateInfo?.firstName} {candidateInfo?.lastName} - {jobInfo?.jobTitle}
                    </h2>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Dashboard
                </button>
            </div>

            {/* Progress pills */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '30px'
            }}>
                {responses.map((response, index) => (
                    <button
                        key={response.responseId}
                        onClick={() => setCurrentResponseIndex(index)}
                        style={{
                            backgroundColor: index === currentResponseIndex ? '#ef402d' : '#f5f5f5',
                            color: index === currentResponseIndex ? 'white' : '#333',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>Question {index + 1}</span>
                        {feedback[response.responseId] && calculateAverageRating(response.responseId) > 0 && (
                            <span style={{
                                backgroundColor: index === currentResponseIndex ? 'rgba(255, 255, 255, 0.2)' : '#ef402d',
                                color: index === currentResponseIndex ? 'white' : 'white',
                                borderRadius: '20px',
                                padding: '2px 8px',
                                fontSize: '12px'
                            }}>
                                {calculateAverageRating(response.responseId)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '30px'
            }}>
                {/* Left side: Video and Question */}
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#333', marginBottom: '10px', fontSize: '18px' }}>
                            Question {currentResponseIndex + 1}:
                        </h3>
                        <p style={{
                            padding: '15px',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '8px',
                            color: '#333',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}>
                            {currentQuestion.question}
                        </p>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginTop: '10px',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Time limit: {Math.floor(currentQuestion.timeLimit / 60)}:{(currentQuestion.timeLimit % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingBottom: '56.25%', /* 16:9 aspect ratio */
                        backgroundColor: '#000',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '20px'
                    }}>
                        {currentResponse.videoResponseUrl ? (
                            <video
                                src={currentResponse.videoResponseUrl}
                                controls
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        ) : (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#222',
                                color: 'white'
                            }}>
                                No video response available
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                            onClick={navigateToPrevResponse}
                            disabled={currentResponseIndex === 0}
                            style={{
                                backgroundColor: currentResponseIndex === 0 ? '#f5f5f5' : '#ef402d',
                                color: currentResponseIndex === 0 ? '#aaa' : 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: currentResponseIndex === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Previous Question
                        </button>

                        <button
                            onClick={navigateToNextResponse}
                            disabled={currentResponseIndex === responses.length - 1}
                            style={{
                                backgroundColor: currentResponseIndex === responses.length - 1 ? '#f5f5f5' : '#ef402d',
                                color: currentResponseIndex === responses.length - 1 ? '#aaa' : 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: currentResponseIndex === responses.length - 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Next Question
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Right side: Feedback form */}
                <div>
                    <h3 style={{ color: '#333', marginBottom: '20px', fontSize: '18px' }}>
                        Evaluation
                    </h3>

                    {ratingCategories.map(category => (
                        <div key={category.id} style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor={`${category.id}-rating`}
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '16px',
                                    color: '#333',
                                    fontWeight: '500'
                                }}
                            >
                                {category.name}
                                <span style={{
                                    marginLeft: '10px',
                                    fontSize: '14px',
                                    color: '#666',
                                    fontWeight: 'normal'
                                }}>
                                    {category.description}
                                </span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    id={`${category.id}-rating`}
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={feedback[currentResponse.responseId]?.[category.id] || 0}
                                    onChange={(e) => handleRatingChange(currentResponse.responseId, category.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        maxWidth: '350px'
                                    }}
                                />
                                <span style={{
                                    marginLeft: '15px',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    fontSize: '16px',
                                    minWidth: '30px'
                                }}>
                                    {feedback[currentResponse.responseId]?.[category.id] || 0}
                                </span>
                            </div>
                        </div>
                    ))}

                    <div style={{ marginBottom: '30px' }}>
                        <label
                            htmlFor="feedback-notes"
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '16px',
                                color: '#333',
                                fontWeight: '500'
                            }}
                        >
                            Feedback Notes
                        </label>
                        <textarea
                            id="feedback-notes"
                            rows="6"
                            value={feedback[currentResponse.responseId]?.notes || ''}
                            onChange={(e) => handleNotesChange(currentResponse.responseId, e.target.value)}
                            placeholder="Enter your feedback notes for this response..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '14px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{
                        backgroundColor: '#f9f9f9',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                        }}>
                            <h4 style={{ margin: 0, color: '#333', fontSize: '16px' }}>
                                Overall Rating
                            </h4>
                            <span style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: '#ef402d'
                            }}>
                                {calculateAverageRating(currentResponse.responseId)}
                            </span>
                        </div>

                        <div style={{
                            width: '100%',
                            height: '10px',
                            backgroundColor: '#eee',
                            borderRadius: '5px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${calculateAverageRating(currentResponse.responseId) * 10}%`,
                                height: '100%',
                                backgroundColor: '#ef402d',
                                borderRadius: '5px'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: '40px',
                borderTop: '1px solid #eee',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <button
                    onClick={submitFeedback}
                    disabled={submitting}
                    style={{
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        padding: '12px 40px',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    {submitting ? (
                        <>
                            <span style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '16px',
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderRadius: '50%',
                                borderTopColor: 'white',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span>Submitting...</span>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>Submit All Feedback</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default InterviewReview;