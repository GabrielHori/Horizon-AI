/**
 * useTunnelStatus Hook
 * Manages tunnel status, loading, and error states
 */

import { useState, useCallback, useEffect } from 'react';
import { requestWorker } from '../../../services/bridge';

export const useTunnelStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const result = await requestWorker("tunnel_get_status");
      setStatus(result);
      setError(null);
    } catch (err) {
      console.error("Error loading tunnel status:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Refresh status every 5 seconds when tunnel is active
    const interval = setInterval(() => {
      if (status?.tunnel_running) {
        loadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadStatus, status?.tunnel_running]);

  return {
    status,
    loading,
    error,
    loadStatus,
    setError
  };
};