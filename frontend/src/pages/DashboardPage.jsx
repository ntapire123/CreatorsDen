import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import MetricCard from '../components/MetricCard';
import ViewsChart from '../components/ViewsChart';
import PlatformChart from '../components/PlatformChart';
import EngagementPie from '../components/EngagementPie';
import useApi from '../hooks/useApi';
import { creator } from '../services/api';

const CreatorDashboardView = () => {
  const { data: metricsData, loading: metricsLoading, error: metricsError } = useApi(creator.getMetricsAggregated);
  const { data: platformStats, loading: platformLoading, error: platformError } = useApi(creator.getPlatformStats);

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