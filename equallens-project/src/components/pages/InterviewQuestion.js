import React, { useState, useEffect, useRef } from 'react';
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

function InterviewQuestions() {
    const { interviewId, linkCode } = useParams();
    const navigate = useNavigate();

    // State for questions and navigation
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [interviewComplete, setInterviewComplete] = useState(false);
    const [error, setError] = useState(null);

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const timerIntervalRef = useRef(null);

    // Recording state
    const [recording, setRecording] = useState(false);
    const [recorded, setRecorded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [videoBlob, setVideoBlob] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Media recorder refs
    const mediaRecorderRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);

    // Fetch interview questions on component mount
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);

                // Call API to get questions
                const response = await fetch(
                    `http://localhost:8000/api/interviews/questions/${interviewId}/${linkCode}`
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to fetch interview questions');
                }

                const questionsData = await response.json();

                if (!questionsData || questionsData.length === 0) {
                    throw new Error('No questions found for this interview');
                }

                setQuestions(questionsData);

                // Set initial timer
                setTimeRemaining(questionsData[0].timeLimit);

            } catch (error) {
                console.error("Error fetching questions:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();

        // Cleanup function to ensure all media is stopped
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [interviewId, linkCode]);

    // Setup media recorder when needed
    const setupMediaRecorder = async () => {
        if (streamRef.current) {
            // If there's an existing stream, stop all tracks
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            // Request camera and microphone permissions
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            streamRef.current = stream;

            // Display preview
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Create media recorder
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = mediaRecorder;

            // Setup event handlers
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setVideoBlob(blob);

                // Create URL for preview
                const videoURL = URL.createObjectURL(blob);
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                    videoRef.current.src = videoURL;
                    videoRef.current.controls = true;
                }

                setRecorded(true);
                setRecording(false);
            };

            return true;
        } catch (error) {
            console.error("Error setting up media recorder:", error);
            setError(`Error accessing camera/microphone: ${error.message}`);
            return false;
        }
    };

    // Timer effect
    useEffect(() => {
        if (timerActive && timeRemaining > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current);
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [timerActive]);

    const startRecording = async () => {
        // Reset recording state
        chunksRef.current = [];
        setRecorded(false);

        // Setup media recorder if not already done
        const success = await setupMediaRecorder();
        if (!success) return;

        // Start recording
        mediaRecorderRef.current.start();
        setRecording(true);

        // Start timer
        setTimerActive(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Stop timer
        setTimerActive(false);

        // Mark question as completed
        setCompleted(true);
    };

    const uploadRecording = async () => {
        if (!videoBlob) return;

        try {
            setUploading(true);
            setUploadProgress(0);

            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(videoBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;

                // Simulate progress for better UX
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (prev >= 90) {
                            clearInterval(progressInterval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 300);

                try {
                    // Prepare response data
                    const responseData = {
                        interviewId,
                        linkCode,
                        questionId: getCurrentQuestion().questionId,
                        videoResponse: base64data
                    };

                    // Submit to API
                    const response = await fetch('http://localhost:8000/api/interviews/submit-response', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(responseData)
                    });

                    clearInterval(progressInterval);

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Failed to upload recording');
                    }

                    // Upload complete
                    setUploadProgress(100);

                    // Get the response
                    const result = await response.json();

                    // Wait a moment and move to next question
                    setTimeout(() => {
                        moveToNextQuestion();
                    }, 1000);

                } catch (error) {
                    console.error("Error uploading recording:", error);
                    clearInterval(progressInterval);
                    setError(`Error uploading recording: ${error.message}`);
                    setUploading(false);
                }
            };

        } catch (error) {
            console.error("Error preparing recording:", error);
            setError(`Error preparing recording: ${error.message}`);
            setUploading(false);
        }
    };

    const getCurrentQuestion = () => {
        return questions[currentQuestionIndex] || { question: 'Loading...' };
    };

    const moveToNextQuestion = () => {
        // Stop current media
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Reset state
        setCompleted(false);
        setRecorded(false);
        setUploading(false);
        setUploadProgress(0);

        if (currentQuestionIndex < questions.length - 1) {
            // Move to next question
            setCurrentQuestionIndex(prev => prev + 1);

            // Set timer for next question
            setTimeRemaining(questions[currentQuestionIndex + 1].timeLimit);
        } else {
            // All questions completed
            completeInterview();
        }
    };

    const completeInterview = async () => {
        try {
            setLoading(true);

            // Call API to mark interview as complete
            const response = await fetch('http://localhost:8000/api/interviews/complete-interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    interview_id: interviewId,
                    link_code: linkCode
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to complete interview');
            }

            // Set completed state
            setInterviewComplete(true);

        } catch (error) {
            console.error("Error completing interview:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Format time in MM:SS
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // Get progress percentage
    const getProgressPercentage = () => {
        return `${Math.round(((currentQuestionIndex) / questions.length) * 100)}%`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <LoadingAnimation />
                <h2 style={{ marginTop: '30px', color: '#333' }}>Loading interview questions...</h2>
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
                    onClick={() => window.location.reload()}
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
                    Try Again
                </button>
            </div>
        );
    }

    if (interviewComplete) {
        return (
            <div style={{
                maxWidth: '800px',
                margin: '40px auto',
                padding: '30px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                }}>
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h1 style={{ color: '#333', fontSize: '32px', marginBottom: '20px' }}>Interview Complete!</h1>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    Thank you for completing your interview. Your responses have been recorded.
                </p>
                <p style={{ color: '#555', fontSize: '16px', marginBottom: '20px' }}>
                    Our team will review your responses and contact you regarding next steps.
                </p>
                <div style={{
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ color: '#333', marginBottom: '15px' }}>What happens next?</h3>
                    <p style={{ color: '#555', marginBottom: '10px' }}>
                        1. Our hiring team will review your interview responses.
                    </p>
                    <p style={{ color: '#555', marginBottom: '10px' }}>
                        2. You'll receive feedback within 5-7 business days.
                    </p>
                    <p style={{ color: '#555' }}>
                        3. If selected, you'll be invited for the next stage in the interview process.
                    </p>
                </div>
                <p style={{ color: '#777', fontSize: '14px' }}>
                    If you have any questions, please contact our hiring team at support@equallens.com
                </p>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '900px',
            margin: '40px auto',
            padding: '30px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            {/* Progress bar */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                        {getProgressPercentage()} Complete
                    </span>
                </div>
                <div style={{
                    height: '8px',
                    backgroundColor: '#f1f1f1',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: getProgressPercentage(),
                        backgroundColor: '#ef402d',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>

            {/* Question */}
            <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{ color: '#333', marginBottom: '10px', fontSize: '20px' }}>
                    Question {currentQuestionIndex + 1}:
                </h2>
                <p style={{ color: '#333', fontSize: '18px', lineHeight: '1.6' }}>
                    {getCurrentQuestion().question}
                </p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '15px',
                    padding: '8px 15px',
                    backgroundColor: timerActive ? '#fff8e1' : '#f5f5f5',
                    borderRadius: '20px',
                    width: 'fit-content'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={timerActive ? '#f57c00' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style={{
                        marginLeft: '5px',
                        color: timerActive ? '#f57c00' : '#666',
                        fontWeight: timerActive ? 'bold' : 'normal'
                    }}>
                        Time limit: {formatTime(timeRemaining)}
                    </span>
                </div>
            </div>

            {/* Video recording area */}
            <div style={{
                padding: '20px',
                border: '1px solid #eee',
                borderRadius: '8px',
                marginBottom: '30px'
            }}>
                <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '56.25%', /* 16:9 aspect ratio */
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginBottom: '20px'
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={!recorded} // Only mute during recording preview
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)' // Mirror effect while recording
                        }}
                    />

                    {recording && (
                        <div style={{
                            position: 'absolute',
                            top: '15px',
                            left: '15px',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#f44336',
                                borderRadius: '50%',
                                marginRight: '8px',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            <span>Recording... {formatTime(timeRemaining)}</span>
                            <style>{`
                                @keyframes pulse {
                                    0% { opacity: 1; }
                                    50% { opacity: 0.5; }
                                    100% { opacity: 1; }
                                }
                            `}</style>
                        </div>
                    )}

                    {uploading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'white'
                        }}>
                            <p style={{ marginBottom: '15px', fontSize: '18px' }}>Uploading your response...</p>
                            <div style={{ width: '70%', maxWidth: '300px' }}>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${uploadProgress}%`,
                                        backgroundColor: '#4caf50',
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                    {uploadProgress}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '15px',
                    marginTop: '20px'
                }}>
                    {!recording && !recorded && !completed && (
                        <button
                            onClick={startRecording}
                            style={{
                                backgroundColor: '#ef402d',
                                color: 'white',
                                border: 'none',
                                padding: '12px 30px',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Start Recording
                        </button>
                    )}

                    {recording && (
                        <button
                            onClick={stopRecording}
                            style={{
                                backgroundColor: '#e53935',
                                color: 'white',
                                border: 'none',
                                padding: '12px 30px',
                                borderRadius: '4px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                            </svg>
                            Stop Recording
                        </button>
                    )}

                    {recorded && !uploading && (
                        <>
                            <button
                                onClick={() => {
                                    setRecorded(false);
                                    setTimeRemaining(getCurrentQuestion().timeLimit);
                                }}
                                style={{
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Record Again
                            </button>

                            <button
                                onClick={uploadRecording}
                                style={{
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                Submit Response
                            </button>
                        </>
                    )}

                    {completed && !recorded && !uploading && (
                        <div style={{ textAlign: 'center', color: '#4caf50' }}>
                            <p style={{ marginBottom: '10px', fontSize: '16px' }}>
                                Time's up! Your response has been automatically recorded.
                            </p>
                            <button
                                onClick={uploadRecording}
                                style={{
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Submit Response
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '8px'
            }}>
                <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '18px' }}>Instructions:</h3>
                <ul style={{ color: '#555', paddingLeft: '20px', lineHeight: '1.5' }}>
                    <li>Click "Start Recording" when you're ready to answer</li>
                    <li>You have {formatTime(getCurrentQuestion().timeLimit)} to respond</li>
                    <li>Recording will automatically stop when time is up</li>
                    <li>Review your recording before submitting</li>
                    <li>When you're satisfied with your answer, click "Submit Response"</li>
                </ul>
            </div>
        </div>
    );
}

export default InterviewQuestions;