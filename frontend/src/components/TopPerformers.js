import React from 'react';
import './TopPerformers.css';

const TopPerformers = ({ data }) => {
  return (
    <div className="top-performers-container">
      <h2 className="top-performers-title">Top 10 Performers</h2>
      {data && data.length > 0 ? (
        <ul className="top-performers-list">
          {data.map((performer, index) => (
            <li key={performer.creatorId || index} className="performer-item">
              <span className="performer-rank">{index + 1}</span>
              <span className="performer-name">{performer.name}</span>
              <div className="performer-stats">
                <span className="performer-views">{performer.totalViews.toLocaleString()} views</span>
                <span className="performer-engagement">{performer.avgEngagement?.toFixed(1)}%</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No performance data available.</p>
      )}
    </div>
  );
};

export default TopPerformers;
