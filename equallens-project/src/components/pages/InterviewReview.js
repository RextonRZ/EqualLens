// src/components/pages/InterviewReview.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../App.css';
import './InterviewReview.css';

const InterviewReview = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [interview, setInterview] = useState(null);
    const [candidateInfo, setCandidateInfo] = useState(null);
    const [jobInfo, setJobInfo] = useState(null);
    const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [overallScore, setOverallScore] = useState(0);
    const [questionScores, setQuestionScores] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [decisionStatus, setDecisionStatus] = useState(null); // 'approve' or 'reject'

    // Fetch interview data when component mounts
    useEffect(() => {
        const fetchInterviewData = async () => {
            try {
                setIsLoading(true);

                // API URL for fetching interview data
                const API_URL = "http://localhost:8000"; // Update with your API URL
                const response = await fetch(`${API_URL}/api/interviews/${interviewId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch interview data');
                }

                const data = await response.json();

                // Set interview data
                setInterview(data.interview);

                // Initialize question scores
                const initialScores = {};
                data.interview.responses.forEach(response => {
                    initialScores[response.question_id] = response.analysis?.score || 0;
                });
                setQuestionScores(initialScores);

                // Set candidate info
                setCandidateInfo(data.candidate);

                // Set job info
                setJobInfo(data.job);

                // Set feedback and overall score if available
                if (data.interview.feedback) {
                    setFeedback(data.interview.feedback);
                }

                if (data.interview.score) {
                    setOverallScore(data.interview.score);
                }

            } catch (err) {
                console.error('Error fetching interview data:', err);
                setError('Failed to load interview data. Please try again later.');

                // For demo purposes, set mock data
                setMockData();

            } finally {
                setIsLoading(false);
            }
        };

        // Uncomment this when the API endpoint is ready
        // fetchInterviewData();

        // For now, use mock data
        setMockData();

    }, [interviewId]);

    // Set mock data for development purposes
    const setMockData = () => {
        const mockInterview = {
            interview_id: 'int-abc123xyz',
            candidate_id: 'cand-123456',
            job_id: 'job-654321',
            status: 'completed',
            created_at: '2025-03-18T14:30:00Z',
            completed_at: '2025-03-18T15:00:00Z',
            score: 75,
            feedback: 'Good communication skills but could improve on technical knowledge.',
            questions: [
                {
                    question_id: 'q-1',
                    text: 'Tell us about your experience with React development.',
                    time_limit_seconds: 60,
                    position: 1
                },
                {
                    question_id: 'q-2',
                    text: 'Describe a challenging project you worked on and how you overcame the difficulties.',
                    time_limit_seconds: 90,
                    position: 2
                },
                {
                    question_id: 'q-3',
                    text: 'How do you stay updated with the latest technologies in your field?',
                    time_limit_seconds: 60,
                    position: 3
                }
            ],
            responses: [
                {
                    question_id: 'q-1',
                    video_url: 'https://example.com/mock-video-1.mp4',
                    audio_url: 'https://example.com/mock-audio-1.mp3',
                    transcript: 'I have been working with React for about 3 years now. I\'ve built several single-page applications and components. I\'m familiar with hooks, context API, and Redux for state management. I\'ve also worked with Next.js for server-side rendering and static site generation.',
                    duration_seconds: 45,
                    analysis: {
                        score: 85,
                        clarity: 90,
                        relevance: 80,
                        confidence: 85,
                        feedback: 'Good clear explanation of React experience with specific technologies mentioned.'
                    }
                },
                {
                    question_id: 'q-2',
                    video_url: 'https://example.com/mock-video-2.mp4',
                    audio_url: 'https://example.com/mock-audio-2.mp3',
                    transcript: 'One challenging project was a real-time dashboard for a financial application. The main challenge was handling large amounts of data while maintaining performance. I implemented data virtualization and optimized rendering to improve performance. I also worked closely with the backend team to optimize API responses.',
                    duration_seconds: 78,
                    analysis: {
                        score: 75,
                        clarity: 70,
                        relevance: 85,
                        confidence: 75,
                        feedback: 'Good example but could provide more specific details about the technical solutions implemented.'
                    }
                },
                {
                    question_id: 'q-3',
                    video_url: 'https://example.com/mock-video-3.mp4',
                    audio_url: 'https://example.com/mock-audio-3.mp3',
                    transcript: 'I stay updated by following several tech blogs and newsletters. I also participate in online communities like Stack Overflow and GitHub. I try to work on personal projects to experiment with new technologies, and I attend workshops and webinars when possible.',
                    duration_seconds: 55,
                    analysis: {
                        score: 65,
                        clarity: 70,
                        relevance: 60,
                        confidence: 65,
                        feedback: 'Answer lacks specific examples of blogs or communities followed. Could be more detailed about learning methods.'
                    }
                }
            ]
        };

        const mockCandidate = {
            candidate_id: 'cand-123456',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            resume_url: 'https://example.com/jane-smith-resume.pdf',
            status: 'interviewed',
            skills: ['React', 'JavaScript', 'CSS', 'Node.js', 'GraphQL'],
            experience_years: 3.5,
            education: 'Bachelor of Science in Computer Science'
        };

        const mockJob = {
            job_id: 'job-654321',
            jobTitle: 'Senior Frontend Developer',
            jobDescription: 'We are looking for an experienced frontend developer with strong React skills to join our team.',
            minimumCGPA: 3.0,
            skills: ['React', 'JavaScript', 'CSS', 'HTML5', 'Redux'],
            languages: ['English'],
            createdAt: '2025-03-10T10:00:00Z'
        };

        setInterview(mockInterview);
        setCandidateInfo(mockCandidate);
        setJobInfo(mockJob);

        // Initialize question scores
        const initialScores = {};
        mockInterview.responses.forEach(response => {
            initialScores[response.question_id] = response.analysis?.score || 0;
        });
        setQuestionScores(initialScores);

        setFeedback(mockInterview.feedback || '');
        setOverallScore(mockInterview.score || 0);
        setIsLoading(false);
    };

    // Handle score change for a specific question
    const handleScoreChange = (questionId, score) => {
        setQuestionScores(prev => ({
            ...prev,
            [questionId]: parseInt(score, 10)
        }));

        // Calculate overall score as average of all question scores
        const scores = Object.values({ ...questionScores, [questionId]: parseInt(score, 10) });
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        setOverallScore(Math.round(average));
    };

    // Handle feedback change
    const handleFeedbackChange = (e) => {
        setFeedback(e.target.value);
    };

    // Save review
    const saveReview = async () => {
        try {
            setIsSubmitting(true);

            // Prepare review data
            const reviewData = {
                interview_id: interviewId,
                overall_score: overallScore,
                feedback: feedback,
                question_scores: questionScores
            };

            // API URL for saving review
            const API_URL = "http://localhost:8000"; // Update with your API URL
            const response = await fetch(`${API_URL}/api/interviews/${interviewId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save review');
            }

            // Show success message or redirect
            alert('Review saved successfully!');

        } catch (err) {
            console.error('Error saving review:', err);
            setError('Failed to save review. Please try again later.');

            // For demo purposes, show success anyway
            alert('Review saved successfully! (Demo mode)');

        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit final decision (approve or reject)
    const submitDecision = async (status) => {
        try {
            setIsSubmitting(true);

            // Prepare decision data
            const decisionData = {
                interview_id: interviewId,
                candidate_id: candidateInfo.candidate_id,
                status: status, // 'approve' or 'reject'
                feedback: feedback
            };

            // API URL for submitting decision
            const API_URL = "http://localhost:8000"; // Update with your API URL
            const response = await fetch(`${API_URL}/api/interviews/${interviewId}/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(decisionData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit decision');
            }

            // Show confirmation and redirect
            setDecisionStatus(status);
            setShowConfirmation(true);

        } catch (err) {
            console.error('Error submitting decision:', err);
            setError('Failed to submit decision. Please try again later.');

            // For demo purposes, show confirmation anyway
            setDecisionStatus(status);
            setShowConfirmation(true);

        } finally {
            setIsSubmitting(false);
        }
    };

    // Close confirmation and redirect
    const handleConfirmationClose = () => {
        setShowConfirmation(false);
        navigate('/screening'); // Redirect to candidates screening page
    };

    // Calculate the current response
    const currentResponse = interview?.responses ? interview.responses[currentResponseIndex] : null;
    const currentQuestion = currentResponse ? interview.questions.find(q => q.question_id === currentResponse.question_id) : null;

    // Format date string
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="review-loading-container">
                <div className="seesaw-container">
                    <div className="ball"></div>
                    <div className="bar"></div>
                </div>
                <p className="loading-text">Loading interview data...</p>
            </div>
        );
    }

    if (error && !interview) {
        return (
            <div className="review-error-container">
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h2>Error Loading Interview</h2>
                <p className="error-message">{error}</p>
                <button
                    className="retry-button"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (showConfirmation) {
        return (
            <div className="decision-confirmation-container">
                <div className="decision-confirmation-card">
                    <svg
                        className={`confirmation-icon ${decisionStatus === 'approve' ? 'approve-icon' : 'reject-icon'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {decisionStatus === 'approve' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        )}
                    </svg>

                    <h2 className="confirmation-title">
                        {decisionStatus === 'approve'
                            ? 'Candidate Approved Successfully'
                            : 'Candidate Rejected'}
                    </h2>

                    <p className="confirmation-message">
                        {decisionStatus === 'approve'
                            ? `An email has been sent to ${candidateInfo.name} with the job offer details.`
                            : `An email has been sent to ${candidateInfo.name} informing them that they were not selected for this position.`
                        }
                    </p>

                    <button
                        className="confirmation-button"
                        onClick={handleConfirmationClose}
                    >
                        Return to Candidates
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-review-container">
            <div className="review-header">
                <h1 className="review-title">Interview Review</h1>
                <button
                    className="back-button"
                    onClick={() => navigate('/screening')}
                >
                    <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Screening
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <svg className="error-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {error}
                </div>
            )}

            <div className="review-content">
                <div className="review-sidebar">
                    <div className="candidate-card">
                        <h3 className="card-heading">Candidate Information</h3>

                        <div className="candidate-details">
                            <p><strong>Name:</strong> {candidateInfo?.name}</p>
                            <p><strong>Email:</strong> {candidateInfo?.email}</p>
                            <p><strong>Experience:</strong> {candidateInfo?.experience_years} years</p>
                            <p><strong>Education:</strong> {candidateInfo?.education}</p>

                            {candidateInfo?.skills && (
                                <div className="candidate-skills">
                                    <p><strong>Skills:</strong></p>
                                    <div className="skills-list">
                                        {candidateInfo.skills.map((skill, index) => (
                                            <span key={index} className="skill-tag">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="candidate-actions">
                                <a
                                    href={candidateInfo?.resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="resume-link"
                                >
                                    <svg className="resume-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    View Resume
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="job-card">
                        <h3 className="card-heading">Job Information</h3>

                        <div className="job-details">
                            <p><strong>Title:</strong> {jobInfo?.jobTitle}</p>
                            <p><strong>Created:</strong> {formatDate(jobInfo?.createdAt)}</p>

                            {jobInfo?.skills && (
                                <div className="job-skills">
                                    <p><strong>Required Skills:</strong></p>
                                    <div className="skills-list">
                                        {jobInfo.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className={`skill-tag ${candidateInfo?.skills?.includes(skill) ? 'skill-match' : ''}`}
                                            >
                                                {skill}
                                                {candidateInfo?.skills?.includes(skill) && (
                                                    <svg className="match-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {jobInfo?.jobDescription && (
                                <div className="job-description">
                                    <p><strong>Description:</strong></p>
                                    <p className="description-text">{jobInfo.jobDescription}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="interview-info-card">
                        <h3 className="card-heading">Interview Information</h3>

                        <div className="interview-details">
                            <p><strong>ID:</strong> {interview?.interview_id}</p>
                            <p><strong>Created:</strong> {formatDate(interview?.created_at)}</p>
                            <p><strong>Completed:</strong> {formatDate(interview?.completed_at)}</p>
                            <p><strong>Status:</strong> <span className="status-tag">{interview?.status}</span></p>
                        </div>
                    </div>
                </div>

                <div className="review-main">
                    <div className="response-navigation">
                        <h3 className="navigation-title">Interview Responses</h3>

                        <div className="navigation-tabs">
                            {interview?.responses.map((response, index) => {
                                const question = interview.questions.find(q => q.question_id === response.question_id);
                                return (
                                    <button
                                        key={response.question_id}
                                        className={`navigation-tab ${index === currentResponseIndex ? 'active-tab' : ''}`}
                                        onClick={() => setCurrentResponseIndex(index)}
                                    >
                                        <span className="tab-number">{index + 1}</span>
                                        <span className="tab-title">{question?.text.substring(0, 30)}...</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="response-content">
                        {currentResponse && currentQuestion ? (
                            <>
                                <div className="question-display">
                                    <h3 className="question-title">Question {currentResponseIndex + 1}:</h3>
                                    <p className="question-text">{currentQuestion.text}</p>
                                    <p className="question-time">Time Limit: {currentQuestion.time_limit_seconds} seconds</p>
                                </div>

                                <div className="response-media">
                                    <div className="video-container">
                                        <h4 className="media-title">Video Response</h4>
                                        <video
                                            controls
                                            src={currentResponse.video_url}
                                            className="response-video"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>

                                    {currentResponse.audio_url && (
                                        <div className="audio-container">
                                            <h4 className="media-title">Audio Only</h4>
                                            <audio
                                                controls
                                                src={currentResponse.audio_url}
                                                className="response-audio"
                                            >
                                                Your browser does not support the audio tag.
                                            </audio>
                                        </div>
                                    )}
                                </div>

                                <div className="response-transcript">
                                    <h4 className="transcript-title">Transcript</h4>
                                    <div className="transcript-content">
                                        {currentResponse.transcript || 'No transcript available'}
                                    </div>
                                </div>

                                <div className="response-analysis">
                                    <h4 className="analysis-title">AI Analysis</h4>

                                    {currentResponse.analysis ? (
                                        <div className="analysis-content">
                                            <div className="analysis-scores">
                                                <div className="score-item">
                                                    <span className="score-label">Clarity</span>
                                                    <div className="score-bar-container">
                                                        <div
                                                            className="score-bar"
                                                            style={{ width: `${currentResponse.analysis.clarity}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="score-value">{currentResponse.analysis.clarity}</span>
                                                </div>

                                                <div className="score-item">
                                                    <span className="score-label">Relevance</span>
                                                    <div className="score-bar-container">
                                                        <div
                                                            className="score-bar"
                                                            style={{ width: `${currentResponse.analysis.relevance}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="score-value">{currentResponse.analysis.relevance}</span>
                                                </div>

                                                <div className="score-item">
                                                    <span className="score-label">Confidence</span>
                                                    <div className="score-bar-container">
                                                        <div
                                                            className="score-bar"
                                                            style={{ width: `${currentResponse.analysis.confidence}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="score-value">{currentResponse.analysis.confidence}</span>
                                                </div>
                                            </div>

                                            <div className="analysis-feedback">
                                                <p><strong>AI Feedback:</strong> {currentResponse.analysis.feedback}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="no-analysis">No AI analysis available for this response.</p>
                                    )}
                                </div>

                                <div className="hr-evaluation">
                                    <h4 className="evaluation-title">Your Evaluation</h4>

                                    <div className="score-input">
                                        <label htmlFor={`score-${currentResponse.question_id}`} className="score-label">
                                            Score (0-100):
                                        </label>
                                        <input
                                            id={`score-${currentResponse.question_id}`}
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={questionScores[currentResponse.question_id] || 0}
                                            onChange={(e) => handleScoreChange(currentResponse.question_id, e.target.value)}
                                            className="score-slider"
                                        />
                                        <span className="score-value">{questionScores[currentResponse.question_id] || 0}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="no-response">No response data available.</p>
                        )}
                    </div>

                    <div className="overall-evaluation">
                        <h3 className="evaluation-title">Overall Evaluation</h3>

                        <div className="overall-score">
                            <label htmlFor="overall-score" className="score-label">
                                Overall Score:
                            </label>
                            <div className="overall-score-display">
                                <input
                                    id="overall-score"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={overallScore}
                                    onChange={(e) => setOverallScore(parseInt(e.target.value, 10))}
                                    className="score-slider"
                                />
                                <span className="overall-score-value">{overallScore}</span>
                            </div>
                        </div>

                        <div className="overall-feedback">
                            <label htmlFor="feedback" className="feedback-label">
                                Feedback for Candidate:
                            </label>
                            <textarea
                                id="feedback"
                                value={feedback}
                                onChange={handleFeedbackChange}
                                className="feedback-textarea"
                                placeholder="Enter your feedback for the candidate..."
                                rows="4"
                            ></textarea>
                        </div>

                        <div className="evaluation-actions">
                            <button
                                className="save-button"
                                onClick={saveReview}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Review'}
                            </button>

                            <button
                                className="approve-button"
                                onClick={() => submitDecision('approve')}
                                disabled={isSubmitting}
                            >
                                Approve Candidate
                            </button>

                            <button
                                className="reject-button"
                                onClick={() => submitDecision('reject')}
                                disabled={isSubmitting}
                            >
                                Reject Candidate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewReview;