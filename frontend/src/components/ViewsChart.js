import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Chart.css';

const ViewsChart = ({ data }) => {
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

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    totalViews: item.totalViews,
  }));

  const formatYAxis = (tick) => {
    if (tick >= 1000000) return `${tick / 1000000}M`;
    if (tick >= 1000) return `${tick / 1000}K`;
    return tick;
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">Views Over Time</h3>
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-light))" />
          <XAxis dataKey="date" stroke="hsl(var(--text-dark))" />
          <YAxis stroke="hsl(var(--text-dark))" tickFormatter={formatYAxis} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border-light))',
              color: 'hsl(var(--text-dark))'
            }}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--text-dark))' }} />
          <Line type="monotone" dataKey="totalViews" stroke="#0ea5e9" strokeWidth={3} dot={false} name="Views" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

ViewsChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      totalViews: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default ViewsChart;
