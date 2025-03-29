import React from 'react';
import './Footer.css';
import { Button } from './Button';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <div className='footer-container'>
      <section className='footer-subscription'>
        <p className='footer-subscription-heading'>
            Join our newsletter for the latest updates
        </p>
        <p className='footer-subscription-text'>
          Stay informed about AI-driven hiring innovations and new features!
        </p>
        <div className='input-areas'>
          <form>
            <input
              className='footer-input'
              name='email'
              type='email'
              placeholder='Your Email'
            />
            <Button className="subscribe-btn" buttonStyle='btn--primary'>Subscribe</Button>
          </form>
        </div>
      </section>
      <div className='footer-links'>
        <div className='footer-link-wrapper'>
          <div className='footer-link-items'>
            <h2>About Us</h2>
            <Link to='/'>Our Mission</Link>
            <Link to='/'>Our Team</Link>
            <Link to='/'>Terms of Service</Link>
          </div>
          <div className='footer-link-items'>
            <h2>Contact Us</h2>
            <Link to='/'>Support</Link>
            <Link to='/'>Partnerships</Link>
            <Link to='/'>Career</Link>
          </div>
        </div>
        <div className='footer-link-wrapper'>
          <div className='footer-link-items'>
            <h2>Resources</h2>
            <Link to='/'>Blog</Link>
            <Link to='/'>Case Studies</Link>
            <Link to='/'>Documentation</Link>
            <Link to='/'>FAQ</Link>
          </div>
          <div className='footer-link-items'>
            <h2>Connect</h2>
            <Link to='/'>LinkedIn</Link>
            <Link to='/'>Twitter</Link>
            <Link to='/'>Instagram</Link>
            <Link to='/'>Facebook</Link>
          </div>
        </div>
      </div>
      <section className='social-media'>
        <div className='social-media-wrap'>
          <div className='footer-logo'>
              <Link to='/'>
                <img 
                    src="/equalLensLogoDark.png" 
                    alt="EqualLens Logo Dark" 
                    className="footer-logo-image" 
                />
              </Link>
          </div>
          <small className='website-rights'>EQUALLENS © 2025</small>
          <div className='social-icons'>
            <Link
              className='social-icon-link'
              to='/'
              target='_blank'
              aria-label='Facebook'
            >
              <i className='fab fa-facebook-f' />
            </Link>
            <Link
              className='social-icon-link'
              to='/'
              target='_blank'
              aria-label='Instagram'
            >
              <i className='fab fa-instagram' />
            </Link>
            <Link
              className='social-icon-link'
              to='/'
              target='_blank'
              aria-label='Youtube'
            >
              <i className='fab fa-youtube' />
            </Link>
            <Link
              className='social-icon-link'
              to='/'
              target='_blank'
              aria-label='Twitter'
            >
              <i className='fab fa-twitter' />
            </Link>
            <Link
              className='social-icon-link'
              to='/'
              target='_blank'
              aria-label='LinkedIn'
            >
              <i className='fab fa-linkedin' />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Footer;