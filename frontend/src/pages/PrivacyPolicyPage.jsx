import React from 'react';
import '../styles/global.css';

const PrivacyPolicyPage = () => {
  return (
    <div className="page-container">
      <div className="card-premium">
        <h1>Privacy Policy</h1>
        <p style={{ color: 'rgb(var(--text-secondary))', marginBottom: '1rem' }}>
          <strong>Effective Date:</strong> March 15, 2026
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2>1. Information We Collect</h2>
          <p>
            We collect account information, connected social profile metadata, and analytics snapshots needed
            to deliver performance dashboards.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2. How We Use Data</h2>
          <p>
            Data is used to authenticate your account, sync social metrics, and render analytics charts.
            OAuth tokens are stored securely and only used for authorized sync operations.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>3. Security</h2>
          <p>
            We protect data in transit and at rest, and limit access to authorized systems and personnel.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>4. Data Retention</h2>
          <p>
            Analytics records are retained based on product needs and storage policy. Account owners can request
            account deletion and data removal.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>5. Contact</h2>
          <p>For privacy inquiries, contact: privacy@creatorsden.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

