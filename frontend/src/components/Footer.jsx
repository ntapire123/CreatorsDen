import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/global.css';

const Footer = () => {
  return (
    <footer style={{
      padding: '1.5rem',
      textAlign: 'center',
      borderTop: '1px solid var(--card-border)',
      color: 'var(--text-secondary)',
      backgroundColor: 'transparent',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        <span>© 2026 CreatorsDen. All rights reserved.</span>
        
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link 
            to="/privacy" 
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            Privacy Policy
          </Link>
          
          <Link 
            to="/terms" 
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.color = 'var(--text-primary)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = 'var(--text-secondary)';
            }}
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
