import React from 'react';
import PropTypes from 'prop-types';
import './MetricCard.css';

// Function to format large numbers into K (thousands) or M (millions)
const formatValue = (value) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : (value || 0);
  if (numValue >= 1000000) {
    return `${(numValue / 1000000).toFixed(1)}M`;
  }
  if (numValue >= 1000) {
    return `${(numValue / 1000).toFixed(1)}K`;
  }
  return numValue.toLocaleString();
};

const MetricCard = ({ title, value, icon, trend, unit }) => {
  if (value === null || value === undefined) {
    value = 0;
  }
  const trendSign = trend > 0 ? '↑' : '↓';
  const trendClass = trend > 0 ? 'trend-up' : 'trend-down';

  return (
    <div className="card metric-card">
      <div className="metric-card-icon">{icon}</div>
      <div className="metric-card-content">
        <h3 className="metric-card-title">{title}</h3>
        <p className="metric-card-value">
          {typeof value === 'string' ? value : formatValue(value)}
          {unit}
        </p>
        {trend !== undefined && (
          <p className={`metric-card-trend ${trendClass}`}>
            {trendSign} {Math.abs(trend)}% vs last month
          </p>
        )}
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  icon: PropTypes.element,
  trend: PropTypes.number,
  unit: PropTypes.string,
};

export default MetricCard;

