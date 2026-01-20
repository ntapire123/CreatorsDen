import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin } from '../../services/api';

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const AddCreatorPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setCopied(false);
    try {
      const res = await admin.createCreator({ email, name, password });
      const tempPassword = res?.data?.tempPassword || password;
      const createdEmail = res?.data?.user?.email || email;

      const toastText = `Creator created! Email: ${createdEmail} Password: ${tempPassword}`;
      setSuccess(toastText);
      try {
        await navigator.clipboard.writeText(toastText);
        setCopied(true);
      } catch {
        setCopied(false);
      }

      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      setError(err?.message || 'Failed to create creator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div
        className="card"
        style={{
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '2.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add New Creator</h1>
        <form className="section-gap" onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgb(var(--border) / 0.6)',
                background: 'rgb(var(--surface) / 0.6)',
                color: 'rgb(var(--text-primary))',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgb(var(--border) / 0.6)',
                background: 'rgb(var(--surface) / 0.6)',
                color: 'rgb(var(--text-primary))',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
              Password (auto-generated)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgb(var(--border) / 0.6)',
                  background: 'rgb(var(--surface) / 0.6)',
                  color: 'rgb(var(--text-primary))',
                }}
              />
              <button
                type="button"
                className="btn"
                style={{ padding: '10px 14px', borderRadius: 10 }}
                onClick={() => setPassword(generatePassword())}
              >
                Regenerate
              </button>
            </div>
          </div>
          {error && (
            <div style={{ color: 'rgb(var(--danger))', fontWeight: 600 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: 'rgb(var(--success))', fontWeight: 700 }}>
              {success}{copied ? ' (copied)' : ''}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Creator'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCreatorPage;

