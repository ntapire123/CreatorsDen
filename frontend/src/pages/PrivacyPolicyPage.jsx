import React from 'react';
import { Link } from 'react-router-dom';
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
            CreatorsDen ("we," "our," or "us") is committed to protecting your privacy. We collect the following information to provide our social media analytics services:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Email Address:</strong> Used for account creation, authentication, and communication</li>
            <li><strong>Profile Information:</strong> Public social media profile URLs and display names from connected accounts</li>
            <li><strong>Public Metrics:</strong> Follower counts, view counts, engagement data, and other publicly available metrics</li>
            <li><strong>OAuth Tokens:</strong> Encrypted access tokens used to authenticate with third-party services</li>
            <li><strong>Usage Data:</strong> How you interact with our service, including feature usage and preferences</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Provide analytics dashboards and insights for your social media accounts</li>
            <li>Authenticate with third-party services on your behalf</li>
            <li>Display aggregated metrics and trends</li>
            <li>Send important service announcements and security updates</li>
            <li>Improve our services and develop new features</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2.1. Third-Party API Services</h2>
          <p>
            CreatorsDen integrates with the following third-party services to provide analytics functionality:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>YouTube API Services:</strong> For fetching YouTube channel analytics and public metrics</li>
            <li><strong>TikTok Login Kit:</strong> For authenticating with TikTok and accessing public profile data</li>
            <li><strong>Instagram Graph API:</strong> For connecting Instagram accounts and retrieving public engagement metrics</li>
          </ul>
          <p>
            By using CreatorsDen, you acknowledge that your use of these third-party services is also governed by their respective privacy policies:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--accent))' }}>Google Privacy Policy</a></li>
            <li><a href="https://www.tiktok.com/legal/page/privacy-policy/en" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--accent))' }}>TikTok Privacy Policy</a></li>
            <li><a href="https://help.instagram.com/511070564990648" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--accent))' }}>Instagram Privacy Policy</a></li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>3. Data Security and Storage</h2>
          <p>
            We take data security seriously and implement appropriate technical and organizational measures to protect your information:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Encryption:</strong> OAuth access tokens are encrypted at rest in our database using industry-standard encryption</li>
            <li><strong>Secure Transmission:</strong> All data transmitted to and from our servers uses HTTPS/TLS encryption</li>
            <li><strong>Access Controls:</strong> Only authorized personnel have access to your data for maintenance purposes</li>
            <li><strong>Regular Security Updates:</strong> We maintain and update our security systems regularly</li>
          </ul>
          <p>
            <strong>Important:</strong> We never share your OAuth access tokens with third parties. These tokens are used solely to authenticate with the respective social media platforms on your behalf.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>4. Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to provide our services and comply with legal obligations:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Account Information:</strong> Retained until you delete your account</li>
            <li><strong>Analytics Data:</strong> Retained for up to 90 days, then automatically purged</li>
            <li><strong>OAuth Tokens:</strong> Retained until you disconnect the respective social media account</li>
            <li><strong>Usage Logs:</strong> Retained for 30 days for security and service improvement purposes</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>5. Your Rights and Choices</h2>
          <h3>5.1. Account Management</h3>
          <p>You have the right to:</p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Access, update, or correct your personal information through your dashboard</li>
            <li>Disconnect any connected social media account at any time</li>
            <li>Delete your entire account and all associated data</li>
            <li>Export your data in a machine-readable format</li>
          </ul>

          <h3>5.2. Data Deletion Policy</h3>
          <p>
            You can request deletion of your data through the following methods:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Dashboard:</strong> Navigate to Account Settings and click "Delete Account"</li>
            <li><strong>Email Support:</strong> Send a deletion request to privacy@creatorsden.com with your registered email</li>
          </ul>
          <p>
            Upon receiving a valid deletion request, we will:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Immediately revoke all OAuth tokens</li>
            <li>Delete all analytics data associated with your account within 24 hours</li>
            <li>Remove your personal information from our active databases</li>
            <li>Send a confirmation email once deletion is complete</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>6. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Keep you logged into your account</li>
            <li>Remember your preferences and settings</li>
            <li>Analyze service usage for improvement purposes</li>
          </ul>
          <p>
            You can control cookies through your browser settings. Disabling cookies may affect some features of our service.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>7. Children's Privacy</h2>
          <p>
            CreatorsDen is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
            If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information immediately.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place 
            to protect your data in accordance with applicable data protection laws.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>9. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Posting the updated policy on our website</li>
            <li>Sending an email notification to registered users</li>
            <li>Displaying a prominent notice in your dashboard</li>
          </ul>
          <p>
            Your continued use of CreatorsDen after such changes constitutes acceptance of the updated Privacy Policy.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Email:</strong> privacy@creatorsden.com</li>
            <li><strong>Website:</strong> https://creatorsden.com</li>
          </ul>
        </section>

        <div style={{ 
          marginTop: '3rem', 
          padding: '1.5rem', 
          backgroundColor: 'rgb(var(--surface) / 0.3)', 
          borderRadius: '12px',
          border: '1px solid rgb(var(--border) / 0.5)'
        }}>
          <p style={{ margin: '0', fontSize: '0.9rem', color: 'rgb(var(--text-secondary))' }}>
            <strong>Last Updated:</strong> March 15, 2026<br/>
            <strong>Version:</strong> 1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

