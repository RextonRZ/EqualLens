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

// Custom header for interview pages only
const InterviewHeader = () => {
    // Add Google Fonts import for a similar font
    useEffect(() => {
        // Add Google Fonts link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400&display=swap';
        document.head.appendChild(link);
        
        return () => {
            // Clean up
            document.head.removeChild(link);
        };
    }, []);

    return (
        <div style={{
            background: 'linear-gradient(90deg, rgb(226, 83, 95) 0%, rgb(249, 100, 95) 100%)',
            height: '80px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            width: '100%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80px',
                maxWidth: '1500px',
                width: '100%'
            }}>
                <div style={{
                    color: '#fff',
                    fontSize: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <img 
                      src="/equalLensLogoWhite.png" 
                      alt="EqualLens Logo Light" 
                      className="navbar-logo-image" 
                    />
                    <span style={{
                        fontFamily: "'Nunito', 'Arial', sans-serif",
                        fontWeight: '300', // Lighter weight to match logo
                        letterSpacing: '1px', // More spacing between letters
                        marginTop:'5px',
                        marginLeft: '7px', // Add some space between logo and text
                        fontSize: '2.1rem', // Slightly smaller to balance with logo
                        opacity: '0.95' // Slightly less opaque to appear lighter
                    }}>
                        Interview
                    </span>
                </div>
            </div>
        </div>
    );
};

// Initial Reminder Popup component - NEW
const InitialReminderPopup = ({ onUnderstand }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '550px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#fff8e1',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px' // Adjusted margin shorthand
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f57c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h2 style={{ color: '#f57c00', marginBottom: '15px', fontSize: '24px' }}>
                    Important Instructions
                </h2>
                <div style={{
                    textAlign: 'left',
                    backgroundColor: '#fff8e1',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <ul style={{ paddingLeft: '20px', color: '#333', lineHeight: '1.6' }}>
                        <li><strong>You will have 20 seconds to read each question</strong> before recording begins</li>
                        <li><strong>You have only ONE chance to record</strong> your answer for each question</li>
                        <li>Recording will automatically start after the reading time</li>
                        <li>You can stop recording early if you finish your answer</li>
                        <li>Once you stop recording, you cannot re-record your answer</li>
                    </ul>
                </div>
                <p style={{ color: '#555', fontSize: '16px', marginBottom: '25px' }}>
                    Please ensure you are in a quiet environment with good lighting and a working microphone before proceeding.
                </p>
                <button
                    onClick={onUnderstand}
                    style={{
                        backgroundColor: '#ef402d',
                        color: 'white',
                        border: 'none',
                        padding: '14px 30px',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#d63020'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef402d'}
                >
                    I Understand
                </button>
            </div>
        </div>
    );
};

// Reading Popup component - NEW
const ReadingPopup = ({ question, timeRemaining, onStartRecording, currentQuestionIndex }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999, // Ensure this is high enough
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '700px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)' // Corrected property name
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ color: '#333', margin: 0, fontSize: '20px' }}>
                        Question {currentQuestionIndex + 1}
                    </h2>
                    <div style={{
                        backgroundColor: '#f57c00',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Reading: {timeRemaining}s
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '25px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.05)'
                }}>
                    <p style={{
                        color: '#333',
                        fontSize: '22px', // Bigger font size for question
                        lineHeight: '1.6',
                        margin: 0,
                        fontWeight: '500'
                    }}>
                        {question}
                    </p>
                </div>

                <p style={{ color: '#555', fontSize: '16px', margin: '20px 0' }}>
                    Recording will automatically start when the timer reaches zero.
                    You will only have ONE chance to record your answer.
                </p>

                {timeRemaining <= 10 && (
                    <div style={{
                        backgroundColor: '#ffebee',
                        padding: '12px 15px',
                        borderRadius: '6px',
                        color: '#d32f2f',
                        fontWeight: '500',
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line> // Corrected SVG syntax
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Prepare to answer! Recording will begin in {timeRemaining} seconds.
                    </div>
                )}
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
    const [completed, setCompleted] = useState(false); // Note: completed seems unused, maybe remove?
    const [interviewComplete, setInterviewComplete] = useState(false);
    const [error, setError] = useState(null);
    const [sectionTitle, setSectionTitle] = useState('');

    // Added state for popups - NEW
    const [showInitialReminder, setShowInitialReminder] = useState(true); // Start with the reminder
    const [showReadingPopup, setShowReadingPopup] = useState(false); // Reading popup starts hidden
    const [isFirstQuestion, setIsFirstQuestion] = useState(true); // Note: isFirstQuestion seems unused, maybe remove?
    // Reading timer state
    const [readingTimeRemaining, setReadingTimeRemaining] = useState(20);
    const [isReading, setIsReading] = useState(true); // Start in reading mode
    const readingTimerIntervalRef = useRef(null);
    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0); // Main recording timer
    const [timerActive, setTimerActive] = useState(false);
    const [maxTimeLimit, setMaxTimeLimit] = useState(0); // Store original limit per question
    const [totalElapsedTime, setTotalElapsedTime] = useState(0); // Note: totalElapsedTime seems unused, maybe remove?
    const timerIntervalRef = useRef(null);
    // Recording state
    const [recording, setRecording] = useState(false);
    const [recorded, setRecorded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [videoBlob, setVideoBlob] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [hasRecordedOnce, setHasRecordedOnce] = useState(false); // Track if recording started for the current question
    const [shouldAutoStart, setShouldAutoStart] = useState(false); // Flag to trigger recording start
    // Media recorder refs
    const mediaRecorderRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);

    // Hide the main navbar when this component is mounted
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .navbar {
                display: none !important;
            }
            body {
                padding-top: 0 !important; /* Adjust body padding if navbar added space */
            }
        `;
        document.head.appendChild(style);

        // Clean up when component unmounts
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Block navigation attempts during recording/processing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (recording || uploading) { // Check if actively recording or uploading
                const message = "You have an ongoing recording or upload. Are you sure you want to leave? Your progress may be lost.";
                e.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [recording, uploading]); // Dependencies updated
    // Fetch interview questions on component mount
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setLoading(true);
                setError(null); // Clear previous errors

                const response = await fetch(
                    `http://localhost:8000/api/interviews/questions/${interviewId}/${linkCode}`
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' })); // Graceful error parsing
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`); // Improved error message
                }

                const questionsData = await response.json();
                console.log("Raw API response:", questionsData);

                if (!Array.isArray(questionsData) || questionsData.length === 0) { // Check if it's an array
                    throw new Error('No questions found or invalid format for this interview');
                }

                // Ensure timeLimit is a number, provide default if missing/invalid
                const validatedQuestions = questionsData.map(q => ({
                    questionId: q.questionId,
                    question: q.question || 'Question text missing',
                    timeLimit: Number.isFinite(q.timeLimit) && q.timeLimit > 0 ? q.timeLimit : 120, // Default to 120s if invalid
                    sectionTitle: q.sectionTitle || 'General' // Default section title
                }));
                setQuestions(validatedQuestions);

                if (validatedQuestions.length > 0) {
                    setSectionTitle(validatedQuestions[0].sectionTitle);
                    const initialTimeLimit = validatedQuestions[0].timeLimit;
                    setTimeRemaining(initialTimeLimit); // Set initial recording time limit
                    setMaxTimeLimit(initialTimeLimit); // Store it
                }

                // Initial state setup for the first question (popups handled separately)
                setIsReading(true);
                setReadingTimeRemaining(20);
                setShowInitialReminder(true); // Show initial reminder first
                setShowReadingPopup(false);   // Keep reading popup hidden initially

            } catch (error) {
                console.error("Error fetching questions:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
        // Cleanup function
        return () => {
            // Stop any active stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            // Clear intervals
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (readingTimerIntervalRef.current) {
                clearInterval(readingTimerIntervalRef.current);
            }
        };
    }, [interviewId, linkCode]); // Dependencies for fetching
    // Update section title and reset state when question changes
    useEffect(() => {
        if (questions.length > 0 && currentQuestionIndex < questions.length) {
            const currentQuestion = questions[currentQuestionIndex];
            setSectionTitle(currentQuestion.sectionTitle);

            // Reset state for the new question
            setIsReading(true);
            setReadingTimeRemaining(20);
            setTimerActive(false);
            setRecording(false);
            setHasRecordedOnce(false);
            setRecorded(false);
            setUploading(false);
            setVideoBlob(null);
            setShouldAutoStart(false);

            // Show reading popup (unless it's the very first question handled by initial reminder flow)
            if (currentQuestionIndex > 0) { // Only show reading popup directly for subsequent questions
                setShowReadingPopup(true);
            }

            // Set timer for the new question
            const newTimeLimit = currentQuestion.timeLimit;
            setTimeRemaining(newTimeLimit);
            setMaxTimeLimit(newTimeLimit);
        }
    }, [currentQuestionIndex, questions]); // Rerun when index or questions array changes
    // Start reading timer when the reading popup is shown
    useEffect(() => {
        if (showReadingPopup && isReading && readingTimeRemaining > 0) {
            // Clear any existing interval first
            if (readingTimerIntervalRef.current) {
                clearInterval(readingTimerIntervalRef.current);
            }

            readingTimerIntervalRef.current = setInterval(() => {
                setReadingTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(readingTimerIntervalRef.current);
                        setIsReading(false);
                        setShowReadingPopup(false); // Hide popup
                        setShouldAutoStart(true); // Trigger auto-start
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        // Cleanup function for this effect
        return () => {
            if (readingTimerIntervalRef.current) {
                clearInterval(readingTimerIntervalRef.current);
            }
        };
    }, [showReadingPopup, isReading]); // Dependencies: run when popup visibility or reading state changes
    // Auto-start recording after reading time ends
    useEffect(() => {
        let startTimer;
        if (shouldAutoStart && !isReading && !recording && !recorded) {
            // Using a short timeout allows UI updates (hiding popup) to render first
            startTimer = setTimeout(() => {
                startRecording();
                setShouldAutoStart(false); // Reset the flag
            }, 300); // Small delay (e.g., 300ms)
        }
        // Cleanup timeout if dependencies change before it fires
        return () => clearTimeout(startTimer);
    }, [shouldAutoStart, isReading, recording, recorded]); // Dependencies for auto-start
    // Setup media recorder (can be called on demand)
    const setupMediaRecorder = async () => {
        // Ensure existing stream is stopped before getting a new one
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.controls = false; // Ensure controls are off during recording preview
                videoRef.current.muted = true; // Mute preview to avoid feedback
            }

            // Check for supported MIME types
            const options = { mimeType: 'video/webm;codecs=vp9' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} not supported, trying vp8`);
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.warn(`${options.mimeType} also not supported, using default.`);
                    options.mimeType = 'video/webm'; // Fallback to basic webm
                }
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = []; // Clear previous chunks

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            mediaRecorder.onstop = () => {
                console.log("Recording stopped. Chunks available:", chunksRef.current.length);
                const blob = new Blob(chunksRef.current, { type: options.mimeType });
                setVideoBlob(blob);

                // Stop the stream tracks *after* blob is created
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Show preview of the recorded video
                const videoURL = URL.createObjectURL(blob);
                if (videoRef.current) {
                    videoRef.current.srcObject = null; // Remove stream source
                    videoRef.current.src = videoURL;
                    videoRef.current.muted = false; // Unmute for playback
                    videoRef.current.controls = true; // Show controls for playback
                }

                setRecorded(true);
                setRecording(false); // Update state: no longer recording

                // Auto submit after a short delay to allow state updates
                setTimeout(() => {
                    if (blob.size > 0) { // Only upload if there's data
                        uploadRecording(blob); // Pass the blob directly
                    } else {
                        console.warn("Blob size is 0, skipping upload.");
                        // Handle this case - maybe show an error or move on?
                        setError("Recording failed to capture video data.");
                        // Optionally move to next question even on failure, or allow retry?
                        // moveToNextQuestion(); // Decide on flow for zero-byte recording
                    }
                }, 500); // Short delay before uploading
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                setError(`Recording error: ${event.error.name}`);
                stopRecording(); // Attempt to stop gracefully
            };

            return true; // Indicate success
        } catch (error) {
            console.error("Error accessing media devices:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setError('Camera/Microphone access denied. Please grant permission in your browser settings and refresh.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                setError('No suitable camera/microphone found. Please ensure they are connected and enabled.');
            } else {
                setError(`Error accessing camera/microphone: ${error.message}`);
            }
            setLoading(false); // Stop loading if permission fails
            setShowInitialReminder(false); // Hide popups if setup fails
            setShowReadingPopup(false);
            return false; // Indicate failure
        }
    };
    // Main Recording Timer effect
    useEffect(() => {
        if (timerActive && timeRemaining > 0) {
            // Clear any existing interval first
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }

            timerIntervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current);
                        stopRecording(); // Automatically stop when time runs out
                        return 0;
                    }
                    return prev - 1;
                });
                // Note: totalElapsedTime state was here but seemed unused
            }, 1000);
        } else if (!timerActive) {
            // Clear interval if timer becomes inactive
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }

        // Cleanup function for this effect
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [timerActive, timeRemaining]); // Dependencies: run when active state or time changes
    // Handle clicking "I Understand" on the initial reminder
    const handleInitialReminderClose = () => {
        setShowInitialReminder(false); // Hide reminder
        setShowReadingPopup(true);     // Show reading popup for the first question
    };
    // Start Recording function
    const startRecording = async () => {
        if (hasRecordedOnce) {
            console.warn("Attempted to record again for the same question.");
            return; // Prevent re-recording for the same question
        }

        setRecorded(false); // Ensure recorded state is false
        setVideoBlob(null); // Clear any previous blob
        setError(null);     // Clear previous errors
        setHasRecordedOnce(true); // Mark that recording has started for this attempt

        // Set timer to the max limit for this question
        setTimeRemaining(maxTimeLimit);

        // Setup media recorder and get stream
        const success = await setupMediaRecorder();
        if (!success) {
            setHasRecordedOnce(false); // Reset if setup failed
            return; // Stop if setup failed (e.g., permissions denied)
        }

        // Ensure recorder is ready before starting
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current.start();
            console.log("Recording started.");
            setRecording(true); // Set recording state
            setTimerActive(true); // Start the countdown timer
        } else {
            console.error("MediaRecorder not ready or already recording.");
            setError("Could not start recording. Please refresh and try again.");
            setHasRecordedOnce(false); // Reset flag if start fails
        }
    };
    // Stop Recording function (called by button or timer end)
    const stopRecording = () => {
        console.log("Stop recording called. Recorder state:", mediaRecorderRef.current?.state);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // This triggers 'onstop' handler
            console.log("MediaRecorder.stop() called.");
        } else {
            // If already stopped or inactive, ensure state is correct and tracks are stopped
            console.warn("Stop recording called but recorder was not in 'recording' state.");
            setRecording(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        }

        setTimerActive(false); // Stop the countdown timer
        // Note: stream tracks are now stopped within the 'onstop' handler
        // setRecording(false); // State is set in 'onstop' handler
    };

    // Upload Recording function (now accepts blob)
    const uploadRecording = async (blobToUpload) => {
        if (!blobToUpload || blobToUpload.size === 0) {
            console.error("Upload attempt with no valid video blob.");
            setError("Failed to record video data. Cannot upload.");
            // Consider how to proceed - maybe move to next question anyway?
            // moveToNextQuestion();
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setError(null); // Clear previous errors

        // Use FileReader to convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blobToUpload);
        reader.onloadend = async () => {
            const base64data = reader.result;
            if (!base64data) {
                setError("Failed to read recording data for upload.");
                setUploading(false);
                return;
            }

            // Simulate upload progress (optional, for UX)
            let currentProgress = 0;
            const progressInterval = setInterval(() => {
                currentProgress += 10;
                if (currentProgress >= 90) {
                    clearInterval(progressInterval);
                    setUploadProgress(90);
                } else {
                    setUploadProgress(currentProgress);
                }
            }, 150); // Faster simulation interval

            try {
                const responseData = {
                    interviewId,
                    linkCode,
                    questionId: getCurrentQuestion().questionId,
                    videoResponse: base64data // Send base64 string
                };

                const response = await fetch('http://localhost:8000/api/interviews/submit-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(responseData)
                });

                clearInterval(progressInterval); // Stop simulation

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
                    throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
                }

                setUploadProgress(100); // Mark as complete
                const result = await response.json();
                console.log("Upload successful:", result);

                // Wait a moment for user to see completion, then move on
                setTimeout(() => {
                    moveToNextQuestion();
                }, 1000); // 1 second delay

            } catch (error) {
                console.error("Error uploading recording:", error);
                clearInterval(progressInterval); // Ensure interval is cleared on error
                setError(`Upload failed: ${error.message}`);
                setUploading(false); // Reset uploading state on error
                setUploadProgress(0); // Reset progress
                // Decide if user should be stuck here or move on despite upload failure
            }
        };
        reader.onerror = () => {
            console.error("FileReader error reading blob");
            setError("Error reading recorded video data.");
            setUploading(false);
        };
    };
    // Helper to get current question data safely
    const getCurrentQuestion = () => {
        return questions[currentQuestionIndex] || { question: 'Loading...', timeLimit: 0, questionId: null, sectionTitle: '' };
    };

    // Move to the next question or complete the interview
    const moveToNextQuestion = () => {
        console.log("Moving to next question or completing.");
        // Stop any lingering media streams or timers
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (readingTimerIntervalRef.current) clearInterval(readingTimerIntervalRef.current);

        // Reset video element for the next question's preview
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = "";
            videoRef.current.controls = false;
            videoRef.current.muted = true; // Mute again for next preview
        }

        // Reset state for the next question (most reset happens in useEffect for index change)
        // setCompleted(false); // Seems unused
        setRecorded(false);
        setUploading(false);
        setUploadProgress(0);
        setVideoBlob(null);
        setHasRecordedOnce(false);
        setShouldAutoStart(false);
        // setIsFirstQuestion(false); // Seems unused
        setError(null); // Clear errors from previous question

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1); // Trigger useEffect for index change
        } else {
            completeInterview(); // All questions done
        }
    };

    // Mark the interview as complete via API
    const completeInterview = async () => {
        console.log("Completing interview.");
        try {
            setLoading(true); // Show loading indicator
            setError(null);

            const response = await fetch('http://localhost:8000/api/interviews/complete-interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    interview_id: interviewId, // Ensure keys match backend expectations
                    link_code: linkCode
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
                throw new Error(errorData.detail || 'Failed to mark interview as complete');
            }

            setInterviewComplete(true); // Set state to show completion screen
        } catch (error) {
            console.error("Error completing interview:", error);
            setError(`Failed to complete interview: ${error.message}`);
        } finally {
            setLoading(false); // Hide loading indicator
        }
    };
    // Format time helper MM:SS
    const formatTime = (seconds) => {
        const totalSeconds = Math.max(0, Math.floor(seconds)); // Ensure non-negative integer
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };
    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (!questions || questions.length === 0) return '0%';
        // Progress based on the *next* question index (0-based) vs total
        return `${Math.round((currentQuestionIndex / questions.length) * 100)}%`;
    };

    // Conditional Rendering Logic
    return (
        <>
            <InterviewHeader />

            {/* Initial Reminder (only shown at start, before reading first question) */}
            {showInitialReminder && !loading && !error && !interviewComplete && (
                <InitialReminderPopup onUnderstand={handleInitialReminderClose} />
            )}

            {/* Reading Popup (shown during reading time for each question) */}
            {showReadingPopup && !loading && !error && !interviewComplete && (
                <ReadingPopup
                    question={getCurrentQuestion().question}
                    timeRemaining={readingTimeRemaining}
                    currentQuestionIndex={currentQuestionIndex}
                />
            )}

            {/* Main Content Area (Loading, Error, Completion, or Interview Question) */}
            <div style={{ display: showInitialReminder || showReadingPopup ? 'none' : 'block' }}> {/* Hide main content if a popup is active */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '20px' }}> {/* Adjusted height */}
                        <LoadingAnimation />
                        <h2 style={{ marginTop: '30px', color: '#333' }}>Loading interview...</h2> {/* Updated text */}
                    </div>
                ) : error ? (
                    // Error Display
                    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}> {/* */}
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#ffdddd', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}> {/* */}
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h2 style={{ color: '#e53935', marginBottom: '20px' }}>Error</h2>
                        <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px', whiteSpace: 'pre-wrap' }}> {/* Allow line breaks in error message */}
                            {error}
                        </p>
                        {/* Only show refresh button if it's not a permission error */}
                        {!error.includes('permission') && !error.includes('denied') && !error.includes('found') && (
                            <button onClick={() => window.location.reload()} style={{ backgroundColor: '#ef402d', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}> {/* */}
                                Try Again
                            </button>
                        )}
                    </div>
                ) : interviewComplete ? (
                    // Interview Completion Screen
                    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 6px 18px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}> {/* */}
                        <div style={{ width: '100px', height: '100px', backgroundColor: '#e8f5e9', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 25px' }}> {/* */}
                            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <h1 style={{ color: '#333', fontSize: '32px', fontWeight: '600', marginBottom: '20px' }}>Interview Complete!</h1> {/* */}
                        <p style={{ color: '#555', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>
                            Thank you for completing your interview. Your responses have been successfully submitted. {/* */}
                        </p>
                        <div style={{ padding: '25px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '30px', textAlign: 'left' }}> {/* */}
                            <h3 style={{ color: '#333', marginBottom: '15px', fontWeight: '500' }}>What happens next?</h3>
                            <p style={{ color: '#555', marginBottom: '10px' }}>1. Our hiring team will carefully review your interview responses.</p> {/* */}
                            <p style={{ color: '#555', marginBottom: '10px' }}>2. We aim to provide feedback or next steps within 5-7 business days.</p> {/* */}
                            <p style={{ color: '#555' }}>3. If you are selected to move forward, we will contact you to schedule the next stage.</p> {/* */}
                        </div>
                        <p style={{ color: '#777', fontSize: '14px' }}>
                            If you have any urgent questions, please contact our hiring team at support@equallens.com.
                        </p>
                    </div>
                ) : (
                    // Main Interview Question Display
                    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}> {/* */}
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666' }}> {/* */}
                                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                <span>{getProgressPercentage()} Complete</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}> {/* */}
                                <div style={{ height: '100%', width: getProgressPercentage(), backgroundColor: '#ef402d', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} /> {/* */}
                            </div>
                        </div>

                        {/* Section Title */}
                        {sectionTitle && (
                            <div style={{ backgroundColor: '#e3f2fd', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', borderLeft: '5px solid #2196f3' }}> {/* */}
                                <h2 style={{ color: '#0d47a1', margin: 0, fontSize: '18px', fontWeight: '500' }}> {/* */}
                                    Section: {sectionTitle}
                                </h2>
                            </div>
                        )}

                        {/* Question Text */}
                        <div style={{ backgroundColor: '#f9f9f9', padding: '25px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #eee' }}> {/* */}
                            <h2 style={{ color: '#333', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>
                                Question {currentQuestionIndex + 1}:
                            </h2>
                            <p style={{ color: '#333', fontSize: '18px', lineHeight: '1.6', margin: 0 }}>
                                {getCurrentQuestion().question}
                            </p>
                            {/* Time Limit Display */}
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px', padding: '8px 15px', backgroundColor: timerActive ? '#fff8e1' : '#f0f0f0', borderRadius: '20px', width: 'fit-content', border: `1px solid ${timerActive ? '#f57c00' : '#ddd'}` }}> {/* */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={timerActive ? '#f57c00' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* */}
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span style={{ marginLeft: '8px', color: timerActive ? '#f57c00' : '#555', fontWeight: timerActive ? 'bold' : 'normal', fontSize: '14px' }}> {/* */}
                                    Time limit: {formatTime(maxTimeLimit)} {/* Show max limit */} | Remaining: {formatTime(timeRemaining)} {/* Show remaining */}
                                </span>
                            </div>
                        </div>

                        {/* Video Area */}
                        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '30px', backgroundColor: '#fdfdfd' }}> {/* */}
                            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}> {/* */}
                                {/* Mirrored Video Container */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: (recording && !recorded) ? 'scaleX(-1)' : 'none', transition: 'transform 0.3s' }}> {/* */}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted={!recorded} // Mute during preview, unmute for playback
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} //
                                    />
                                </div>

                                {/* Recording Indicator */}
                                {recording && (
                                    <div style={{ position: 'absolute', top: '15px', left: '15px', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', zIndex: 10, fontSize: '14px' }}> {/* */}
                                        <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f44336', borderRadius: '50%', marginRight: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} /> {/* */}
                                        <span>Recording... {formatTime(timeRemaining)}</span>
                                        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style> {/* Simplified pulse */}
                                    </div>
                                )}

                                {/* Uploading Overlay */}
                                {uploading && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', zIndex: 11 }}> {/* */}
                                        <p style={{ marginBottom: '15px', fontSize: '18px' }}>Uploading response...</p>
                                        <div style={{ width: '70%', maxWidth: '300px' }}> {/* */}
                                            <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: '5px', overflow: 'hidden' }}> {/* */}
                                                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#4caf50', borderRadius: '5px', transition: 'width 0.2s linear' }} /> {/* */}
                                            </div>
                                            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px' }}>{uploadProgress}%</div> {/* */}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons Area */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', minHeight: '50px' }}> {/* */}
                                {/* Show Stop Button only when actively recording */}
                                {!isReading && !showReadingPopup && recording && !recorded && !uploading && (
                                    <button
                                        onClick={stopRecording}
                                        disabled={uploading} // Disable if uploading starts somehow concurrently
                                        style={{ backgroundColor: '#e53935', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }} //
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#c62828'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#e53935'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"> {/* Adjusted icon */}
                                            <rect x="6" y="6" width="12" height="12" rx="1" ry="1"></rect>
                                        </svg>
                                        End Recording Early
                                    </button>
                                )}

                                {/* Display confirmation/uploading status after recording stops */}
                                {recorded && !uploading && (
                                    <div style={{ textAlign: 'center', color: '#4caf50', fontSize: '16px', fontWeight: '500' }}>
                                        <p>Response recorded. Submitting automatically...</p> {/* */}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Instructions Reminder */}
                        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}> {/* */}
                            <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '18px', fontWeight: '500' }}>Key Reminders:</h3>
                            <ul style={{ color: '#555', paddingLeft: '25px', lineHeight: '1.7', margin: 0 }}>
                                <li>The timer shows your remaining response time.</li> {/* Simplified */}
                                <li>You have <strong>one chance</strong> to record your answer for this question.</li> {/* Emphasized */}
                                <li>Recording stops automatically when time runs out or if you end it early.</li> {/* Combined */}
                                <li>Your answer submits automatically after recording.</li> {/* */}
                            </ul>
                        </div>
                    </div>
                )}
            </div> {/* End Main Content Area Wrapper */}
        </>
    );
}

export default InterviewQuestions;