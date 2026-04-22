import React from 'react';
import '../styles/global.css';

const TermsOfServicePage = () => {
  return (
    <div className="page-container">
      <div className="card-premium">
        <h1>Terms of Service</h1>
        <p style={{ color: 'rgb(var(--text-secondary))', marginBottom: '1rem' }}>
          <strong>Effective Date:</strong> March 15, 2026
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2>1. Acceptance</h2>
          <p>
            By using CreatorsDen, you agree to these terms and to use the platform in compliance with applicable laws.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2. Service Scope</h2>
          <p>
            CreatorsDen provides social analytics aggregation for connected accounts. Third-party platform availability
            and data quality may affect displayed metrics.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>3. User Responsibilities</h2>
          <p>
            You are responsible for account ownership, data accuracy, and secure use of credentials and connected services.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>4. Availability and Limits</h2>
          <p>
            The service may apply rate limiting and scheduled sync intervals to protect platform API quotas and system stability.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>5. Contact</h2>
          <p>For legal questions, contact: legal@creatorsden.com</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfServicePage;

