import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css'; // Import shared styles
import Footer from '../components/Footer';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError('Both email and password are required.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Redirect to appropriate dashboard based on user role
      let user = null;
      try {
        const savedUser = localStorage.getItem('user');
        user = savedUser ? JSON.parse(savedUser) : null;
      } catch (parseError) {
        user = null;
      }
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      // The error message is caught from the AuthContext
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <h2>Welcome Back</h2>
        
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••"
            required
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading && <div className="spinner"></div>}
          <span>{loading ? 'Logging In...' : 'Login'}</span>
        </button>

        {error && <div className="error-message">{error}</div>}
        
        <p className="redirect-link">
          Accounts are created by an admin.
        </p>
      </form>
      <Footer />
    </div>
  );
};

export default LoginPage;