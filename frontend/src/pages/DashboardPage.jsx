import React, { useMemo, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import MetricCard from '../components/MetricCard';
import ViewsChart from '../components/ViewsChart';
import PlatformChart from '../components/PlatformChart';
import EngagementPie from '../components/EngagementPie';
import useApi from '../hooks/useApi';
import { creator } from '../services/api';

const CreatorDashboardView = () => {
  const { API_URL, token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState(null);
  
  // Filtering state
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Build query string for API calls
  const apiQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedPlatform !== 'All') params.append('platform', selectedPlatform);
    if (selectedAccount !== 'All') params.append('accountId', selectedAccount);
    return params.toString();
  }, [selectedPlatform, selectedAccount]);

  const { data: metricsData, loading: metricsLoading, error: metricsError } = useApi(
    creator.getMetricsAggregated(apiQueryString ? `?${apiQueryString}` : '')
  );

  const { data: platformStats, loading: platformLoading, error: platformError } = useApi(
    creator.getPlatformStats(apiQueryString ? `?${apiQueryString}` : '')
  );
  const { data: accountsData, loading: accountsLoading, error: accountsError } = useApi(creator.getAccounts);

  // Fetch connected accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${API_URL}/accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setConnectedAccounts(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      }
    };
    
    if (token) {
      fetchAccounts();
    }
  }, [token, API_URL]);

  // Filter accounts based on selected platform
  const filteredAccounts = useMemo(() => {
    if (selectedPlatform === 'All') {
      return connectedAccounts;
    }
    return connectedAccounts.filter(account => account.platform === selectedPlatform);
  }, [connectedAccounts, selectedPlatform]);

  // Reset account filter when platform changes
  useEffect(() => {
    setSelectedAccount('All');
  }, [selectedPlatform]);

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success) {
      setNotification({ type: 'success', message: decodeURIComponent(success) });
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setNotification(null), 5000);
    }
    
    if (error) {
      setNotification({ type: 'error', message: decodeURIComponent(error) });
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams, setSearchParams]);

  const handleConnectPlatform = async (platform) => {
    try {
      const response = await fetch(`http://localhost:5000/api/accounts/auth/${platform}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data?.url) {
          window.location.href = data.data.url;
        } else {
          alert('No OAuth URL received');
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('OAuth request failed:', error);
      alert('Failed to initiate OAuth');
    }
  };

  const dailyData = useMemo(() => {
    const arr = Array.isArray(metricsData) ? metricsData : (metricsData?.data || []);
    const grouped = arr.reduce((acc, item) => {
      const date = item._id?.date || item.date;
      if (!date) return acc;
      if (!acc[date]) acc[date] = { date, totalViews: 0 };
      acc[date].totalViews += item.totalViews || 0;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [metricsData]);

  const totals = useMemo(() => {
    const stats = Array.isArray(platformStats) ? platformStats : (platformStats?.data || platformStats || []);
    const totalViews = dailyData.reduce((sum, item) => sum + (item.totalViews || 0), 0);
    const totalFollowers = stats.reduce((sum, item) => sum + (item.maxFollowers || 0), 0);
    const avgEngagement = stats.length > 0
      ? stats.reduce((sum, item) => sum + (item.avgEngagement || 0), 0) / stats.length
      : 0;
    return { totalViews, totalFollowers, avgEngagement, stats };
  }, [dailyData, platformStats]);

  const creatorLoading = metricsLoading || platformLoading;
  const creatorError = metricsError || platformError;

  return (
    <div className="page-container">
      {/* Notification Banner */}
      {notification && (
        <div 
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' 
              ? 'rgba(76, 175, 80, 0.1)' 
              : 'rgba(244, 67, 54, 0.1)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
            color: notification.type === 'success' ? 'rgb(76, 175, 80)' : 'rgb(244, 67, 54)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0 0.5rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filtering Section */}
      <div className="card-premium" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 'var(--h2-size)', fontWeight: 800, marginBottom: '0.5rem' }}>
            Filter Analytics
          </div>
          <div style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.9rem' }}>
            Filter your metrics by platform and specific accounts
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
              Platform
            </label>
            <select 
              value={selectedPlatform} 
              onChange={(e) => setSelectedPlatform(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgb(var(--border))',
                backgroundColor: 'rgb(var(--background))',
                color: 'rgb(var(--text))',
                fontSize: '0.95rem',
                minWidth: isMobile ? '100%' : '150px',
                minHeight: '44px'
              }}
            >
              <option value="All">All Platforms</option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>
              Account
            </label>
            <select 
              value={selectedAccount} 
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={filteredAccounts.length === 0}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgb(var(--border))',
                backgroundColor: 'rgb(var(--background))',
                color: 'rgb(var(--text))',
                fontSize: '0.95rem',
                minWidth: isMobile ? '100%' : '200px',
                minHeight: '44px',
                opacity: filteredAccounts.length === 0 ? 0.5 : 1
              }}
            >
              <option value="All">All Accounts</option>
              {filteredAccounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.accountName || `${account.platform} Account`}
                </option>
              ))}
            </select>
          </div>
          
          {(selectedPlatform !== 'All' || selectedAccount !== 'All') && (
            <button 
              onClick={() => {
                setSelectedPlatform('All');
                setSelectedAccount('All');
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgb(var(--border))',
                backgroundColor: 'transparent',
                color: 'rgb(var(--text-secondary))',
                fontSize: '0.9rem',
                cursor: 'pointer',
                alignSelf: isMobile ? 'stretch' : 'flex-end',
                minHeight: '44px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Account Linking Section */}
      <div className="card-premium" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Connect Your Accounts
          </div>
          <div style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.9rem' }}>
            Link your social media accounts to track performance metrics
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleConnectPlatform('YouTube')}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>📺</span>
            Connect YouTube
          </button>
          <button
            onClick={() => handleConnectPlatform('Instagram')}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>📷</span>
            Connect Instagram
          </button>
          <button
            onClick={() => handleConnectPlatform('TikTok')}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>🎵</span>
            Connect TikTok
          </button>
        </div>
      </div>

      <div className="card-premium">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'rgb(var(--text-secondary))', fontWeight: 700, letterSpacing: 0.3 }}>
              Performance
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, marginTop: 6 }}>
              254.4% <span style={{ color: 'rgb(var(--success))', fontSize: '1.25rem', fontWeight: 800 }}>↑ 12.3%</span>
            </div>
            <div style={{ color: 'rgb(var(--text-secondary))', marginTop: 6 }}>
              Last 30 days · premium insights
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="btn" style={{ cursor: 'default' }}>Live</span>
            <span className="btn" style={{ cursor: 'default', background: 'rgb(var(--accent) / 0.18)', borderColor: 'rgb(var(--accent) / 0.6)' }}>
              Creator
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem' }} className="grid-premium">
        <MetricCard title="Total Views" value={totals.totalViews} icon={<span>👁️</span>} trend={12} />
        <MetricCard title="Total Followers" value={totals.totalFollowers} icon={<span>👥</span>} />
        <MetricCard title="Avg Engagement" value={`${totals.avgEngagement.toFixed(1)}%`} icon={<span>❤️</span>} />
      </div>

      <div style={{ marginTop: '4rem' }} className="section-gap">
        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Charts</div>
        <div className="section-gap">
          <div className="card chart-card-full">
            <ViewsChart data={dailyData} />
          </div>
          <div className="grid-premium">
            <div className="card chart-card">
              <PlatformChart data={totals.stats || []} />
            </div>
            <div className="card chart-card">
              <EngagementPie data={totals.stats || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-container"><div>Loading...</div></div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return user.role === 'creator' ? <CreatorDashboardView /> : <AdminDashboard />;
};

export default DashboardPage;