/**
 * useCloudflaredInstall Hook
 * Handles cloudflared installation and progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';
import PermissionService from '../../../services/permission_service';

export const useCloudflaredInstall = (installing, setInstalling, loadStatus, language = 'fr') => {
  const [installProgress, setInstallProgress] = useState(0);

  const ensureRemoteAccessPermission = useCallback(async (actionLabel) => {
    const hasPermission = await PermissionService.hasPermission('RemoteAccess');
    if (hasPermission) {
      return true;
    }
    const result = await PermissionService.requestPermission(
      'RemoteAccess',
      actionLabel,
      language === 'fr' ? 'Acces distant' : 'Remote access'
    );
    return result === true;
  }, [language]);

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
      const allowed = await ensureRemoteAccessPermission(
        language === 'fr' ? 'Installer cloudflared' : 'Install cloudflared'
      );
      if (!allowed) {
        throw new Error(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
      }
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
  }, [ensureRemoteAccessPermission, language, loadStatus, setInstalling]);

  return {
    installProgress,
    installCloudflared
  };
};
