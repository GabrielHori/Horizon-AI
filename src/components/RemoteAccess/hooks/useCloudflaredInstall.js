/**
 * useCloudflaredInstall Hook
 * Handles cloudflared installation and progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';

export const useCloudflaredInstall = (installing, setInstalling, loadStatus) => {
  const [installProgress, setInstallProgress] = useState(0);

  // Polling for installation progress
  useEffect(() => {
    let progressInterval;

    if (installing) {
      progressInterval = setInterval(async () => {
        try {
          const progress = await requestWorker("tunnel_install_progress");
          if (progress) {
            setInstallProgress(progress.progress || 0);
          }
        } catch (err) {
          // Ignore polling errors
        }
      }, 500);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [installing]);

  const installCloudflared = useCallback(async () => {
    setInstalling(true);
    setInstallProgress(0);

    try {
      // Start installation
      const result = await requestWorker("tunnel_install_cloudflared");

      if (result?.success) {
        setInstallProgress(100);
        // Reload status after installation
        await loadStatus();
      } else {
        throw new Error(result?.error || "Installation failed");
      }
    } catch (err) {
      throw err;
    } finally {
      setInstalling(false);
    }
  }, [loadStatus, setInstalling]);

  return {
    installProgress,
    installCloudflared
  };
};