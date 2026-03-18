import React from 'react';
import { Link } from 'react-router-dom';
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
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using CreatorsDen ("the Service"), you accept and agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, you must not access or use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User") and CreatorsDen ("we," "us," or "our").
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2. Description of Service</h2>
          <p>
            CreatorsDen is a social media analytics platform that allows creators to connect their YouTube, TikTok, and Instagram accounts 
            to view aggregated metrics, insights, and performance data. We act as an intermediary service that authenticates with 
            third-party platforms on your behalf to display publicly available analytics data.
          </p>
          <p>
            <strong>Important:</strong> We do not claim ownership of your social media accounts or content. You retain full ownership 
            and control of your connected social media accounts at all times.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>3. User Responsibilities</h2>
          <h3>3.1. Account Ownership</h3>
          <p>As a User of CreatorsDen, you are responsible for:</p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Account Ownership:</strong> You must be the rightful owner of any social media account you connect to CreatorsDen</li>
            <li><strong>Compliance:</strong> You must comply with the terms of service of all connected third-party platforms</li>
            <li><strong>Accuracy:</strong> You must provide accurate information when creating your account and connecting social media profiles</li>
            <li><strong>Security:</strong> You are responsible for maintaining the confidentiality of your account credentials</li>
            <li><strong>Lawful Use:</strong> You must use CreatorsDen in compliance with all applicable laws and regulations</li>
          </ul>

          <h3>3.2. Platform-Specific Terms</h3>
          <p>
            By using CreatorsDen to connect with YouTube, you acknowledge that you are also bound by the 
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgb(var(--accent))' }}>
              YouTube Terms of Service
            </a>. 
            Your use of YouTube through CreatorsDen must comply with YouTube's policies and guidelines.
          </p>
          <p>
            Similarly, your use of TikTok and Instagram through CreatorsDen must comply with their respective 
            terms of service and community guidelines.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>4. API Usage and Limitations</h2>
          <h3>4.1. OAuth Authentication</h3>
          <p>
            We use OAuth 2.0 to authenticate with third-party services. By authorizing CreatorsDen, you grant us 
            permission to access specific data from your connected accounts. This permission is limited to:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Reading public profile information and metrics</li>
            <li>Accessing analytics data that is publicly available or made available through the platform's official APIs</li>
            <li>Refreshing authentication tokens as needed for continued service access</li>
          </ul>
          <p>
            <strong>We do not:</strong> Post content on your behalf, send messages, or access private messages 
            without your explicit consent.
          </p>

          <h3>4.2. Rate Limiting</h3>
          <p>
            To ensure fair usage and maintain service quality, we may implement rate limiting on API calls. 
            Excessive usage may result in temporary or permanent service restrictions.
          </p>

          <h3>4.3. Data Accuracy</h3>
          <p>
            We strive to provide accurate and up-to-date information, but we make no warranties about the accuracy, 
            completeness, or reliability of data obtained from third-party APIs. All analytics data is subject to 
            the limitations and availability of the respective social media platforms.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>5. Intellectual Property Rights</h2>
          <h3>5.1. Your Content</h3>
          <p>
            You retain all rights, title, and interest in and to your social media content and accounts. 
            We do not claim any ownership of content that you create or share on connected platforms.
          </p>
          
          <h3>5.2. CreatorsDen Content</h3>
          <p>
            The Service, including its user interface, functionality, and original content, is protected by copyright, 
            trademark, and other intellectual property laws. You may not use our intellectual property without our 
            prior written consent.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>6. Privacy and Data Protection</h2>
          <p>
            Your privacy is important to us. Our collection, use, and protection of your information is governed 
            by our Privacy Policy, which is incorporated into these Terms by reference. By using CreatorsDen, 
            you consent to the collection and use of information as described in our Privacy Policy.
          </p>
          <p>
            <strong>Key Privacy Commitments:</strong>
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>OAuth tokens are encrypted at rest in our database</li>
            <li>We never share your access tokens with third parties</li>
            <li>You can disconnect accounts and delete your data at any time</li>
            <li>We comply with applicable data protection laws</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>7. Paid Services and Subscription</h2>
          <p>
            CreatorsDen is currently offered as a free service. We reserve the right to introduce paid features 
            or subscription plans in the future. Any such changes will be communicated in advance and will not affect 
            your existing rights without your consent.
          </p>
          <p>
            If we introduce paid services, we will clearly describe the pricing, billing cycles, and terms of payment 
            before requiring any payment from you.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>8. Prohibited Conduct</h2>
          <p>You agree not to use CreatorsDen to:</p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
            <li>Use the service for fraudulent or deceptive purposes</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Upload or transmit malicious code, viruses, or harmful content</li>
            <li>Spam, harass, or abuse other users</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>9. Service Availability and Support</h2>
          <p>
            We strive to maintain high service availability, but we cannot guarantee uninterrupted access. 
            The Service may be temporarily unavailable due to:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Scheduled maintenance or updates</li>
            <li>Technical issues or server problems</li>
            <li>Third-party service outages (social media platform APIs)</li>
            <li>Force majeure events beyond our control</li>
          </ul>
          <p>
            We will provide reasonable support through our designated channels, but response times may vary based on 
            the nature of your inquiry.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CREATORSDEN SHALL NOT BE LIABLE FOR ANY 
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
          <p>
            Our total liability for any claims arising from these Terms or your use of Service shall not exceed 
            the amount you paid to us (if any) in the twelve (12) months preceding the claim.
          </p>
          <p>
            CreatorsDen is not responsible for:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>The accuracy, reliability, or availability of third-party platform data</li>
            <li>Any actions or content on your connected social media accounts</li>
            <li>Damages resulting from platform outages beyond our control</li>
            <li>Loss of data due to account compromise or unauthorized access</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>11. Termination</h2>
          <h3>11.1. Termination by You</h3>
          <p>
            You may terminate your account at any time by:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Using the account deletion feature in your dashboard</li>
            <li>Disconnecting all connected social media accounts</li>
            <li>Contacting our support team for assistance</li>
          </ul>
          <p>
            Upon termination, we will delete your account and associated data in accordance with our Privacy Policy.
          </p>

          <h3>11.2. Termination by Us</h3>
          <p>
            We may suspend or terminate your account immediately if you violate these Terms or engage in prohibited conduct. 
            We may also terminate the Service entirely with prior notice.
          </p>
          <p>
            Upon termination, your right to use the Service ceases immediately, but all provisions of these Terms 
            which by their nature should survive termination shall continue.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>12. Dispute Resolution</h2>
          <p>
            Any disputes arising from these Terms or your use of CreatorsDen shall be resolved through:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Direct communication with our support team</li>
            <li>Good faith negotiation and mediation</li>
            <li>If necessary, resolution through appropriate legal channels</li>
          </ul>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
            conflict of law principles.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>13. General Provisions</h2>
          <h3>13.1. Changes to Terms</h3>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li>Posting updated Terms on our website</li>
            <li>Sending email notifications to registered users</li>
            <li>Displaying prominent notices in your dashboard</li>
          </ul>
          <p>
            Your continued use of the Service after changes constitutes acceptance of the modified Terms.
          </p>

          <h3>13.2. Severability</h3>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain 
            in full force and effect.
          </p>

          <h3>13.3. Entire Agreement</h3>
          <p>
            These Terms constitute the entire agreement between you and CreatorsDen, superseding all prior agreements 
            or communications regarding the Service.
          </p>

          <h3>13.4. Contact Information</h3>
          <p>
            If you have questions about these Terms, please contact us:
          </p>
          <ul style={{ marginLeft: '1.5rem', color: 'rgb(var(--text-secondary))' }}>
            <li><strong>Email:</strong> legal@creatorsden.com</li>
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
            <strong>Version:</strong> 1.0<br/>
            <strong>Effective Date:</strong> March 15, 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;

