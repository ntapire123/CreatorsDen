import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MetricCard from '../components/MetricCard';
import useApi from '../hooks/useApi';
import { creator, oauth } from '../services/api';
import ViewsChart from '../components/ViewsChart';
import PlatformChart from '../components/PlatformChart';
import EngagementPie from '../components/EngagementPie';
import './CreatorDashboard.css';

const CreatorDashboard = () => {
  const { data: metricsData, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useApi(creator.getMetricsAggregated);
  const { data: platformStats, loading: platformStatsLoading, error: platformStatsError, refetch: refetchPlatformStats } = useApi(creator.getPlatformStats);
  const { data: accountsData, loading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useApi(creator.getAccounts);
  
  const accounts = accountsData?.accounts || (Array.isArray(accountsData) ? accountsData : []);
  const [timeFilter, setTimeFilter] = useState('30');
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');

  const refetchAll = useCallback(() => {
    refetchMetrics();
    refetchPlatformStats();
    refetchAccounts();
  }, [refetchMetrics, refetchPlatformStats, refetchAccounts]);

  const connectOAuth = async (platform) => {
    try {
      const { data } = await oauth.getUrl(platform);
      const { oauthUrl } = data;
      const popup = window.open(oauthUrl, 'oauth', 'width=600,height=700');
      
      const handleMessage = (e) => {
        if (e.origin !== window.location.origin || e.data.type !== 'OAUTH_SUCCESS') {
          return;
        }
        refetchAll();
        popup.close();
        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      // OAuth error handled silently
    }
  };

  const disconnectAccount = async (accountId) => {
    try {
      await creator.deleteAccount(accountId);
      refetchAll();
    } catch (error) {
      // Error handled silently
    }
  };

  // Transform metrics data for charts
  const dailyData = useMemo(() => {
    if (!metricsData || !Array.isArray(metricsData)) return [];
    
    const grouped = metricsData.reduce((acc, item) => {
      const date = item._id?.date || item.date;
      if (!date) return acc;
      
      if (!acc[date]) {
        acc[date] = { date, totalViews: 0 };
      }
      acc[date].totalViews += item.totalViews || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [metricsData]);

  // Calculate totals for metric cards
  const totals = useMemo(() => {
    const totalViews = dailyData.reduce((sum, item) => sum + (item.totalViews || 0), 0);
    const totalFollowers = platformStats?.reduce((sum, item) => sum + (item.maxFollowers || 0), 0) || 0;
    const avgEngagement = platformStats?.length > 0 
      ? platformStats.reduce((sum, item) => sum + (item.avgEngagement || 0), 0) / platformStats.length 
      : 0;

    return { totalViews, totalFollowers, avgEngagement };
  }, [dailyData, platformStats]);

  const loading = metricsLoading || platformStatsLoading || accountsLoading;
  const error = metricsError || platformStatsError || accountsError;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Failed to load dashboard: {error}</p>
        <button onClick={refetchAll} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="creator-dashboard">
      <div className="dashboard-header">
        <h1>Your Analytics</h1>
        <div className="header-actions">
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="time-filter">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="metric-cards-grid">
        <MetricCard 
          title="Total Views" 
          value={totals.totalViews} 
          icon={<span>👁️</span>}
          trend={12}
        />
        <MetricCard 
          title="Total Followers" 
          value={totals.totalFollowers} 
          icon={<span>👥</span>}
        />
        <MetricCard 
          title="Avg Engagement" 
          value={`${totals.avgEngagement.toFixed(1)}%`} 
          icon={<span>❤️</span>}
        />
      </div>

      <div className="charts-section">
        <div className="chart-row">
          <div className="chart-container card">
            <ViewsChart data={dailyData} />
          </div>
          <div className="chart-container card">
            <PlatformChart data={platformStats || []} />
          </div>
        </div>
        <div className="chart-row-full">
          <div className="chart-container card">
            <EngagementPie data={platformStats || []} />
          </div>
        </div>
      </div>

      <div className="accounts-section card">
        <h3>Connected Accounts</h3>
        <div className="accounts-list">
          {accounts.length === 0 ? (
            <p className="empty-state">No accounts connected yet.</p>
          ) : (
            accounts.map(acc => (
              <div key={acc._id} className="account-item">
                <div className="account-info">
                  <span className="account-platform">{acc.platform}</span>
                  <span className="account-name">{acc.accountName || acc.displayName || acc.username}</span>
                </div>
                <button onClick={() => disconnectAccount(acc._id)} className="btn-secondary disconnect-btn">
                  Disconnect
                </button>
              </div>
            ))
          )}
        </div>
        <div className="connect-section">
          <h4>Connect New Account</h4>
          <div className="connect-controls">
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
            <button onClick={() => connectOAuth(selectedPlatform)} className="btn-primary">
              Connect {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
