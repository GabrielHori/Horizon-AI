/**
 * RemoteAccess Component (Refactored)
 * Main orchestrator for remote access functionality
 *
 * Responsibilities:
 * - Orchestrate hooks and components
 * - Manage overall layout
 * - Handle high-level state
 * - Ensure safe Tauri worker calls
 */

import React, { useState, useCallback } from 'react';
import {
  Globe,
  Shield,
  Key,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Smartphone,
  Lock,
  Unlock,
  ExternalLink,
  Info,
  Download,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { requestWorker } from '../services/bridge';
import { handleError as handleErrorService, executeWithErrorHandling, createUserFriendlyError } from '../services/error_service';
import PermissionService from '../services/permission_service';

// Import hooks
import { useTunnelStatus } from './RemoteAccess/hooks/useTunnelStatus';
import { useCloudflaredInstall } from './RemoteAccess/hooks/useCloudflaredInstall';
import { useAuthToken } from './RemoteAccess/hooks/useAuthToken';

// Import components
import Header from './RemoteAccess/components/Header';
import PublicUrlBox from './RemoteAccess/components/PublicUrlBox';
import QRCodeDisplay from './RemoteAccess/components/QRCodeDisplay';

// Import utilities
import { copyToClipboard } from './RemoteAccess/utils/clipboard';
import { translations } from './RemoteAccess/i18n/translations';

export default function RemoteAccess({ language = 'fr', isDarkMode = true }) {
  // State management
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [newIp, setNewIp] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Get translations
  const text = translations[language] || translations.en;

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


  // Hooks initialization
  const { status, loading, loadStatus, setError: setStatusError } = useTunnelStatus();
  const { installProgress, installCloudflared } = useCloudflaredInstall(installing, setInstalling, loadStatus, language);
  const {
    currentToken,
    showToken,
    generatingToken,
    tokenType,
    customToken,
    customTokenStrength,
    validatingCustomToken,
    setShowToken,
    setTokenType,
    setCustomToken,
    generateToken,
    validateAndApplyCustomToken
  } = useAuthToken(status, loadStatus, language);

  // Handle errors from hooks
  const handleError = useCallback((err) => {
    console.error("RemoteAccess error:", err);
    // Utiliser le service de gestion d'erreurs pour créer un message utilisateur convivial
    const userError = createUserFriendlyError(err, 'Remote Access', language);
    setError(userError.userMessage);
    setStatusError(userError.userMessage);
  }, [setStatusError, language]);

  // Toggle tunnel
  const toggleTunnel = async () => {
    setToggling(true);
    setError(null);

    try {
      const allowed = await ensureRemoteAccessPermission(
        status?.tunnel_running
          ? (language === 'fr' ? 'Desactiver le tunnel' : 'Disable tunnel')
          : (language === 'fr' ? 'Activer le tunnel' : 'Enable tunnel')
      );
      if (!allowed) {
        setError(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
        setToggling(false);
        return;
      }
      if (status?.tunnel_running) {
        const stopResult = await requestWorker("tunnel_stop");
        if (stopResult?.error === true) {
          handleError(stopResult);
          setToggling(false);
          return;
        }
      } else {
        // Check if token exists, generate if needed
        if (!status?.token_configured) {
          const tokenResult = await generateToken();
          if (tokenResult?.error === true) {
            handleError(tokenResult);
            setToggling(false);
            return;
          }
        }

        const startResult = await requestWorker("tunnel_start");
        if (startResult?.error === true) {
          handleError(startResult);
          setToggling(false);
          return;
        }

        if (!startResult?.success) {
          setError(startResult?.error || text.errorStarting);
          setToggling(false);
          return;
        }
      }

      // Reload status
      const statusResult = await loadStatus();
      if (statusResult?.error === true) {
        handleError(statusResult);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setToggling(false);
    }
  };

  // Add IP to allowlist
  const addAllowedIp = async () => {
    if (!newIp.trim()) return;

    try {
      const allowed = await ensureRemoteAccessPermission(
        language === 'fr' ? 'Ajouter une IP a la liste blanche' : 'Add IP to allowlist'
      );
      if (!allowed) {
        setError(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
        return;
      }
      const result = await requestWorker("tunnel_add_allowed_ip", { ip: newIp.trim() });
      if (result?.error === true) {
        handleError(result);
        return;
      }

      if (!result?.success) {
        setError(result?.error || (language === 'fr' ? 'Échec de l\'ajout de l\'IP' : 'Failed to add IP'));
        return;
      }

      setNewIp('');
      await loadStatus();
    } catch (err) {
      handleError(err);
    }
  };

  // Remove IP from allowlist
  const removeAllowedIp = async (ip) => {
    try {
      const allowed = await ensureRemoteAccessPermission(
        language === 'fr' ? 'Retirer une IP de la liste blanche' : 'Remove IP from allowlist'
      );
      if (!allowed) {
        setError(language === 'fr' ? 'Permission RemoteAccess requise' : 'RemoteAccess permission required');
        return;
      }
      const result = await requestWorker("tunnel_remove_allowed_ip", { ip });
      if (result?.error === true) {
        handleError(result);
        return;
      }

      if (!result?.success) {
        setError(result?.error || (language === 'fr' ? 'Échec de la suppression de l\'IP' : 'Failed to remove IP'));
        return;
      }

      await loadStatus();
    } catch (err) {
      handleError(err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-3" size={24} />
          <span className="text-sm opacity-60">Loading...</span>
        </div>
      </div>
    );
  }

  // Installation screen if cloudflared not installed
  if (!status?.cloudflared_installed) {
    return (
      <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4 mb-6">
          <Globe className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={22} />
          <h2 className="text-sm font-black uppercase tracking-widest">{text.title}</h2>
        </div>

        <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-amber-500 mb-2">{text.cloudflaredNotInstalled}</h3>
              <p className={`text-sm mb-4 ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                {text.cloudflaredRequired}
              </p>

              {/* Auto-install button */}
              {!installing ? (
                <button
                  onClick={async () => {
                    try {
                      await installCloudflared();
                    } catch (err) {
                      handleError(err);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all active:scale-98 shadow-lg mb-4"
                  style={{
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Download size={18} />
                  {language === 'fr' ? 'Installer automatiquement' : 'Install automatically'}
                </button>
              ) : (
                <div className="mb-4">
                  {/* Progress bar */}
                  <div className={`relative h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-black/40' : 'bg-slate-200'}`}>
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${installProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-500'}`}>
                      {language === 'fr' ? 'Installation en cours...' : 'Installing...'}
                    </span>
                    <span className="text-xs font-bold text-emerald-500">{installProgress}%</span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-bold">{error}</span>
                  </div>
                </div>
              )}

              {/* Manual installation */}
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-black/40' : 'bg-white'}`}>
                <p className={`text-[10px] mb-2 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                  {language === 'fr' ? 'Ou installez manuellement :' : 'Or install manually:'}
                </p>
                <code className="text-xs text-emerald-500 font-mono">winget install Cloudflare.cloudflared</code>
              </div>

              <a
                href="https://github.com/cloudflare/cloudflared/releases"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 mt-4 text-xs ${isDarkMode ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
              >
                <ExternalLink size={12} />
                {language === 'fr' ? 'Télécharger depuis GitHub' : 'Download from GitHub'}
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={loadStatus}
          disabled={installing}
          className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
        >
          <RefreshCw size={14} className={installing ? 'animate-spin' : ''} />
          {language === 'fr' ? 'Actualiser' : 'Refresh'}
        </button>
      </div>
    );
  }

  // Main content when cloudflared is installed
  return (
    <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <Header text={text} status={status} toggling={toggling} isDarkMode={isDarkMode} />

      {/* Description */}
      <p className={`text-sm mb-2 ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>{text.description}</p>
      <p className={`text-[10px] mb-6 ${isDarkMode ? 'opacity-30' : 'text-slate-400'}`}>
        <Shield size={10} className="inline mr-1" />
        {text.localFirst}
      </p>

      {/* Error Message */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* Toggle Switch */}
      <div className={`p-4 rounded-2xl border mb-6 ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe size={18} className={status?.tunnel_running ? "text-emerald-500" : "opacity-30"} />
            <div>
              <span className="text-xs font-bold block">
                {status?.tunnel_running ? text.disableRemoteAccess : text.enableRemoteAccess}
              </span>
              {status?.cloudflared_version && (
                <span className={`text-[9px] ${isDarkMode ? 'opacity-30' : 'text-slate-400'}`}>
                  {text.version}: {status.cloudflared_version.split(' ')[0]}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={toggleTunnel}
            disabled={toggling}
            className={`w-14 h-7 rounded-full transition-all relative ${status?.tunnel_running ? 'bg-emerald-500' : isDarkMode ? 'bg-gray-700' : 'bg-slate-300'} ${toggling ? 'opacity-50' : ''}`}
          >
            {toggling ? (
              <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" size={14} />
            ) : (
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${status?.tunnel_running ? 'left-8' : 'left-1'}`} />
            )}
          </button>
        </div>
      </div>

      {/* Active tunnel content */}
      {status?.tunnel_running && (
        <div className="space-y-6">
          {/* Public URL */}
          <PublicUrlBox
            text={text}
            status={status}
            copied={copied}
            copyToClipboard={(text, type) => copyToClipboard(text, setCopied, type)}
            currentToken={currentToken}
            language={language}
            isDarkMode={isDarkMode}
          />

          {/* Authentication Token */}
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key size={14} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                <span className="text-xs font-bold">{text.authToken}</span>
              </div>

              <button
                onClick={generateToken}
                disabled={generatingToken}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold ${isDarkMode ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'} transition-colors`}
              >
                {generatingToken ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {status?.token_configured ? text.regenerateToken : text.generateNewToken}
              </button>
            </div>

            {/* Token options */}
            <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="radio"
                  id="auto-token"
                  checked={tokenType === 'auto'}
                  onChange={() => setTokenType('auto')}
                  className="accent-emerald-500"
                />
                <label htmlFor="auto-token" className="text-sm">
                  {language === 'fr' ? 'Token généré automatiquement (sécurisé)' : 'Auto-generated token (secure)'}
                </label>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  type="radio"
                  id="custom-token"
                  checked={tokenType === 'custom'}
                  onChange={() => setTokenType('custom')}
                  className="accent-emerald-500"
                />
                <label htmlFor="custom-token" className="text-sm">
                  {language === 'fr' ? 'Token personnalisé (plus court)' : 'Custom token (shorter)'}
                </label>
              </div>

              {tokenType === 'custom' && (
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder={language === 'fr' ? 'Votre token (8-32 caractères)' : 'Your token (8-32 chars)'}
                    className="w-full p-3 rounded-lg bg-black/40 border border-white/20 text-white text-sm"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={validateAndApplyCustomToken}
                      disabled={validatingCustomToken || !String(customToken || '').trim()}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition-colors disabled:opacity-50`}
                      title={language === 'fr' ? 'Valider et appliquer le token personnalisé' : 'Validate and apply custom token'}
                    >
                      {validatingCustomToken ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {language === 'fr' ? 'Application du token...' : 'Applying token...'}
                        </>
                      ) : (
                        language === 'fr' ? 'Appliquer ce token' : 'Apply this token'
                      )}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {customTokenStrength && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded-full ${customTokenStrength === 'good' ? 'bg-emerald-500' : customTokenStrength === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className={customTokenStrength === 'good' ? 'text-emerald-500' : customTokenStrength === 'medium' ? 'text-amber-500' : 'text-red-500'}>
                        {customTokenStrength === 'good' ? (language === 'fr' ? 'Token fort' : 'Strong token') : customTokenStrength === 'medium' ? (language === 'fr' ? 'Token moyen' : 'Medium token') : (language === 'fr' ? 'Token invalide' : 'Invalid token')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentToken && (
              <div className={`p-3 rounded-xl mb-3 ${isDarkMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-500">{text.tokenWarning}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type={showToken ? "text" : "password"}
                    readOnly
                    value={currentToken.token}
                    className={`flex-1 p-2 rounded-lg text-xs font-mono ${isDarkMode ? 'bg-black/40 text-white' : 'bg-white text-slate-900'} border-none outline-none`}
                  />

                  <button
                    onClick={() => setShowToken(!showToken)}
                    className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>

                  <button
                    onClick={() => copyToClipboard(currentToken.token, setCopied, 'token')}
                    className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
                  >
                    {copied === 'token' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>

                <p className={`text-[10px] mt-2 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                  {text.tokenExpires} {currentToken.expires_hours} {text.hours}
                </p>
              </div>
            )}

            {!currentToken && status?.token_configured && (
              <p className={`text-[10px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                ✓ {text.tokenGenerated}
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={14} />
                <span className="text-xs font-bold">{text.qrCode}</span>
              </div>

              <button
                onClick={() => setShowQR(!showQR)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
              >
                <QrCode size={12} />
                {showQR ? text.hideQR : text.showQR}
              </button>
            </div>

            {showQR && status?.tunnel_url && currentToken && (
              <div className="flex flex-col items-center">
                <QRCodeDisplay
                  data={`${status.tunnel_url}?token=${currentToken.token}`}
                  size={150}
                  isDarkMode={isDarkMode}
                />
                <p className={`text-[10px] mt-3 text-center ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                  {language === 'fr' ? 'Scannez pour un accès direct' : 'Scan for direct access'}
                </p>
                <p className={`text-[10px] mt-1 text-center text-amber-400/60`}>
                  ✓ {language === 'fr' ? 'Connexion automatique' : 'Auto-login'}
                </p>
              </div>
            )}

            {showQR && status?.tunnel_url && !currentToken && (
              <div className="flex flex-col items-center">
                <QRCodeDisplay
                  data={status.tunnel_url}
                  size={150}
                  isDarkMode={isDarkMode}
                />
                <p className={`text-[10px] mt-3 text-center ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                  {text.scanQR}
                </p>
              </div>
            )}
          </div>

          {/* IP Allowlist */}
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} />
              <span className="text-xs font-bold">{text.ipAllowlist}</span>
            </div>
            <p className={`text-[10px] mb-3 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
              {text.ipAllowlistDesc}
            </p>

            {/* IP List */}
            {status?.allowed_ips?.length > 0 ? (
              <div className="space-y-2 mb-3">
                {status.allowed_ips.map((ip, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'bg-black/40' : 'bg-white'}`}>
                    <span className="text-xs font-mono">{ip}</span>
                    <button
                      onClick={() => removeAllowedIp(ip)}
                      className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-[10px] mb-3 italic ${isDarkMode ? 'opacity-30' : 'text-slate-300'}`}>
                {text.noIpRestriction}
              </p>
            )}

            {/* Add IP */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="192.168.1.100"
                className={`flex-1 p-2 rounded-lg text-xs font-mono ${isDarkMode ? 'bg-black/40 text-white' : 'bg-white text-slate-900'} border-none outline-none`}
              />
              <button
                onClick={addAllowedIp}
                disabled={!newIp.trim()}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition-colors disabled:opacity-30`}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Note (always visible) */}
      <div className={`mt-6 p-4 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-500 mb-1">{text.securityNote}</p>
            <p className={`text-[10px] ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
              {text.securityInfo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
