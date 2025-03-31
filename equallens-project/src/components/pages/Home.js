import React, { useState, useEffect, useRef } from 'react';
import '../../App.css';
import './Home.css';
import Footer from '../Footer';
import { Link } from 'react-router-dom';
// Import Three.js related packages with compatible versions
import { Color, LinearEncoding } from "three";
import { useFont } from "@react-three/drei";
import { degToRad } from "three/src/math/MathUtils";

// Create a bloom color effect similar to Experience.jsx
const bloomColor = new Color("#fff");
bloomColor.multiplyScalar(1.5);

// Preload font like in Experience.jsx - ensure the path matches your font location
useFont.preload("/fonts/Poppins-Black.ttf");

export default function Home() {
    const features = [
        {
            title: "BULK CV UPLOAD & MANAGEMENT",
            description: "Effortlessly upload and manage multiple CVs in a centralized system.",
            video: "bulkfileupload.mp4"
        },
        {
            title: "SEAMLESS DOCUMENT PARSING",
            description: "Instantly extract and organize key information from candidate documents.",
            video: "dashboardhighlights.mp4"
        },
        {
            title: "AI-DRIVEN CANDIDATE RANKING",
            description: "Objectively rank candidates based on merit and job-specific criteria.",
            video: "rankingHighlights.mp4"
        },
        {
            title: "ANONYMIZED CANDIDATE SCREENING",
            description: "Remove bias with anonymized profiles focusing solely on qualifications."
        },
        {
            title: "AI-TAILORED INTERVIEW QUESTIONS", // Keep original for fallback
            description: "AI-tailored Interview Question with Manual Control",
            video: "aigenerateintquestion.mp4"
        },
        {
            title: "AUTOMATED INTERVIEW SYSTEM",
            description: "Streamline the interview process with intelligent scheduling and management."
        },
        {
            title: "INSTANT INTERVIEW TRANSCRIPT",
            description: "Get immediate transcripts and summaries of candidate interviews."
        },
        {
            title: "AI-POWERED INTERVIEW ANALYSIS",
            description: "Gain valuable insights from comprehensive interview analytics."
        }
    ];

    const [activeIndex, setActiveIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [prevIndex, setPrevIndex] = useState(features.length - 1);
    const [videoEnded, setVideoEnded] = useState(false);
    const [secondVideoEnded, setSecondVideoEnded] = useState(false);
    const [thirdVideoEnded, setThirdVideoEnded] = useState(false);
    const [fourthVideoEnded, setFourthVideoEnded] = useState(false);
    const videoRefs = useRef({});
    const timerRef = useRef(null);
    const [isPageVisible, setIsPageVisible] = useState(true);

    // Handle page visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Control video playback based on page visibility
    useEffect(() => {
        // Handle background video
        const backgroundVideo = document.querySelector('.hero-container > video');
        if (backgroundVideo) {
            if (isPageVisible) {
                backgroundVideo.play().catch(e => console.log("Background video autoplay prevented:", e));
            } else {
                backgroundVideo.pause();
            }
        }
        
        // Handle feature videos
        if (isPageVisible) {
            // Only try to play the active video when page is visible
            const activeVideoEl = videoRefs.current[activeIndex];
            if (activeVideoEl && features[activeIndex].video) {
                activeVideoEl.play().catch(e => console.log("Feature video autoplay prevented:", e));
            }
        } else {
            // Pause all videos when page is not visible
            Object.values(videoRefs.current).forEach(video => {
                if (video) video.pause();
            });
        }
    }, [isPageVisible, activeIndex, features]);

    // Handle video end events
    const handleVideoEnd = (videoIndex) => {
        if (videoIndex === 0) {
            setVideoEnded(true);
        } else if (videoIndex === 1) {
            setSecondVideoEnded(true);
        } else if (videoIndex === 2) {
            setThirdVideoEnded(true);
        } else if (videoIndex === 4) {
            setFourthVideoEnded(true);
        }
    };

    // Reset and play videos when slides change (only if page is visible)
    useEffect(() => {
        if (!isPageVisible) return; // Skip if page is not visible

        Object.keys(videoRefs.current).forEach(key => {
            const videoElement = videoRefs.current[key];
            
            if (parseInt(key) === activeIndex && videoElement) {
                videoElement.currentTime = 0;
                videoElement.play().catch(e => console.log("Video play prevented:", e));
                
                if (parseInt(key) === 0) {
                    setVideoEnded(false);
                } else if (parseInt(key) === 1) {
                    setSecondVideoEnded(false);
                } else if (parseInt(key) === 2) {
                    setThirdVideoEnded(false);
                } else if (parseInt(key) === 4) {
                    setFourthVideoEnded(false);
                }
            }
        });
    }, [activeIndex, isPageVisible]);

    // Handle click on any slide (prev or next)
    const handleSlideClick = (index) => {
        if (index === nextIndex) {
            setActiveIndex(index);
            setNextIndex((index + 1) % features.length);
            setPrevIndex(activeIndex);
            
            if (index === 0) {
                setVideoEnded(false);
            } else if (index === 1) {
                setSecondVideoEnded(false);
            } else if (index === 2) {
                setThirdVideoEnded(false);
            } else if (index === 4) {
                setFourthVideoEnded(false);
            }
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        } else if (index === prevIndex) {
            setActiveIndex(index);
            setNextIndex((index + 1) % features.length);
            setPrevIndex((index - 1 + features.length) % features.length);
            
            if (index === 0) {
                setVideoEnded(false);
            } else if (index === 1) {
                setSecondVideoEnded(false);
            } else if (index === 2) {
                setThirdVideoEnded(false);
            } else if (index === 4) {
                setFourthVideoEnded(false);
            }
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    // Auto advance slides, but only after videos have played or for non-video slides
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        if ((activeIndex === 0 && features[0].video && !videoEnded) || 
            (activeIndex === 1 && features[1].video && !secondVideoEnded) ||
            (activeIndex === 2 && features[2].video && !thirdVideoEnded) ||
            (activeIndex === 4 && features[4].video && !fourthVideoEnded)) {
        } else {
            timerRef.current = setInterval(() => {
                const newActiveIndex = (activeIndex + 1) % features.length;
                setActiveIndex(newActiveIndex);
                setNextIndex((newActiveIndex + 1) % features.length);
                setPrevIndex(activeIndex);
                
                if (newActiveIndex === 0) {
                    setVideoEnded(false);
                } else if (newActiveIndex === 1) {
                    setSecondVideoEnded(false);
                } else if (newActiveIndex === 2) {
                    setThirdVideoEnded(false);
                } else if (newActiveIndex === 4) {
                    setFourthVideoEnded(false);
                }
            }, 5000);
        }
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activeIndex, features.length, videoEnded, secondVideoEnded, thirdVideoEnded, fourthVideoEnded]);

    // When videos end, advance to next slide
    useEffect(() => {
        if ((videoEnded && activeIndex === 0) || 
            (secondVideoEnded && activeIndex === 1) || 
            (thirdVideoEnded && activeIndex === 2) ||
            (fourthVideoEnded && activeIndex === 4)) {
            const newActiveIndex = (activeIndex + 1) % features.length;
            setActiveIndex(newActiveIndex);
            setNextIndex((newActiveIndex + 1) % features.length);
            setPrevIndex(activeIndex);
        }
    }, [videoEnded, secondVideoEnded, thirdVideoEnded, fourthVideoEnded, activeIndex, features.length]);

    // Set video ref
    const setVideoRef = (element, index) => {
        if (element) {
            videoRefs.current[index] = element;
        }
    };

    // Apply floating animation effect to title characters - FIXED VERSION
    useEffect(() => {
        const titleChars = document.querySelectorAll('.title-char');
        titleChars.forEach((char, index) => {
            // Set custom property for staggered animation delays
            char.style.setProperty('--index', index);
            
            // Reset any previous inline styles that might interfere with the CSS animations
            char.style.animation = '';
            char.style.transform = '';
            char.style.opacity = '';
            
            // Force a reflow to ensure the animations restart
            void char.offsetWidth;
            
            // Set the animation
            char.style.animationName = 'charFloat';
            char.style.animationDuration = '4s';
            char.style.animationTimingFunction = 'ease-in-out';
            char.style.animationIterationCount = 'infinite';
            char.style.animationDelay = `${index * 0.05}s`;
        });

        // Also apply the floating animation to the title container
        const titleContainers = document.querySelectorAll('.feature-title-3d');
        titleContainers.forEach(container => {
            // Reset any potentially conflicting inline styles
            container.style.animation = '';
            container.style.transform = '';
            
            // Force a reflow
            void container.offsetWidth;
            
            // Apply the animation
            container.style.animationName = 'titleFloat';
            container.style.animationDuration = '4s';
            container.style.animationTimingFunction = 'ease-in-out';
            container.style.animationIterationCount = 'infinite';
        });
    }, [activeIndex]); // Re-run when active slide changes

    return (
        <>
            <div className="hero-container">
                <video 
                    src="/EqualLensMainPage.mp4" 
                    loop 
                    muted 
                    playsInline
                />
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="left-content">
                        <h1>AI-Powered<br />Unbiased Hiring</h1>
                        <p>Transforming recruitment through fairness,<br />transparency, and merit-based decisions.</p>
                        <div className="hero-btns">
                            <Link to="/sign-up">
                                <button className="btn--primary btn--large">TRY IT OUT</button>
                            </Link>
                            <Link to="/about">
                                <button className="btn--outline btn--large">LEARN MORE</button>
                            </Link>
                        </div>
                    </div>
                    <div className="right-content">
                        <div className="curve-slider">
                            <div className="slides-container">
                                {features.map((feature, index) => (
                                    <div 
                                        key={index}
                                        className={`curve-slide ${
                                            index === activeIndex 
                                                ? 'active' 
                                                : index === nextIndex 
                                                    ? 'next' 
                                                    : index === prevIndex
                                                        ? 'prev'
                                                        : ''
                                        }`}
                                        onClick={() => handleSlideClick(index)}
                                    >
                                        <div className="feature-content-wrapper">
                                            {/* Enhanced 3D Title with different size support */}
                                            <h2 className="feature-title-3d">
                                                {feature.titleParts ? (
                                                    // Special handling for titles with different sizes
                                                    feature.titleParts.map((part, partIndex) => (
                                                        <div key={`part-${partIndex}`} className={`title-line ${part.className}`}>
                                                            {part.text.split('').map((char, charIndex) => (
                                                                <span 
                                                                    key={`char-${partIndex}-${charIndex}`} 
                                                                    className="title-char" 
                                                                    style={{ color: '#fff' }}
                                                                >
                                                                    {char}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ))
                                                ) : (
                                                    // Regular title handling
                                                    feature.title.split('\n').map((line, lineIndex) => (
                                                        <div key={`line-${lineIndex}`} className="title-line">
                                                            {line.split('').map((char, charIndex) => (
                                                                <span 
                                                                    key={`char-${lineIndex}-${charIndex}`} 
                                                                    className="title-char" 
                                                                    style={{ color: '#fff' }}
                                                                >
                                                                    {char}
                                                                </span>
                                                            ))
                                                        }
                                                        </div>
                                                    ))
                                                )}
                                            </h2>
                                            
                                            {feature.image ? (
                                                <img 
                                                    src={feature.image} 
                                                    alt={feature.title} 
                                                    className="feature-image"
                                                />
                                            ) : feature.video ? (
                                                <div className="video-container">
                                                    <video 
                                                        ref={(el) => setVideoRef(el, index)}
                                                        src={feature.video} 
                                                        className="feature-video"
                                                        muted
                                                        playsInline
                                                        onEnded={() => handleVideoEnd(index)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="feature-card">
                                                    <p>{feature.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}