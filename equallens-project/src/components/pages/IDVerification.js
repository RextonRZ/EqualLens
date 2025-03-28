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

function IDVerification() {
    const { interviewId, linkCode } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [interviewData, setInterviewData] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Image capture states
    const [capturedImage, setCapturedImage] = useState(null);
    const [method, setMethod] = useState('choose'); // 'choose', 'camera', or 'upload'

    // Refs
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Validate the interview link on component mount
    useEffect(() => {
        const validateLink = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8000/api/interviews/validate/${interviewId}/${linkCode}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Invalid interview link');
                }

                const data = await response.json();
                setInterviewData(data);

                // If already verified, redirect to questions
                if (data.verificationCompleted) {
                    navigate(`/interview/${interviewId}/${linkCode}/questions`);
                }
            } catch (error) {
                console.error("Error validating interview link:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        validateLink();

        // Cleanup function
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [interviewId, linkCode, navigate]);

    // Handle file upload
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setErrorMessage(null);

        // Check file type
        if (!file.type.match('image.*')) {
            setErrorMessage('Please select an image file (JPG, PNG, etc.)');
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage('Image file is too large. Please select an image under 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setCapturedImage(e.target.result);
        };
        reader.onerror = () => {
            setErrorMessage('Error reading file. Please try another file.');
        };
        reader.readAsDataURL(file);
    };

    // Start camera
    const startCamera = async () => {
        try {
            setErrorMessage(null);

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => {
                    console.error("Error playing video:", e);
                    setErrorMessage("Error starting camera. Please try the file upload option instead.");
                    setMethod('upload');
                });
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setErrorMessage("Could not access camera. Please use the file upload option instead.");
            setMethod('upload');
        }
    };

    // Stop camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Capture photo from video stream - simplified approach
    const capturePhoto = () => {
        try {
            setErrorMessage(null);

            // Create a canvas element
            const canvas = document.createElement('canvas');
            const video = videoRef.current;

            // Use fixed dimensions if video dimensions aren't available
            const width = video.videoWidth || 640;
            const height = video.videoHeight || 480;

            canvas.width = width;
            canvas.height = height;

            // Draw video frame to canvas
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, width, height);

            // Convert canvas to base64 image
            try {
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(imageData);
                stopCamera();
            } catch (err) {
                console.error("Error converting canvas to image:", err);
                setErrorMessage("Error capturing image. Please try the file upload option.");
                setMethod('upload');
            }
        } catch (err) {
            console.error("Error capturing photo:", err);
            setErrorMessage("Error capturing photo. Please try the file upload option.");
            setMethod('upload');
        }
    };

    // Reset and go back to method selection
    const resetCapture = () => {
        setCapturedImage(null);
        setErrorMessage(null);
        setVerificationResult(null);
        setMethod('choose');
        if (streamRef.current) {
            stopCamera();
        }
    };

    // Submit photo for verification
    const submitVerification = async () => {
        if (!capturedImage) {
            setErrorMessage("No photo captured. Please take or upload a photo first.");
            return;
        }

        try {
            setVerifying(true);
            setErrorMessage(null);

            const response = await fetch('http://localhost:8000/api/interviews/verify-identity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    interviewId: interviewId,
                    linkCode: linkCode,
                    identificationImage: capturedImage
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Verification failed');
            }

            const result = await response.json();
            setVerificationResult(result);

            // If verification successful, redirect to questions
            if (result.verified) {
                setTimeout(() => {
                    navigate(`/interview/${interviewId}/${linkCode}/questions`);
                }, 3000);
            }

        } catch (error) {
            console.error("Error during verification:", error);
            setErrorMessage(error.message || "Verification failed. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    // Select verification method
    const selectMethod = (selectedMethod) => {
        setMethod(selectedMethod);
        setErrorMessage(null);

        if (selectedMethod === 'camera') {
            startCamera();
        } else if (selectedMethod === 'upload') {
            stopCamera();
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <LoadingAnimation />
                <h2 style={{ marginTop: '30px', color: '#333' }}>Preparing verification...</h2>
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

    // Show verification result
    if (verificationResult) {
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
                    backgroundColor: verificationResult.verified ? '#e8f5e9' : '#ffdddd',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                }}>
                    {verificationResult.verified ? (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    )}
                </div>
                <h2 style={{ color: verificationResult.verified ? '#4caf50' : '#e53935', marginBottom: '20px' }}>
                    {verificationResult.verified ? 'Verification Successful' : 'Verification Failed'}
                </h2>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    {verificationResult.message}
                </p>
                {verificationResult.verified ? (
                    <p style={{ color: '#4caf50', fontSize: '16px' }}>
                        Redirecting to interview questions...
                    </p>
                ) : (
                    <button
                        onClick={resetCapture}
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
                )}
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '800px',
            margin: '40px auto',
            padding: '30px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#ef402d', fontSize: '28px', marginBottom: '20px' }}>Identity Verification</h1>
                {interviewData && (
                    <p style={{ color: '#666', fontSize: '18px' }}>
                        For: <span style={{ color: '#ef402d', fontWeight: 'bold' }}>{interviewData.jobTitle}</span>
                    </p>
                )}
            </div>

            <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px'
            }}>
                <h3 style={{ color: '#333', marginBottom: '15px' }}>Instructions:</h3>
                <ol style={{ paddingLeft: '25px', color: '#555', lineHeight: '1.6' }}>
                    <li>Take a photo of yourself holding your ID card/passport</li>
                    <li>Ensure both your face and ID are clearly visible</li>
                    <li>Make sure the ID text is readable</li>
                    <li>You can use your camera or upload a pre-taken photo</li>
                </ol>
            </div>

            {/* Error message */}
            {errorMessage && (
                <div style={{
                    backgroundColor: '#ffdddd',
                    color: '#e53935',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: 0 }}>{errorMessage}</p>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '30px'
            }}>
                {/* Method selection screen */}
                {method === 'choose' && !capturedImage && (
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '20px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Choose Verification Method</h3>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={() => selectMethod('camera')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#ef402d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '30px 15px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                                Use Camera
                            </button>
                            <button
                                onClick={() => selectMethod('upload')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    border: 'none',
                                    padding: '30px 15px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload Photo
                            </button>
                        </div>
                    </div>
                )}

                {/* File upload screen */}
                {method === 'upload' && !capturedImage && (
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            border: '2px dashed #ccc',
                            borderRadius: '8px',
                            padding: '40px 20px',
                            marginBottom: '20px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p style={{ color: '#666', marginTop: '15px', marginBottom: '15px' }}>
                                Upload a photo of yourself holding your ID
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={() => fileInputRef.current.click()}
                                style={{
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Select Photo
                            </button>
                        </div>
                        <button
                            onClick={() => selectMethod('choose')}
                            style={{
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Back to Methods
                        </button>
                    </div>
                )}

                {/* Camera view */}
                {method === 'camera' && !capturedImage && (
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: '#000',
                            marginBottom: '20px',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={() => selectMethod('choose')}
                                style={{
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Back
                            </button>
                            <button
                                onClick={capturePhoto}
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
                                Take Photo
                            </button>
                        </div>
                    </div>
                )}

                {/* Captured image review */}
                {capturedImage && (
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                            <img
                                src={capturedImage}
                                alt="Verification"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={resetCapture}
                                style={{
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={submitVerification}
                                disabled={verifying}
                                style={{
                                    backgroundColor: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    cursor: verifying ? 'not-allowed' : 'pointer',
                                    opacity: verifying ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {verifying ? (
                                    <>
                                        <span style={{
                                            display: 'inline-block',
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></span>
                                        <style>{`
                                            @keyframes spin {
                                                to { transform: rotate(360deg); }
                                            }
                                        `}</style>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        Submit for Verification
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                backgroundColor: '#fffbf2',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #f9a825'
            }}>
                <h3 style={{ color: '#f9a825', marginBottom: '15px' }}>Privacy Notice:</h3>
                <p style={{ color: '#555' }}>
                    Your photo will only be used for identity verification purposes and will be stored securely.
                    We will not use this image for any other purpose without your explicit consent.
                </p>
            </div>
        </div>
    );
}

export default IDVerification;