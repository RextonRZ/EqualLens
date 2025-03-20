// src/components/pages/IDVerification.js

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../../App.css';
import './Interview.css';

const IDVerification = () => {
    const { interviewId, linkCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [interviewData, setInterviewData] = useState(null);
    const [idNumber, setIdNumber] = useState('');
    const [idImage, setIdImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Get interview data from location state
    useEffect(() => {
        if (location.state && location.state.interview) {
            setInterviewData(location.state.interview);
        } else {
            // If no interview data is available, redirect to validator
            navigate(`/interview/${interviewId}/${linkCode}`);
        }
    }, [location, interviewId, linkCode, navigate]);

    // Clean up video stream when component unmounts
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // Handle ID image upload
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIdImage(file);
            const fileUrl = URL.createObjectURL(file);
            setPreviewUrl(fileUrl);
            setIsCapturing(false);
        }
    };

    // Start camera for ID capture
    const startCamera = async () => {
        try {
            setIsCapturing(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera. Please check your camera permissions or upload an image directly.');
            setIsCapturing(false);
        }
    };

    // Capture image from camera
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            // Create a file from the blob
            const file = new File([blob], 'id-image.jpg', { type: 'image/jpeg' });
            setIdImage(file);

            // Create preview URL
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);

            // Stop camera
            if (video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }

            setIsCapturing(false);
        }, 'image/jpeg', 0.95);
    };

    // Submit ID verification
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!interviewData || !idNumber || !idImage) {
            setError('Please enter your ID number and provide an ID image.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            // Create form data
            const formData = new FormData();
            formData.append('interview_id', interviewId);
            formData.append('candidate_id', interviewData.candidate_id);
            formData.append('id_number', idNumber);
            formData.append('id_image', idImage);

            // API URL for ID verification
            const API_URL = "http://localhost:8000"; // Update with your API URL
            const submitUrl = `${API_URL}/api/interviews/submit-id`;

            const response = await fetch(submitUrl, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit ID verification');
            }

            // Navigate to interview questions page
            navigate(`/interview/${interviewId}/${linkCode}/questions`, {
                state: { interview: interviewData }
            });

        } catch (err) {
            console.error('Error submitting ID verification:', err);
            setError(err.message || 'Failed to submit ID verification');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="id-verification-container">
            <div className="id-verification-card">
                <div className="interview-logo">
                    EqualLens
                </div>

                <h2 className="id-verification-title">ID Verification</h2>
                <p className="id-verification-description">
                    Please provide your ID card for verification before proceeding with the interview.
                </p>

                {error && (
                    <div className="error-message">
                        <svg className="error-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="id-verification-form">
                    <div className="form-group">
                        <label htmlFor="idNumber" className="form-label">ID Number</label>
                        <input
                            type="text"
                            id="idNumber"
                            className="form-input"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            placeholder="Enter your IC number"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">ID Image</label>

                        {!isCapturing && !previewUrl && (
                            <div className="id-upload-options">
                                <button
                                    type="button"
                                    className="camera-button"
                                    onClick={startCamera}
                                >
                                    <svg className="camera-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    Take Photo
                                </button>

                                <div className="or-divider">OR</div>

                                <button
                                    type="button"
                                    className="upload-button"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                    </svg>
                                    Upload Image
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden-input"
                                />
                            </div>
                        )}

                        {isCapturing && (
                            <div className="camera-container">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="camera-preview"
                                ></video>

                                <div className="camera-controls">
                                    <button
                                        type="button"
                                        className="camera-capture-button"
                                        onClick={captureImage}
                                    >
                                        <svg className="capture-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    </button>

                                    <button
                                        type="button"
                                        className="camera-cancel-button"
                                        onClick={() => {
                                            if (videoRef.current && videoRef.current.srcObject) {
                                                const tracks = videoRef.current.srcObject.getTracks();
                                                tracks.forEach(track => track.stop());
                                            }
                                            setIsCapturing(false);
                                        }}
                                    >
                                        <svg className="cancel-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>

                                <canvas ref={canvasRef} className="hidden-canvas"></canvas>
                            </div>
                        )}

                        {previewUrl && (
                            <div className="id-preview-container">
                                <img
                                    src={previewUrl}
                                    alt="ID Preview"
                                    className="id-preview-image"
                                />

                                <button
                                    type="button"
                                    className="preview-cancel-button"
                                    onClick={() => {
                                        setIdImage(null);
                                        setPreviewUrl(null);
                                        URL.revokeObjectURL(previewUrl);
                                    }}
                                >
                                    <svg className="cancel-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="id-verification-actions">
                        <button
                            type="submit"
                            className="submit-button"
                            disabled={isSubmitting || !idNumber || !idImage}
                        >
                            {isSubmitting ? 'Submitting...' : 'Continue to Interview'}
                        </button>
                    </div>
                </form>

                <div className="id-verification-note">
                    <p>Note: Your ID is only used for verification purposes and will not be shared with the hiring team.</p>
                </div>
            </div>
        </div>
    );
};

export default IDVerification;