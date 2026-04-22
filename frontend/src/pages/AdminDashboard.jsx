import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import TopPerformers from '../components/TopPerformers';
import SearchBar from '../components/SearchBar';
import ViewsChart from '../components/ViewsChart';
import PlatformChart from '../components/PlatformChart';
import EngagementPie from '../components/EngagementPie';
import AddAccountForm from '../components/AddAccountForm';
import useApi from '../hooks/useApi';
import { admin } from '../services/api';
import './AdminDashboard.css';

const getAccountIdentifier = (account) => String(account?.accountId || account?._id || '');

const AdminDashboard = () => {
  const { user } = useAuth();
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(creatorId ? 'detail' : (tabParam || 'overview'));
  const [platformFilter, setPlatformFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: creatorsData, loading: creatorsLoading, error: creatorsError, refetch: refetchCreators } = useApi(admin.getAllCreators);
  const { data: topPerformersData, loading: topPerformersLoading, error: topPerformersError, refetch: refetchTopPerformers } = useApi(admin.getTopPerformers);
  const [creatorDetailData, setCreatorDetailData] = useState(null);
  const [creatorDetailLoading, setCreatorDetailLoading] = useState(false);
  const [creatorDetailError, setCreatorDetailError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeDetailAccountId, setActiveDetailAccountId] = useState('');

  const fetchCreatorDetail = useCallback(async () => {
    if (!creatorId) return;
    setCreatorDetailLoading(true);
    setCreatorDetailError(null);
    try {
      const response = await admin.getCreatorDetails(creatorId);
      
      const actualData = response.data.data;
      const creatorObj = actualData.creator;

      setCreatorDetailData(response.data);
      
      const accounts = creatorObj.accounts || [];
      setActiveDetailAccountId((prevSelected) => {
        if (!prevSelected) return getAccountIdentifier(accounts[0]);
        const stillExists = accounts.some((account) => getAccountIdentifier(account) === String(prevSelected));
        return stillExists ? prevSelected : getAccountIdentifier(accounts[0]);
      });

      const totalV = accounts.reduce((acc, curr) => acc + (curr.totalViews || 0), 0);
      const totalF = accounts.reduce((acc, curr) => acc + (curr.followers || 0), 0);
      setCreatorDetailData(prev => ({
        ...prev,
        totalViews: totalV,
        totalFollowers: totalF
      }));
    } catch (err) {
      setCreatorDetailError(err.message);
    } finally {
      setCreatorDetailLoading(false);
    }
  }, [creatorId]);

  const handleAccountAdded = async (newAccountData) => {
    setNotification({
      type: 'success',
      message: 'Account added successfully!'
    });
    await fetchCreatorDetail(); // Refresh data
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteCreator = async () => {
    if (!window.confirm(`Are you sure you want to delete creator "${creatorDetailData?.data?.creator?.name || 'this creator'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await admin.deleteCreator(creatorId);
      setNotification({
        type: 'success',
        message: 'Creator deleted successfully'
      });
      setTimeout(() => {
        navigate('/admin');
      }, 1000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to delete creator'
      });
    }
  };

  useEffect(() => {
    if (creatorId) {
      fetchCreatorDetail();
    }
  }, [creatorId, fetchCreatorDetail]);

  const creators = useMemo(
    () => (Array.isArray(creatorsData) ? creatorsData : (creatorsData?.data || [])),
    [creatorsData]
  );
  const topPerformers = Array.isArray(topPerformersData) ? topPerformersData : (topPerformersData?.data || []);

  useEffect(() => {
    if (creatorId) {
      setActiveTab('detail');
    } else {
      setActiveTab(tabParam || 'overview');
    }
  }, [creatorId, tabParam]);

  const refetchAll = useCallback(() => {
    refetchCreators();
    refetchTopPerformers();
    if (creatorId) fetchCreatorDetail();
  }, [refetchCreators, refetchTopPerformers, fetchCreatorDetail, creatorId]);

  const summary = useMemo(() => {
    if (!creators || creators.length === 0) return { totalCreators: 0, totalViews: 0, avgEngagement: 0 };

    const totalCreators = creators.length;
    const totalViews = creators.reduce((sum, creator) => {
      if (creator.accounts && Array.isArray(creator.accounts)) {
        return sum + creator.accounts.reduce((accSum, acc) => accSum + (acc.metrics?.totalViews || 0), 0);
      }
      return sum + (creator.totalViews || 0);
    }, 0);
    
    const totalEngagement = creators.reduce((sum, creator) => {
      if (creator.accounts && Array.isArray(creator.accounts)) {
        const avg = creator.accounts.length > 0 
          ? creator.accounts.reduce((accSum, acc) => accSum + (acc.metrics?.avgEngagement || 0), 0) / creator.accounts.length
          : 0;
        return sum + avg;
      }
      return sum + (creator.avgEngagement || 0);
    }, 0);
    
    const avgEngagement = totalCreators > 0 ? (totalEngagement / totalCreators) : 0;

    return { totalCreators, totalViews, avgEngagement: avgEngagement.toFixed(2) };
  }, [creators]);

  const filteredCreators = useMemo(() => {
    if (!creators) return [];
    
    let filtered = creators;

    // Platform filter
    if (platformFilter !== 'All') {
      filtered = filtered.filter(creator => 
        creator.accounts && creator.accounts.some(acc => acc.platform === platformFilter)
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(creator => 
        creator.name?.toLowerCase().includes(query) ||
        creator.userId?.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [creators, platformFilter, searchQuery]);

  const tableData = useMemo(() => {
    return filteredCreators.map(c => ({
      _id: c._id,
      name: c.name || 'N/A',
      accountsCount: c.accounts?.length || 0,
      totalViews: c.accounts ? c.accounts.reduce((sum, acc) => sum + (acc.metrics?.totalViews || 0), 0) : (c.totalViews || 0),
      totalFollowers: c.accounts ? c.accounts.reduce((sum, acc) => sum + (acc.metrics?.totalFollowers || 0), 0) : (c.totalFollowers || 0),
      avgEngagement: c.accounts && c.accounts.length > 0 
        ? (c.accounts.reduce((sum, acc) => sum + (acc.metrics?.avgEngagement || 0), 0) / c.accounts.length).toFixed(2)
        : (c.avgEngagement || '0'),
    }));
  }, [filteredCreators]);

  const handleRowClick = (row) => {
    navigate(`/admin/creator/${row._id}`);
  };

  const handleBackToOverview = () => {
    navigate('/admin');
  };

  // Transform data for creator detail charts
  const selectedDetailAccounts = useMemo(() => {
    const allAccounts = creatorDetailData?.data?.creator?.accounts || [];
    if (!activeDetailAccountId) return allAccounts;
    return allAccounts.filter((account) => getAccountIdentifier(account) === String(activeDetailAccountId));
  }, [creatorDetailData, activeDetailAccountId]);

  const detailTotals = useMemo(() => {
    const totalViews = selectedDetailAccounts.reduce((sum, account) => sum + (account.totalViews || 0), 0);
    const totalFollowers = selectedDetailAccounts.reduce((sum, account) => sum + (account.followers || 0), 0);
    return {
      totalViews,
      totalFollowers,
      totalAccounts: selectedDetailAccounts.length
    };
  }, [selectedDetailAccounts]);

  const creatorMetrics = useMemo(() => {
    if (!creatorDetailData?.data) return { dailyData: [], platformStats: [] };

    const metricsAggregated = Array.isArray(creatorDetailData.data.metricsAggregated)
      ? creatorDetailData.data.metricsAggregated
      : [];

    // Use historical analytics data so charts show progression over time, not just current snapshot.
    const filteredMetrics = activeDetailAccountId
      ? metricsAggregated.filter((item) => String(item?._id?.accountId) === String(activeDetailAccountId))
      : metricsAggregated;

    // Build per-day totals, then convert to "views gained" deltas.
    const dailyMap = filteredMetrics.reduce((acc, item) => {
      const dateKey = item?._id?.date;
      if (!dateKey) return acc;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalViews: 0,
          followers: 0,
        };
      }

      acc[dateKey].totalViews += item.totalViews || 0;
      acc[dateKey].followers += item.avgFollowers || 0;
      return acc;
    }, {});

    const dailyTotals = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    const dailyData = dailyTotals.map((point, index) => {
      // If only one point exists, show the known total instead of a zero delta.
      if (dailyTotals.length === 1) {
        return { ...point, totalViews: point.totalViews || 0 };
      }

      if (index === 0) {
        return { ...point, totalViews: 0 };
      }

      const prev = dailyTotals[index - 1];
      return {
        ...point,
        totalViews: Math.max(0, (point.totalViews || 0) - (prev.totalViews || 0)),
      };
    });

    // Build platform summary from historical metrics in current filter scope.
    const platformMap = filteredMetrics.reduce((acc, item) => {
      const platform = item?._id?.platform || 'Unknown';
      if (!acc[platform]) {
        acc[platform] = {
          platform,
          totalViews: 0,
          maxFollowers: 0,
          avgEngagement: 0,
          totalLikes: 0,
        };
      }

      acc[platform].totalViews += item.totalViews || 0;
      acc[platform].maxFollowers = Math.max(acc[platform].maxFollowers, item.avgFollowers || 0);
      return acc;
    }, {});

    const platformStats = Object.values(platformMap).map((item) => {
      const engagementBase = Math.max(item.maxFollowers || 0, 1);
      return {
        ...item,
        // Proxy engagement so pie chart has meaningful non-zero values.
        avgEngagement: Number(((item.totalViews / engagementBase) * 100).toFixed(2)),
      };
    });

    // Fallback to current account snapshot only when no historical points exist yet.
    if (dailyData.length === 0 && selectedDetailAccounts.length > 0) {
      const snapshotPoint = {
        date: new Date().toISOString().slice(0, 10),
        totalViews: 0,
        followers: selectedDetailAccounts.reduce((sum, account) => sum + (account.followers || 0), 0),
      };

      const snapshotPlatformStats = selectedDetailAccounts.reduce((acc, account) => {
        const platform = account.platform || 'Unknown';
        if (!acc[platform]) {
          acc[platform] = {
            platform,
            totalViews: 0,
            maxFollowers: 0,
            avgEngagement: 0,
            totalLikes: 0,
          };
        }
        acc[platform].totalViews += account.totalViews || 0;
        acc[platform].maxFollowers = Math.max(acc[platform].maxFollowers, account.followers || 0);
        return acc;
      }, {});

      const platformFallback = Object.values(snapshotPlatformStats).map((item) => ({
        ...item,
        avgEngagement: Number(((item.totalViews / Math.max(item.maxFollowers || 0, 1)) * 100).toFixed(2)),
      }));

      return {
        dailyData: [snapshotPoint],
        platformStats: platformFallback,
      };
    }

    return { dailyData, platformStats };
  }, [creatorDetailData, selectedDetailAccounts, activeDetailAccountId]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  const loading = creatorsLoading || topPerformersLoading || (creatorId && creatorDetailLoading);
  const error = creatorsError || topPerformersError || (creatorId && creatorDetailError);

  return (
    <div className="admin-dashboard page-container">
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); navigate('/admin'); }}
        >
          Overview
        </button>
        {creatorId && (
          <button 
            className={`tab-btn ${activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('detail')}
          >
            Creator Detail
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="overview-tab section-gap">
          <div className="dashboard-header">
            <h1>All Creators ({summary.totalCreators} total)</h1>
            <div className="header-controls">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search creators..." />
              <select 
                value={platformFilter} 
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="platform-filter-select"
              >
                <option value="All">All Platforms</option>
                <option value="YouTube">YouTube</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>
          </div>

          <div className="summary-cards grid-luxe">
            <MetricCard title="Total Creators" value={summary.totalCreators} icon={<span>👥</span>} />
            <MetricCard title="Total Views" value={summary.totalViews.toLocaleString()} icon={<span>👁️</span>} />
            <MetricCard title="Avg Engagement" value={`${summary.avgEngagement}%`} icon={<span>❤️</span>} />
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : error ? (
            <div className="dashboard-error">
              <p>{error}</p>
              <button onClick={refetchAll} className="btn-primary">Retry</button>
            </div>
          ) : (
            <div className="dashboard-main">
              <div className="data-table-section card">
                <DataTable
                  columns={[
                    { key: 'name', label: 'Creator', sortable: true },
                    { key: 'accountsCount', label: 'Accounts' },
                    { key: 'totalViews', label: 'Views', sortable: true },
                    { key: 'totalFollowers', label: 'Followers' },
                    { key: 'avgEngagement', label: 'Engagement %' },
                  ]}
                  data={tableData}
                  onRowClick={handleRowClick}
                  rowsPerPage={10}
                />
              </div>
              <div className="right-panel">
                <div className="top-performers-section card">
                  <TopPerformers data={topPerformers.slice(0, 5)} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'detail' && creatorId && (
        <div className="creator-detail-tab section-gap">
          {/* Notification */}
          {notification && (
            <div
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                backgroundColor: notification.type === 'success' 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(255, 68, 68, 0.1)',
                border: `1px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: notification.type === 'success' ? '#10b981' : '#ef4444',
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
                  fontSize: '1.2rem'
                }}
              >
                ×
              </button>
            </div>
          )}

          <div className="detail-header">
            <button onClick={handleBackToOverview} className="back-btn">
              ← Back to Overview
            </button>
            <h1>
              Creator: {creatorDetailData?.data?.creator?.name || 'Loading...'}
            </h1>
            {/* Admin-only delete creator button */}
            {user?.role === 'admin' && (
              <button
                onClick={handleDeleteCreator}
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                🗑️ Delete Creator
              </button>
            )}
          </div>

          {creatorDetailLoading ? (
            <div className="dashboard-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : creatorDetailError ? (
            <div className="dashboard-error">
              <p>{creatorDetailError}</p>
              <button onClick={fetchCreatorDetail} className="btn-primary">Retry</button>
            </div>
          ) : creatorDetailData?.data ? (
            <div className="creator-detail-content">
              <div className="creator-detail-sidebar">
                <div className="card top-performers-card">
                  <h2 className="sidebar-title">Top Performers</h2>
                  {topPerformers.length > 0 ? (
                    <TopPerformers data={topPerformers.slice(0, 10)} />
                  ) : (
                    <p className="empty-state">No performance data available.</p>
                  )}
                </div>
              </div>
              <div className="creator-detail-main">
                <div className="metric-cards-grid grid-luxe">
                  <MetricCard 
                    title="Total Views" 
                    value={detailTotals.totalViews.toLocaleString()} 
                    icon={<span>👁️</span>}
                  />
                  <MetricCard 
                    title="Total Followers" 
                    value={detailTotals.totalFollowers.toLocaleString()} 
                    icon={<span>👥</span>}
                  />
                  <MetricCard 
                    title="Connected Accounts" 
                    value={detailTotals.totalAccounts} 
                    icon={<span>🔗</span>}
                  />
                </div>

                {creatorDetailData?.data?.creator?.accounts?.length > 1 && (
                  <div className="card" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <label htmlFor="admin-account-selector" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      View stats for account
                    </label>
                    <select
                      id="admin-account-selector"
                      value={activeDetailAccountId}
                      onChange={(e) => setActiveDetailAccountId(e.target.value)}
                      style={{
                        width: '100%',
                        maxWidth: '420px',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">All connected accounts</option>
                      {creatorDetailData.data.creator.accounts.map((account) => (
                        <option key={getAccountIdentifier(account)} value={getAccountIdentifier(account)}>
                          {account.platform} - {account.accountName || account.username || account.accountId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Account Management Section - Admin Only */}
                {user?.role === 'admin' && (
                  <div className="account-management-section section-gap">
                    <div className="card">
                      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                        Account Management
                      </h2>
                      
                      {/* Add Account Form */}
                      <AddAccountForm 
                        onAccountAdded={handleAccountAdded} 
                        creatorId={creatorId}
                      />
                    </div>
                  </div>
                )}

                <div className="charts-section section-gap">
                  <div className="chart-row-full">
                    <div className="card chart-card-full">
                      <ViewsChart data={creatorMetrics.dailyData} />
                    </div>
                  </div>
                  <div className="chart-row">
                    <div className="card chart-card">
                      <PlatformChart data={creatorMetrics.platformStats} />
                    </div>
                    <div className="card chart-card">
                      <EngagementPie data={creatorMetrics.platformStats} />
                    </div>
                  </div>
                </div>

                {selectedDetailAccounts && selectedDetailAccounts.length > 0 && (
                  <div className="accounts-section card">
                    <h3>Connected Accounts</h3>
                    <div className="accounts-list">
                      {selectedDetailAccounts.map(acc => (
                        <div key={acc._id} className="account-item">
                          <div className="account-info">
                            <span className="account-platform">{acc.platform}</span>
                            <span className="account-name">{acc.accountName || acc.displayName || acc.username}</span>
                            {acc.latestStats && (
                              <div className="account-stats">
                                <span>Followers: {acc.latestStats.followers.toLocaleString()}</span>
                                <span>Views: {acc.latestStats.totalViews.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="dashboard-error">
              <p>Creator not found.</p>
              <button onClick={handleBackToOverview} className="btn-primary">Back to Overview</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
