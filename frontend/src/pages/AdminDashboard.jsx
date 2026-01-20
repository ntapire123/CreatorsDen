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
import useApi from '../hooks/useApi';
import { admin, oauth } from '../services/api';
import './AdminDashboard.css';

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

  const fetchCreatorDetail = useCallback(async () => {
    if (!creatorId) return;
    setCreatorDetailLoading(true);
    setCreatorDetailError(null);
    try {
      const response = await admin.getCreatorDetails(creatorId);
      setCreatorDetailData(response.data);
    } catch (err) {
      setCreatorDetailError(err.message);
    } finally {
      setCreatorDetailLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    if (creatorId) {
      fetchCreatorDetail();
    }
  }, [creatorId, fetchCreatorDetail]);

  const creators = Array.isArray(creatorsData) ? creatorsData : (creatorsData?.data || []);
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
  const creatorMetrics = useMemo(() => {
    if (!creatorDetailData?.data) return { dailyData: [], platformStats: [] };

    const metrics = creatorDetailData.data.metricsAggregated || [];
    const platformStats = creatorDetailData.data.platformStats || [];

    const grouped = metrics.reduce((acc, item) => {
      const date = item._id?.date || item.date;
      if (!date) return acc;
      
      if (!acc[date]) {
        acc[date] = { date, totalViews: 0 };
      }
      acc[date].totalViews += item.totalViews || 0;
      return acc;
    }, {});

    const dailyData = Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));

    return { dailyData, platformStats };
  }, [creatorDetailData]);

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
          <div className="detail-header">
            <button onClick={handleBackToOverview} className="back-btn">
              ← Back to Overview
            </button>
            <h1>
              Creator: {creatorDetailData?.data?.creator?.name || 'Loading...'}
            </h1>
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
                    value={creatorMetrics.dailyData.reduce((sum, item) => sum + (item.totalViews || 0), 0)} 
                    icon={<span>👁️</span>}
                  />
                  <MetricCard 
                    title="Total Followers" 
                    value={creatorMetrics.platformStats.reduce((sum, item) => sum + (item.maxFollowers || 0), 0)} 
                    icon={<span>👥</span>}
                  />
                  <MetricCard 
                    title="Avg Engagement" 
                    value={`${creatorMetrics.platformStats.length > 0 ? (creatorMetrics.platformStats.reduce((sum, item) => sum + (item.avgEngagement || 0), 0) / creatorMetrics.platformStats.length).toFixed(1) : '0'}%`} 
                    icon={<span>❤️</span>}
                  />
                </div>

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

                {creatorDetailData.data.creator?.accounts && creatorDetailData.data.creator.accounts.length > 0 && (
                  <div className="accounts-section card">
                    <h3>Connected Accounts</h3>
                    <div className="accounts-list">
                      {creatorDetailData.data.creator.accounts.map(acc => (
                        <div key={acc._id} className="account-item">
                          <div className="account-info">
                            <span className="account-platform">{acc.platform}</span>
                            <span className="account-name">{acc.accountName || acc.displayName || acc.username}</span>
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
