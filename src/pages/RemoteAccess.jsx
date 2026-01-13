/**
 * RemoteAccess Page (V2.1)
 * Page dédiée pour Remote Access accessible depuis la Sidebar
 * 
 * Responsabilités:
 * - Gestion Remote Access simplifiée et accessible
 * - Toggle ON/OFF rapide
 * - Sessions actives avec révocation
 * - Permissions par session
 * - Statut visible (badge ON/OFF dans sidebar)
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  EyeOff,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { requestWorker } from '../services/bridge';
import { useTheme } from '../contexts/ThemeContext';

// Import hooks
import { useTunnelStatus } from '../components/RemoteAccess/hooks/useTunnelStatus';
import { useCloudflaredInstall } from '../components/RemoteAccess/hooks/useCloudflaredInstall';
import { useAuthToken } from '../components/RemoteAccess/hooks/useAuthToken';

// Import components
import Header from '../components/RemoteAccess/components/Header';
import PublicUrlBox from '../components/RemoteAccess/components/PublicUrlBox';
import QRCodeDisplay from '../components/RemoteAccess/components/QRCodeDisplay';

// Import utilities
import { copyToClipboard } from '../components/RemoteAccess/utils/clipboard';
import { translations } from '../components/RemoteAccess/i18n/translations';

export default function RemoteAccess({ language = 'fr', isDarkMode: propDarkMode, healthStatus }) {
  const { isDarkMode: themeDarkMode } = useTheme();
  const isDarkMode = propDarkMode !== undefined ? propDarkMode : themeDarkMode;
  
  // State management
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);
  const [newIp, setNewIp] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [sessions, setSessions] = useState([]); // Sessions actives
  const [revokingSession, setRevokingSession] = useState(null); // ID session en cours de révocation

  // Get translations
  const text = translations[language] || translations.en;

  // Hooks initialization
  const { status, loading, loadStatus, setError: setStatusError } = useTunnelStatus();
  const { installProgress, installCloudflared } = useCloudflaredInstall(installing, setInstalling, loadStatus);
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

  // Charger les sessions actives (Sprint 1.2)
  const loadSessions = useCallback(async () => {
    try {
      // TODO: Implémenter commande "tunnel_get_sessions" dans backend
      // Pour l'instant, simuler avec statut existant
      const result = await requestWorker("tunnel_get_status");
      // Les sessions seront ajoutées dans le backend V2.1
      // Pour l'instant, créer des sessions simulées si tunnel actif
      if (result?.tunnel_running && result?.allowed_ips && result.allowed_ips.length > 0) {
        const activeSessions = result.allowed_ips.map((ip, index) => ({
          id: `session_${index}_${ip}`,
          ip: ip,
          connectedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          permissions: { read: true, write: false } // Par défaut
        }));
        setSessions(activeSessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      setSessions([]);
    }
  }, []);

  // Charger sessions au montage et quand le statut change
  useEffect(() => {
    if (status) {
      loadSessions();
    }
  }, [status?.tunnel_running, status?.allowed_ips, loadSessions]);

  // Rafraîchir sessions périodiquement si tunnel actif
  useEffect(() => {
    if (!status?.tunnel_running) return;
    
    const interval = setInterval(() => {
      loadSessions();
    }, 5000); // Rafraîchir toutes les 5 secondes
    
    return () => clearInterval(interval);
  }, [status?.tunnel_running, loadSessions]);

  // Handle errors from hooks
  const handleError = useCallback((err) => {
    console.error("RemoteAccess error:", err);
    setError(err.message);
    setStatusError(err.message);
  }, [setStatusError]);

  // Toggle tunnel
  const toggleTunnel = async () => {
    setToggling(true);
    setError(null);

    try {
      if (status?.tunnel_running) {
        await requestWorker("tunnel_stop");
      } else {
        // Modal d'avertissement lors première activation (Sprint 1.2)
        // Pour l'instant, démarrer directement
        // Check if token exists, generate if needed
        if (!status?.token_configured) {
          await generateToken();
        }

        const result = await requestWorker("tunnel_start");
        if (!result?.success) {
          setError(result?.error || text.errorStarting);
        }
      }

      // Reload status
      await loadStatus();
      await loadSessions();
    } catch (err) {
      handleError(err);
    } finally {
      setToggling(false);
    }
  };

  // Révocation session rapide (Sprint 1.2)
  const handleRevokeSession = useCallback(async (sessionId) => {
    setRevokingSession(sessionId);
    
    try {
      // Pour l'instant (Sprint 1.2), révoquer = retirer IP de la allowlist
      // Dans une version future, on pourra avoir un vrai système de sessions avec tracking
      const session = sessions.find(s => s.id === sessionId);
      if (session?.ip) {
        // Retirer l'IP de la allowlist (révocation immédiate)
        await requestWorker("tunnel_remove_allowed_ip", { ip: session.ip });
        
        // Recharger les sessions et le statut
        await loadSessions();
        await loadStatus();
        
        // Logger dans audit trail
        try {
          await requestWorker("audit_log", {
            action: "remote_access_revoked",
            details: {
              session_id: sessionId,
              ip: session.ip,
              revoked_at: new Date().toISOString(),
              reason: "User requested immediate revocation"
            }
          });
        } catch (auditError) {
          // Si audit_log n'existe pas encore, continuer quand même
          console.warn("Audit log failed:", auditError);
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setRevokingSession(null);
    }
  }, [sessions, loadSessions, loadStatus, handleError]);

  // Add IP to allowlist
  const addAllowedIp = async () => {
    if (!newIp.trim()) return;

    try {
      await requestWorker("tunnel_add_allowed_ip", { ip: newIp.trim() });
      setNewIp('');
      await loadStatus();
      await loadSessions();
    } catch (err) {
      handleError(err);
    }
  };

  // Remove IP from allowlist
  const removeAllowedIp = async (ip) => {
    try {
      await requestWorker("tunnel_remove_allowed_ip", { ip });
      await loadStatus();
      await loadSessions();
    } catch (err) {
      handleError(err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`h-full p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-3" size={24} />
          <span className={`text-sm ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  // Cloudflared not installed
  if (!status?.cloudflared_installed && !installing) {
    return (
      <div className={`h-full p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Globe size={48} className={`mb-4 ${isDarkMode ? 'opacity-30' : 'text-slate-300'}`} />
          <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {language === 'fr' ? 'Cloudflared requis' : 'Cloudflared required'}
          </h3>
          <p className={`text-sm mb-6 ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
            {language === 'fr' 
              ? 'Cloudflared doit être installé pour activer le Remote Access.'
              : 'Cloudflared must be installed to enable Remote Access.'}
          </p>
          <button
            onClick={installCloudflared}
            disabled={installing}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
              isDarkMode 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
            } disabled:opacity-50`}
          >
            {installing ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {language === 'fr' ? 'Installation...' : 'Installing...'}
              </>
            ) : (
              <>
                <Download size={16} />
                {language === 'fr' ? 'Installer Cloudflared' : 'Install Cloudflared'}
              </>
            )}
          </button>
          {installProgress > 0 && (
            <div className={`w-full max-w-md mt-4 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'} rounded-full h-2 overflow-hidden`}>
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${installProgress}%` }}
              />
            </div>
          )}
          <button
            onClick={loadStatus}
            className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
              isDarkMode 
                ? 'bg-white/5 text-white/60 hover:bg-white/10' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RefreshCw size={14} className={installing ? 'animate-spin' : ''} />
            {language === 'fr' ? 'Actualiser' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  // Main content when cloudflared is installed
  return (
    <div className={`h-full overflow-y-auto custom-scrollbar p-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className={`max-w-6xl mx-auto space-y-6`}>
        {/* Header avec statut visible */}
        <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-100 border border-emerald-200'}`}>
                <Globe size={24} className={status?.tunnel_running ? "text-emerald-500" : "text-gray-400"} />
              </div>
              <div>
                <h1 className={`text-xl font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Remote Access' : 'Remote Access'}
                </h1>
                <p className={`text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'Accès distant sécurisé via Cloudflare Tunnel' : 'Secure remote access via Cloudflare Tunnel'}
                </p>
              </div>
            </div>
            
            {/* Badge statut */}
            <div className={`px-4 py-2 rounded-full font-black uppercase text-xs flex items-center gap-2 ${
              status?.tunnel_running
                ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : isDarkMode ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              {status?.tunnel_running ? (
                <>
                  <Wifi size={14} />
                  ON
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  OFF
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-sm mb-2 ${isDarkMode ? 'opacity-80' : 'text-slate-700'}`}>
            {text.description}
          </p>
          <p className={`text-xs ${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>
            <Shield size={12} className="inline mr-1" />
            {text.localFirst}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-bold">{error}</span>
            </div>
          </div>
        )}

        {/* Toggle Switch rapide */}
        <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Globe size={20} className={status?.tunnel_running ? "text-emerald-500" : "opacity-30"} />
              <div>
                <span className={`text-sm font-black block ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {status?.tunnel_running 
                    ? (language === 'fr' ? 'Tunnel actif' : 'Tunnel active')
                    : (language === 'fr' ? 'Tunnel inactif' : 'Tunnel inactive')
                  }
                </span>
                {status?.cloudflared_version && (
                  <span className={`text-xs ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>
                    {language === 'fr' ? 'Version' : 'Version'}: {status.cloudflared_version.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={toggleTunnel}
              disabled={toggling || installing}
              className={`w-16 h-8 rounded-full transition-all relative flex items-center justify-center ${
                status?.tunnel_running 
                  ? 'bg-emerald-500' 
                  : isDarkMode ? 'bg-gray-700' : 'bg-slate-300'
              } ${toggling || installing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              {toggling ? (
                <Loader2 className="animate-spin text-white" size={16} />
              ) : (
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${
                  status?.tunnel_running ? 'left-9' : 'left-1'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Active tunnel content */}
        {status?.tunnel_running && status?.tunnel_url && (
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

            {/* QR Code */}
            {showQR && (
              <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <QRCodeDisplay url={status.tunnel_url} isDarkMode={isDarkMode} />
              </div>
            )}

            {/* Sessions actives (Sprint 1.2) */}
            <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'fr' ? 'Sessions actives' : 'Active sessions'}
                  </h3>
                  {sessions.length > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {sessions.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={loadSessions}
                  className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold uppercase">
                    {language === 'fr' ? 'Aucune session active' : 'No active sessions'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-100 border border-green-200'
                        }`}>
                          <Wifi size={14} className="text-green-500" />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {session.ip}
                          </p>
                          <p className={`text-[10px] ${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>
                            {language === 'fr' ? 'Dernière activité' : 'Last activity'}: {formatDate(session.lastActivity)}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSession === session.id}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                          isDarkMode 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                            : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                        }`}
                      >
                        {revokingSession === session.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <X size={12} className="inline mr-1" />
                            {language === 'fr' ? 'Révocation immédiate' : 'Revoke now'}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions par session (TODO Sprint 1.2 - à implémenter) */}
            <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Shield size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Permissions par session' : 'Permissions per session'}
                </h3>
              </div>
              
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
                <p className={`text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                  {language === 'fr' 
                    ? 'Fonctionnalité à venir dans Sprint 1.2. Les permissions seront configurables par session.'
                    : 'Feature coming in Sprint 1.2. Permissions will be configurable per session.'}
                </p>
              </div>
            </div>

            {/* Authentication Token */}
            <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                  <span className={`text-sm font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {text.authToken}
                  </span>
                </div>

                <button
                  onClick={generateToken}
                  disabled={generatingToken}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    isDarkMode 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                  }`}
                >
                  {generatingToken ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {language === 'fr' ? 'Génération...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      {status?.token_configured 
                        ? (language === 'fr' ? 'Régénérer le token' : 'Regenerate token')
                        : (language === 'fr' ? 'Générer un token' : 'Generate token')
                      }
                    </>
                  )}
                </button>
              </div>

              {/* Token options */}
              <div className={`mt-4 p-4 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="radio"
                    id="auto-token"
                    checked={tokenType === 'auto'}
                    onChange={() => setTokenType('auto')}
                    className="accent-emerald-500"
                  />
                  <label htmlFor="auto-token" className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                  <label htmlFor="custom-token" className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                      className={`w-full p-3 rounded-lg border text-sm ${
                        isDarkMode 
                          ? 'bg-black/40 border-white/20 text-white placeholder:text-white/40' 
                          : 'bg-white border-slate-300 text-gray-900 placeholder:text-slate-400'
                      }`}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={validateAndApplyCustomToken}
                        disabled={validatingCustomToken || !String(customToken || '').trim()}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                          isDarkMode 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                        }`}
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
                        <div className={`w-3 h-3 rounded-full ${
                          customTokenStrength === 'good' ? 'bg-emerald-500' : 
                          customTokenStrength === 'medium' ? 'bg-amber-500' : 
                          'bg-red-500'
                        }`} />
                        <span className={
                          customTokenStrength === 'good' ? 'text-emerald-500' : 
                          customTokenStrength === 'medium' ? 'text-amber-500' : 
                          'text-red-500'
                        }>
                          {customTokenStrength === 'good' 
                            ? (language === 'fr' ? 'Token fort' : 'Strong token') 
                            : customTokenStrength === 'medium' 
                            ? (language === 'fr' ? 'Token moyen' : 'Medium token') 
                            : (language === 'fr' ? 'Token invalide' : 'Invalid token')
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {currentToken && (
                <div className={`p-4 rounded-xl mt-4 border ${
                  isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      {text.tokenWarning}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type={showToken ? "text" : "password"}
                      readOnly
                      value={currentToken.token}
                      className={`flex-1 p-3 rounded-lg text-xs font-mono border ${
                        isDarkMode 
                          ? 'bg-black/40 text-white border-white/20' 
                          : 'bg-white text-gray-900 border-slate-300'
                      } outline-none`}
                    />

                    <button
                      onClick={() => setShowToken(!showToken)}
                      className={`p-3 rounded-lg transition-all hover:scale-105 active:scale-95 ${
                        isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    <button
                      onClick={() => copyToClipboard(currentToken.token, setCopied, 'token')}
                      className={`p-3 rounded-lg transition-all hover:scale-105 active:scale-95 ${
                        isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                    >
                      {copied === 'token' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <p className={`text-xs mt-3 ${isDarkMode ? 'opacity-50' : 'text-slate-500'}`}>
                    {text.tokenExpires} {currentToken.expires_hours} {text.hours}
                  </p>
                </div>
              )}

              {!currentToken && status?.token_configured && (
                <div className={`p-4 rounded-xl mt-4 border ${
                  isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                    {language === 'fr' 
                      ? '✅ Token configuré (masqué pour sécurité)'
                      : '✅ Token configured (hidden for security)'}
                  </p>
                </div>
              )}
            </div>

            {/* IP Allowlist */}
            <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Shield size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Liste blanche IP' : 'IP Allowlist'}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder={language === 'fr' ? 'Adresse IP (ex: 192.168.1.100)' : 'IP address (e.g., 192.168.1.100)'}
                    className={`flex-1 p-3 rounded-lg border text-sm ${
                      isDarkMode 
                        ? 'bg-black/40 border-white/20 text-white placeholder:text-white/40' 
                        : 'bg-white border-slate-300 text-gray-900 placeholder:text-slate-400'
                    }`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addAllowedIp();
                      }
                    }}
                  />
                  <button
                    onClick={addAllowedIp}
                    disabled={!newIp.trim()}
                    className={`px-4 py-3 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                      isDarkMode 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                    }`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {status?.allowed_ips && status.allowed_ips.length > 0 ? (
                  <div className="space-y-2">
                    {status.allowed_ips.map((ip, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className={`text-xs font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {ip}
                        </span>
                        <button
                          onClick={() => removeAllowedIp(ip)}
                          className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                            isDarkMode 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-4 ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>
                    <p className="text-xs">
                      {language === 'fr' 
                        ? 'Aucune IP dans la liste blanche (tous autorisés)'
                        : 'No IPs in allowlist (all allowed)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inactive state */}
        {!status?.tunnel_running && (
          <div className={`p-8 rounded-[24px] border text-center ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <Globe size={48} className={`mx-auto mb-4 ${isDarkMode ? 'opacity-30' : 'text-slate-300'}`} />
            <p className={`text-sm font-bold mb-2 ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
              {language === 'fr' 
                ? 'Remote Access est actuellement désactivé'
                : 'Remote Access is currently disabled'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'opacity-40' : 'text-slate-500'}`}>
              {language === 'fr' 
                ? 'Activez le toggle ci-dessus pour permettre l\'accès distant sécurisé'
                : 'Enable the toggle above to allow secure remote access'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function pour formater les dates
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}
