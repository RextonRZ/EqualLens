// src/components/pages/InterviewQuestions.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../../App.css';
import './Interview.css';

const InterviewQuestions = () => {
    const { interviewId, linkCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [interviewData, setInterviewData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [error, setError] = useState(null);
    const [interviewCompleted, setInterviewCompleted] = useState(false);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const previewVideoRef = useRef(null);

    // Get interview data from location state
    useEffect(() => {
        if (location.state && location.state.interview) {
            const interview = location.state.interview;
            setInterviewData(interview);

            // Sort questions by position
            const sortedQuestions = [...interview.questions].sort((a, b) => a.position - b.position);
            setQuestions(sortedQuestions);
        } else {
            // If no interview data is available, redirect to validator
            navigate(`/interview/${interviewId}/${linkCode}`);
        }
    }, [location, interviewId, linkCode, navigate]);

    // Clean up resources when component unmounts
    useEffect(() => {
        return () => {
            stopRecording();
            clearInterval(timerRef.current);
        };
    }, []);

    // Start camera when ready to record
    const startCamera = async () => {
        try {
            // Prevent multiple streams
            if (streamRef.current) {
                const tracks = streamRef.current.getTracks();
                tracks.forEach(track => track.stop());
            }

            // Get media stream with audio and video
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user', width: 1280, height: 720 }
            });

            streamRef.current = stream;

            // Set video source
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            return true;
        } catch (err) {
            console.error('Error accessing camera or microphone:', err);
            setError('Could not access camera or microphone. Please check your device permissions.');
            return false;
        }
    };

    // Start countdown before recording
    const startCountdown = async () => {
        const cameraReady = await startCamera();
        if (!cameraReady) return;

        setIsCountingDown(true);
        setCountdown(3);

        const countdownInterval = setInterval(() => {
            setCountdown((prevCount) => {
                if (prevCount <= 1) {
                    clearInterval(countdownInterval);
                    setIsCountingDown(false);
                    startRecording();
                    return 0;
                }
                return prevCount - 1;
            });
        }, 1000);
    };

    // Start recording
    const startRecording = () => {
        if (!streamRef.current) return;

        // Reset chunks
        chunksRef.current = [];

        // Create media recorder
        const mediaRecorder = new MediaRecorder(streamRef.current, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        mediaRecorderRef.current = mediaRecorder;

        // Handle data available event
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        // Handle recording stop event
        mediaRecorder.onstop = () => {
            // Create blob from chunks
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });

            // Set preview video source
            if (previewVideoRef.current) {
                previewVideoRef.current.src = URL.createObjectURL(blob);
            }

            setIsReviewing(true);
        };

        // Start recording
        mediaRecorder.start(1000); // Collect data in 1-second chunks

        // Start timer
        setRecordingTime(0);
        setIsRecording(true);

        // Update timer every second
        timerRef.current = setInterval(() => {
            setRecordingTime((prevTime) => {
                const currentQuestion = questions[currentQuestionIndex];
                const timeLimit = currentQuestion ? currentQuestion.time_limit_seconds : 60;

                // Stop recording if time limit is reached
                if (prevTime >= timeLimit - 1) {
                    stopRecording();
                    clearInterval(timerRef.current);
                    return timeLimit;
                }

                return prevTime + 1;
            });
        }, 1000);
    };

    // Stop recording
    const stopRecording = () => {
        // Clear timer
        clearInterval(timerRef.current);

        // Stop media recorder if exists
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Stop all tracks in the stream
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
    };

    // Submit response to server
    const submitResponse = async () => {
        if (chunksRef.current.length === 0) {
            setError('No recording available to submit.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            // Create video file from chunks
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const videoFile = new File([blob], `response-${currentQuestionIndex}.webm`, { type: 'video/webm' });

            // Create form data
            const formData = new FormData();
            formData.append('interview_id', interviewId);
            formData.append('question_id', questions[currentQuestionIndex].question_id);
            formData.append('duration_seconds', recordingTime);
            formData.append('video', videoFile);

            // API URL for response submission
            const API_URL = "http://localhost:8000"; // Update with your API URL
            const submitUrl = `${API_URL}/api/interviews/submit-response`;

            const response = await fetch(submitUrl, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit response');
            }

            // Move to next question or complete interview
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setIsReviewing(false);

                // Clean up preview
                if (previewVideoRef.current && previewVideoRef.current.src) {
                    URL.revokeObjectURL(previewVideoRef.current.src);
                    previewVideoRef.current.src = '';
                }
            } else {
                // Complete interview
                await completeInterview();
            }

        } catch (err) {
            console.error('Error submitting response:', err);
            setError(err.message || 'Failed to submit response');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Complete the interview
    const completeInterview = async () => {
        try {
            // API URL for completing interview
            const API_URL = "http://localhost:8000"; // Update with your API URL
            const completeUrl = `${API_URL}/api/interviews/complete`;

            const formData = new FormData();
            formData.append('interview_id', interviewId);

            const response = await fetch(completeUrl, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete interview');
            }

            // Mark interview as completed
            setInterviewCompleted(true);

        } catch (err) {
            console.error('Error completing interview:', err);
            setError(err.message || 'Failed to complete interview');
        }
    };

    // Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (!questions || questions.length === 0) return 0;
        return ((currentQuestionIndex + 1) / questions.length) * 100;
    };

    // Get current question
    const currentQuestion = questions[currentQuestionIndex] || {};

    // Render different screens based on state
    if (interviewCompleted) {
        return (
            <div className="interview-completed-container">
                <div className="interview-completed-card">
                    <div className="interview-logo">
                        EqualLens
                    </div>

                    <div className="completed-success">
                        <svg className="success-icon-large" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>

                        <h2>Interview Completed</h2>
                        <p className="completed-message">
                            Thank you for completing your interview with EqualLens. Your responses have been submitted successfully.
                        </p>
                        <p className="completed-info">
                            The hiring team will review your interview and get back to you soon.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-questions-container">
            <div className="interview-questions-card">
                <div className="interview-logo">
                    EqualLens
                </div>

                <div className="interview-progress">
                    <div className="progress-text">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <svg className="error-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {error}
                    </div>
                )}

                <div className="question-container">
                    <h3 className="question-text">
                        {currentQuestion.text || 'Loading question...'}
                    </h3>

                    {isReviewing ? (
                        <div className="review-container">
                            <div className="video-container">
                                <video
                                    ref={previewVideoRef}
                                    className="preview-video"
                                    controls
                                    autoPlay
                                    muted
                                ></video>
                            </div>

                            <div className="review-actions">
                                <button
                                    className="retry-button"
                                    onClick={() => {
                                        setIsReviewing(false);
                                        if (previewVideoRef.current && previewVideoRef.current.src) {
                                            URL.revokeObjectURL(previewVideoRef.current.src);
                                            previewVideoRef.current.src = '';
                                        }
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <svg className="retry-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    Try Again
                                </button>

                                <button
                                    className="submit-button"
                                    onClick={submitResponse}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                                </button>
                            </div>
                        </div>
                    ) : isRecording ? (
                        <div className="recording-container">
                            <div className="video-container">
                                <video
                                    ref={videoRef}
                                    className="recording-video"
                                    autoPlay
                                    playsInline
                                    muted
                                ></video>

                                <div className="recording-indicator">
                                    <div className="recording-dot"></div>
                                    <span className="recording-time">{formatTime(recordingTime)}</span>
                                </div>
                            </div>

                            <div className="recording-actions">
                                <button
                                    className="stop-button"
                                    onClick={stopRecording}
                                >
                                    <svg className="stop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
                                    </svg>
                                    Stop Recording
                                </button>
                            </div>
                        </div>
                    ) : isCountingDown ? (
                        <div className="countdown-container">
                            <div className="countdown-circle">
                                {countdown}
                            </div>
                            <p className="countdown-text">Recording will start soon...</p>
                        </div>
                    ) : (
                        <div className="start-recording-container">
                            <p className="time-limit-text">
                                You will have {currentQuestion.time_limit_seconds || 60} seconds to answer this question.
                            </p>

                            <button
                                className="record-button"
                                onClick={startCountdown}
                            >
                                <svg className="record-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                Start Recording
                            </button>

                            <div className="recording-tips">
                                <h4>Tips for a great interview:</h4>
                                <ul>
                                    <li>Find a quiet, well-lit space</li>
                                    <li>Speak clearly and at a moderate pace</li>
                                    <li>Remember to maintain eye contact with the camera</li>
                                    <li>Structure your answer with a beginning, middle, and conclusion</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewQuestions;