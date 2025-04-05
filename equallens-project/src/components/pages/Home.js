import React, { useState, useEffect, useRef } from 'react';
import '../../App.css';
import './Home.css';
import Footer from '../Footer';
import { Link } from 'react-router-dom';
// Import Three.js related packages with compatible versions
import { Color } from "three";
import { useFont } from "@react-three/drei";

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
            description: "Remove bias with anonymized profiles focusing solely on qualifications.",
            video: "anonymizedCandidate.mp4"
        },
        {
            title: "AI-TAILORED INTERVIEW QUESTIONS", // Keep original for fallback
            description: "AI-tailored Interview Question with Manual Control",
            video: "aigenerateintquestion.mp4"
        },
        {
            title: "AUTOMATED INTERVIEW SYSTEM",
            description: "Streamline the interview process with intelligent scheduling and management.",
            video: "instantTranscript.mp4"
        },
        {
            title: "INSTANT INTERVIEW TRANSCRIPT",
            description: "Get immediate transcripts and summaries of candidate interviews."
        },
        {
            title: "AI-POWERED INTERVIEW ANALYSIS",
            description: "Gain valuable insights from comprehensive interview analytics.",
            video: "intAnalysis.mp4"
        }
    ];

    const [activeIndex, setActiveIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [prevIndex, setPrevIndex] = useState(features.length - 1);
    // Replace individual video end states with a single array
    const [videosEnded, setVideosEnded] = useState(Array(features.length).fill(false));
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

    // Handle video end events for any video index
    const handleVideoEnd = (videoIndex) => {
        // Only process if this is the active slide
        if (videoIndex === activeIndex) {
            // Immediately advance to next slide when video ends
            const newActiveIndex = (activeIndex + 1) % features.length;
            setActiveIndex(newActiveIndex);
            setNextIndex((newActiveIndex + 1) % features.length);
            setPrevIndex(activeIndex);
            
            // Also mark the video as ended in state
            setVideosEnded(prev => {
                const newState = [...prev];
                newState[videoIndex] = true;
                return newState;
            });
        } else {
            // Just mark as ended if it's not the active slide
            setVideosEnded(prev => {
                const newState = [...prev];
                newState[videoIndex] = true;
                return newState;
            });
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
                
                // Reset the video ended state for the active slide
                setVideosEnded(prev => {
                    const newState = [...prev];
                    newState[activeIndex] = false;
                    return newState;
                });
            }
        });
    }, [activeIndex, isPageVisible]);

    // Handle click on any slide (prev or next)
    const handleSlideClick = (index) => {
        if (index === nextIndex) {
            setActiveIndex(index);
            setNextIndex((index + 1) % features.length);
            setPrevIndex(activeIndex);
            
            // Reset the video ended state for the newly active slide
            setVideosEnded(prev => {
                const newState = [...prev];
                newState[index] = false;
                return newState;
            });
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        } else if (index === prevIndex) {
            setActiveIndex(index);
            setNextIndex((index + 1) % features.length);
            setPrevIndex((index - 1 + features.length) % features.length);
            
            // Reset the video ended state for the newly active slide
            setVideosEnded(prev => {
                const newState = [...prev];
                newState[index] = false;
                return newState;
            });
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    // Auto advance slides, but only for non-video slides or after videos have already ended
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        const hasVideo = features[activeIndex]?.video;
        const videoHasEnded = videosEnded[activeIndex];

        // Only set auto-advance timer if there's no video or if video has ended
        if (!hasVideo || videoHasEnded) {
            timerRef.current = setInterval(() => {
                const newActiveIndex = (activeIndex + 1) % features.length;
                setActiveIndex(newActiveIndex);
                setNextIndex((newActiveIndex + 1) % features.length);
                setPrevIndex(activeIndex);
                
                // Reset the video ended state for the new active slide
                setVideosEnded(prev => {
                    const newState = [...prev];
                    newState[newActiveIndex] = false;
                    return newState;
                });
            }, 5000);
        }
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activeIndex, features.length, videosEnded]);

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