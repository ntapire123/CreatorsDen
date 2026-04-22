import React from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Chart.css';

const PlatformChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Syncing data...</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Please check back in a few minutes for your analytics to appear.
          </div>
        </div>
      </div>
    );
  }
  
  const formatYAxis = (tick) => {
    if (tick >= 1000000) return `${tick / 1000000}M`;
    if (tick >= 1000) return `${tick / 1000}K`;
    return tick;
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">Platform Performance</h3>
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
          <XAxis dataKey="platform" stroke="hsl(var(--text-dark))" fontSize={12} />
          <YAxis stroke="hsl(var(--text-dark))" fontSize={12} tickFormatter={formatYAxis} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border-light))',
              color: 'hsl(var(--text-dark))'
            }}
            formatter={(value) => value.toLocaleString()}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--text-dark))', fontSize: '14px' }} />
          <Bar dataKey="totalViews" name="Total Views" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          <Bar dataKey="totalLikes" name="Total Likes" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

PlatformChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string.isRequired,
      totalViews: PropTypes.number,
      totalLikes: PropTypes.number,
    })
  ).isRequired,
};

export default PlatformChart;
