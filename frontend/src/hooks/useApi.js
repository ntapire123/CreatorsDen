import { useState, useEffect, useCallback } from 'react';

const useApi = (apiCall, maxRetries = 2) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      setData(response.data?.data || response.data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      // Retry on timeout or network errors
      if ((err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR') && retryCount < maxRetries) {
        console.log(`Retrying API call (${retryCount + 1}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchData(), 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(err.message);
      setRetryCount(0);
    } finally {
      setLoading(false);
    }
  }, [apiCall, retryCount, maxRetries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, retryCount };
};

export default useApi;
