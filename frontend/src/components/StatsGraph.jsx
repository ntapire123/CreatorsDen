import React, { useEffect, useState } from 'react';
import ViewsChart from './ViewsChart';
import { creator } from '../services/api';

const StatsGraph = ({ accountId }) => {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAccountStats = async () => {
      if (!accountId || !String(accountId).trim()) {
        setChartData([]);
        setError('');
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const response = await creator.getAccountHistory(accountId);
        const history = Array.isArray(response?.data?.data?.history) ? response.data.data.history : [];

        const mappedData = history.map((item) => ({
          date: item.date,
          totalViews: item.totalViews || 0
        }));

        if (mappedData.length === 0) {
          setChartData([{
            date: new Date().toISOString(),
            totalViews: 0
          }]);
        } else {
          setChartData(mappedData);
        }
      } catch (fetchError) {
        setError(fetchError?.response?.data?.message || 'Failed to load account statistics.');
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountStats();
  }, [accountId]);

  if (!accountId || !String(accountId).trim()) {
    return (
      <div className="chart-empty-state">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Please select an account to view statistics</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Choose a platform and account from the selector to load chart data.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ViewsChart data={[]} />;
  }

  if (error) {
    return (
      <div className="chart-empty-state">
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>
          {error}
        </div>
      </div>
    );
  }

  return <ViewsChart data={chartData} />;
};

export default StatsGraph;
