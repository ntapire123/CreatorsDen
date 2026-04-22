import React, { useState } from 'react';
import api from '../services/api';

const AddAccountForm = ({ onAccountAdded, creatorId }) => {
  const [profileUrl, setProfileUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileUrl.trim()) {
      setError('Please enter a profile URL');
      return;
    }

    if (!creatorId) {
      setError('Creator ID is missing. Please reload and try again.');
      return;
    }

    setIsAdding(true);
    setError('');
    setSuccess('');

    try {
      const payloadData = {
        profileUrl
      };
      const response = await api.post(`/creator/${creatorId}/accounts`, payloadData);
      
      if (response.data.success) {
        setSuccess('Account added successfully!');
        setProfileUrl('');
        
        // Notify parent component to refresh data
        if (onAccountAdded) {
          onAccountAdded(response.data.data);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to add account');
      }
    } catch (error) {
      // Handle 403 Forbidden error specifically
      if (error.response?.status === 403) {
        setError('You do not have permission to add accounts. Admin access required.');
        return;
      }
      
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to add account';
      
      // Show more user-friendly error messages
      if (errorMessage.includes('Invalid or unsupported social media URL')) {
        setError('Invalid URL. Please enter a valid YouTube, TikTok, or Instagram profile link.');
      } else if (errorMessage.includes('not found')) {
        setError('User not found. Please check the profile URL and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleInputChange = (e) => {
    setProfileUrl(e.target.value);
    setError('');
    setSuccess('');
  };

  return (
    <div className="card-premium" style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          color: 'var(--text-primary)'
        }}>
          Add Creator Account
        </h3>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem',
          marginBottom: '0'
        }}>
          Track your social media performance by adding profile URLs
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          fontSize: '0.875rem'
        }}>
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <input
              type="url"
              value={profileUrl}
              onChange={handleInputChange}
              placeholder="Paste YouTube, TikTok, or Instagram profile link..."
              disabled={isAdding}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                opacity: isAdding ? 0.6 : 1
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--text-primary)';
                e.target.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--card-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={isAdding || !profileUrl.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              backgroundColor: isAdding || !profileUrl.trim() 
                ? 'var(--text-muted)' 
                : 'var(--text-primary)',
              color: isAdding || !profileUrl.trim() 
                ? 'var(--surface)' 
                : 'var(--background)',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isAdding || !profileUrl.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minWidth: '120px'
            }}
          >
            {isAdding ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--surface)',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Adding...
              </>
            ) : (
              'Add Account'
            )}
          </button>
        </div>
      </form>

      {/* Supported Platforms Info */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: 'var(--surface)',
        borderRadius: '6px',
        border: '1px solid var(--card-border)'
      }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem',
          fontWeight: '600'
        }}>
          Supported platforms:
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>• YouTube: youtube.com/@username</span>
          <span>• TikTok: tiktok.com/@username</span>
          <span>• Instagram: instagram.com/username</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AddAccountForm;
