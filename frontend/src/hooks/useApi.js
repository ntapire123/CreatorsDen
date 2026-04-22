import { useState, useEffect, useCallback, useRef } from 'react';

const useApi = (apiCall, maxRetries = 2) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const isActiveRef = useRef(true);
  const inFlightRef = useRef(false);
  const retryTimerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (typeof apiCall !== 'function') {
      setLoading(false);
      setError(null);
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
        const response = await apiCall();
        if (!isActiveRef.current) {
          return;
        }
        setData(response.data?.data || response.data);
        setRetryCount(0);
        return;
        } catch (err) {
          const isRetriable =
            err.code === 'ECONNABORTED' ||
            err.code === 'ECONNREFUSED' ||
            err.code === 'NETWORK_ERROR';

          if (!isRetriable || attempt >= maxRetries) {
            if (isActiveRef.current) {
              setError(err.message);
              setRetryCount(0);
            }
            return;
          }

          if (!isActiveRef.current) {
            return;
          }

          const nextRetry = attempt + 1;
          setRetryCount(nextRetry);
          await new Promise((resolve) => {
            retryTimerRef.current = setTimeout(resolve, 1000 * nextRetry);
          });

          if (!isActiveRef.current) {
            return;
          }
        }
      }
    } finally {
      inFlightRef.current = false;
      if (isActiveRef.current) {
        setLoading(false);
      }
    }
  }, [apiCall, maxRetries]);

  useEffect(() => {
    isActiveRef.current = true;
    fetchData();
    return () => {
      isActiveRef.current = false;
      inFlightRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, retryCount };
};

export default useApi;
