import React from 'react';
import '../../App.css';
import './Home.css';
import Footer from '../Footer';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <>
            <div className="hero-container">
                <video src="/EqualLensMainPage.mp4" autoPlay loop muted playsInline />
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
                </div>
            </div>
            <Footer />
        </>
    );
}