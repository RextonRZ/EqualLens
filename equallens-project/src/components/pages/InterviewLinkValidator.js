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

function InterviewLinkValidator() {
    const { interviewId, linkCode } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(false);
    const [error, setError] = useState(null);
    const [interviewData, setInterviewData] = useState(null);

    useEffect(() => {
        const validateLink = async () => {
            try {
                setLoading(true);

                // Call the API to validate the interview link
                const response = await fetch(`http://localhost:8000/api/interviews/validate/${interviewId}/${linkCode}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Invalid interview link');
                }

                const data = await response.json();
                setInterviewData(data);
                setValid(data.valid);

                // If verification is already completed, go directly to questions
                if (data.verificationCompleted) {
                    navigate(`/interview/${interviewId}/${linkCode}/questions`);
                }

            } catch (error) {
                console.error("Error validating interview link:", error);
                setError(error.message);
                setValid(false);
            } finally {
                setLoading(false);
            }
        };

        validateLink();
    }, [interviewId, linkCode, navigate]);

    const handleProceed = () => {
        navigate(`/interview/${interviewId}/${linkCode}/id-verification`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <LoadingAnimation />
                <h2 style={{ marginTop: '30px', color: '#333' }}>Validating your interview link...</h2>
            </div>
        );
    }

    if (error || !valid) {
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
                <h2 style={{ color: '#e53935', marginBottom: '20px' }}>Invalid Interview Link</h2>
                <p style={{ color: '#555', fontSize: '18px', marginBottom: '30px' }}>
                    {error || "This interview link is invalid or has expired."}
                </p>
                <p style={{ color: '#777', fontSize: '16px' }}>
                    Please contact the hiring team for assistance.
                </p>
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
                <h1 style={{ color: '#ef402d', fontSize: '28px', marginBottom: '20px' }}>Welcome to Your Interview</h1>
                <div style={{
                    width: '100px',
                    height: '100px',
                    backgroundColor: '#ffeff0',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                }}>
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ef402d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h2 style={{ color: '#333', fontSize: '24px', marginBottom: '10px' }}>
                    Hi, {interviewData?.candidateName || 'Candidate'}!
                </h2>
                <p style={{ color: '#666', fontSize: '18px', marginBottom: '5px' }}>
                    You're about to start your interview for:
                </p>
                <p style={{ color: '#ef402d', fontSize: '22px', fontWeight: 'bold', marginBottom: '30px' }}>
                    {interviewData?.jobTitle || 'Position'}
                </p>
            </div>

            <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <h3 style={{ color: '#333', marginBottom: '15px' }}>Before You Begin:</h3>
                <ul style={{ paddingLeft: '25px', color: '#555', lineHeight: '1.6' }}>
                    <li>Ensure you have a working camera and microphone</li>
                    <li>Find a quiet place with good lighting</li>
                    <li>Have your ID card or passport ready for verification</li>
                    <li>You'll need to answer questions within the specified time limits</li>
                    <li>Your responses will be recorded for review by our hiring team</li>
                </ul>
            </div>

            <div style={{ backgroundColor: '#fffbf2', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft: '4px solid #f9a825' }}>
                <h3 style={{ color: '#f9a825', marginBottom: '15px' }}>Important:</h3>
                <p style={{ color: '#555', marginBottom: '10px' }}>
                    The next step requires you to verify your identity by taking a photo of yourself while holding your ID card or passport.
                </p>
                <p style={{ color: '#555' }}>
                    This is to ensure the integrity of our interview process. Your photo will only be used for verification purposes.
                </p>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                    onClick={handleProceed}
                    style={{
                        backgroundColor: '#ef402d',
                        color: 'white',
                        border: 'none',
                        padding: '14px 40px',
                        borderRadius: '4px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#d63020'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#ef402d'}
                >
                    Proceed to ID Verification
                </button>
            </div>
        </div>
    );
}

export default InterviewLinkValidator;