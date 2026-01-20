import React from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const EngagementPie = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-empty-state">No data available for Engagement Pie.</div>;
  }

  const COLORS = ['#0ea5e9', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const totalEngagement = data.reduce((acc, entry) => acc + (entry.avgEngagement || 0), 0);
  const avgEngagement = data.length > 0 ? totalEngagement / data.length : 0;

  return (
    <div className="chart-container">
      <h3 className="chart-title">Engagement Distribution</h3>
      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={90}
            fill="hsl(var(--navy))"
            dataKey="avgEngagement"
            nameKey="platform"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgb(var(--card))',
              border: '1px solid rgb(var(--border) / 0.6)',
              color: 'rgb(var(--text-primary))'
            }}
            formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--text-dark))' }} />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          textAlign: 'center',
          color: 'rgb(var(--text-secondary))',
          marginTop: '0.75rem',
          fontWeight: 700
        }}
      >
        Avg {avgEngagement.toFixed(2)}%
      </div>
    </div>
  );
};

EngagementPie.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      platform: PropTypes.string.isRequired,
      avgEngagement: PropTypes.number,
    })
  ).isRequired,
};

export default EngagementPie;
