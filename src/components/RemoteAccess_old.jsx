/**
 * RemoteAccess Component
 * ======================
 * Interface pour gérer l'accès distant sécurisé via Cloudflare Tunnel.
 *
 * Fonctionnalités:
 * - Toggle activation/désactivation du tunnel
 * - Affichage de l'URL publique
 * - Génération et affichage du token d'authentification
 * - QR Code pour accès mobile
 * - Gestion de la liste blanche IP
 *
 * PHILOSOPHIE LOCAL-FIRST:
 * Aucune donnée n'est envoyée vers le cloud. Cloudflare ne fait que relayer le trafic.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

// Composant QR Code simple (SVG)
const QRCodeDisplay = ({ data, size = 200, isDarkMode }) => {
  // Générer un QR code simple via une API externe (optionnel)
  // Pour une solution 100% locale, on pourrait utiliser une lib comme 'qrcode'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=${isDarkMode ? '1a1a1a' : 'ffffff'}&color=${isDarkMode ? 'ffffff' : '000000'}`;

  return (
    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} flex items-center justify-center`}>
      <img
        src={qrUrl}
        alt="QR Code for remote access"
        className="rounded-lg"
        width={size}
        height={size}
      />
    </div>
  );
};

export default function RemoteAccess({ language = 'fr', isDarkMode = true }) {
  // États
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(null); // 'url' | 'token' | null
  const [error, setError] = useState(null);
  const [newIp, setNewIp] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [tokenType, setTokenType] = useState('auto'); // 'auto' ou 'custom'
  const [customToken, setCustomToken] = useState('');
  const [customTokenStrength, setCustomTokenStrength] = useState(null);
  const [validatingCustomToken, setValidatingCustomToken] = useState(false);

  // Traductions
  const t = {
    fr: {
      title: "ACCÈS DISTANT",
      subtitle: "Cloudflare Tunnel",
      description: "Accédez à votre IA locale depuis n'importe où",
      localFirst: "100% Local-First - Aucune donnée stockée dans le cloud",

      // Status
      tunnelActive: "Tunnel Actif",
      tunnelInactive: "Tunnel Inactif",
      connecting: "Connexion en cours...",

      // Actions
      enableRemoteAccess: "Activer l'accès distant",
      disableRemoteAccess: "Désactiver l'accès distant",

      // URL
      publicUrl: "URL Publique",
      copyUrl: "Copier l'URL",
      urlCopied: "URL copiée !",
      openInBrowser: "Ouvrir dans le navigateur",

      // Token
      authToken: "Token d'Authentification",
      generateNewToken: "Générer un nouveau token",
      regenerateToken: "Régénérer",
      tokenGenerated: "Token généré",
      tokenExpires: "Expire dans",
      hours: "heures",
      copyToken: "Copier le token",
      tokenCopied: "Token copié !",
      showToken: "Afficher",
      hideToken: "Masquer",
      tokenWarning: "Ce token ne sera affiché qu'une seule fois. Copiez-le maintenant !",

      // QR Code
      qrCode: "QR Code Mobile",
      scanQR: "Scannez ce code avec votre téléphone",
      showQR: "Afficher le QR Code",
      hideQR: "Masquer le QR Code",

      // IP Allowlist
      ipAllowlist: "Liste Blanche IP",
      ipAllowlistDesc: "Restreindre l'accès à des IPs spécifiques (optionnel)",
      addIp: "Ajouter une IP",
      noIpRestriction: "Aucune restriction (toutes les IPs autorisées)",

      // Cloudflared
      cloudflaredRequired: "Cloudflared requis",
      cloudflaredNotInstalled: "Cloudflared n'est pas installé",
      installCloudflared: "Installer Cloudflared",
      installCommand: "Commande d'installation",
      version: "Version",

      // Security
      securityNote: "Note de sécurité",
      securityInfo: "Toutes les requêtes distantes nécessitent le token d'authentification. Le rate limiting protège contre les abus.",

      // Errors
      errorStarting: "Erreur lors du démarrage du tunnel",
      errorStopping: "Erreur lors de l'arrêt du tunnel",
      errorGeneratingToken: "Erreur lors de la génération du token"
    },
    en: {
      title: "REMOTE ACCESS",
      subtitle: "Cloudflare Tunnel",
      description: "Access your local AI from anywhere",
      localFirst: "100% Local-First - No data stored in the cloud",

      // Status
      tunnelActive: "Tunnel Active",
      tunnelInactive: "Tunnel Inactive",
      connecting: "Connecting...",

      // Actions
      enableRemoteAccess: "Enable remote access",
      disableRemoteAccess: "Disable remote access",

      // URL
      publicUrl: "Public URL",
      copyUrl: "Copy URL",
      urlCopied: "URL copied!",
      openInBrowser: "Open in browser",

      // Token
      authToken: "Authentication Token",
      generateNewToken: "Generate new token",
      regenerateToken: "Regenerate",
      tokenGenerated: "Token generated",
      tokenExpires: "Expires in",
      hours: "hours",
      copyToken: "Copy token",
      tokenCopied: "Token copied!",
      showToken: "Show",
      hideToken: "Hide",
      tokenWarning: "This token will only be displayed once. Copy it now!",

      // QR Code
      qrCode: "Mobile QR Code",
      scanQR: "Scan this code with your phone",
      showQR: "Show QR Code",
      hideQR: "Hide QR Code",

      // IP Allowlist
      ipAllowlist: "IP Allowlist",
      ipAllowlistDesc: "Restrict access to specific IPs (optional)",
      addIp: "Add IP",
      noIpRestriction: "No restriction (all IPs allowed)",

      // Cloudflared
      cloudflaredRequired: "Cloudflared required",
      cloudflaredNotInstalled: "Cloudflared is not installed",
      installCloudflared: "Install Cloudflared",
      installCommand: "Install command",
      version: "Version",

      // Security
      securityNote: "Security Note",
      securityInfo: "All remote requests require the authentication token. Rate limiting protects against abuse.",

      // Errors
      errorStarting: "Error starting tunnel",
      errorStopping: "Error stopping tunnel",
      errorGeneratingToken: "Error generating token"
    }
  };

  const text = t[language] || t.en;

  // Charger le statut au montage
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

    // Rafraîchir le statut toutes les 5 secondes quand le tunnel est actif
    const interval = setInterval(() => {
      if (status?.tunnel_running) {
        loadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadStatus, status?.tunnel_running]);

  // Polling de la progression pendant l'installation (DOIT être avant les returns conditionnels)
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
          // Ignorer les erreurs de polling
        }
      }, 500);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [installing]);

  // Installation automatique de cloudflared
  const installCloudflared = useCallback(async () => {
    setInstalling(true);
    setInstallProgress(0);
    setError(null);

    try {
      // Démarrer l'installation
      const result = await requestWorker("tunnel_install_cloudflared");

      if (result?.success) {
        setInstallProgress(100);
        // Recharger le statut après installation
        await loadStatus();
      } else {
        setError(result?.error || "Installation failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setInstalling(false);
    }
  }, [loadStatus]);

  // Toggle tunnel
  const toggleTunnel = async () => {
    setToggling(true);
    setError(null);

    try {
      if (status?.tunnel_running) {
        await requestWorker("tunnel_stop");
      } else {
        // Vérifier si un token existe, sinon en générer un
        if (!status?.token_configured) {
          const tokenResult = await requestWorker("tunnel_generate_token", { expires_hours: 24 });
          if (tokenResult?.token) {
            setCurrentToken(tokenResult);
            setShowToken(true);
          }
        }

        const result = await requestWorker("tunnel_start");
        if (!result?.success) {
          setError(result?.error || text.errorStarting);
        }
      }

      // Recharger le statut
      await loadStatus();

    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  // Générer un nouveau token
  const generateToken = async () => {
    setGeneratingToken(true);
    setError(null);

    try {
      const result = await requestWorker("tunnel_generate_token", { expires_hours: 24 });
      if (result?.token) {
        setCurrentToken(result);
        setShowToken(true);
        await loadStatus();
      }
    } catch (err) {
      setError(text.errorGeneratingToken);
    } finally {
      setGeneratingToken(false);
    }
  };

  // Copier dans le presse-papier
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Ajouter une IP à la liste blanche
  const addAllowedIp = async () => {
    if (!newIp.trim()) return;

    try {
      await requestWorker("tunnel_add_allowed_ip", { ip: newIp.trim() });
      setNewIp('');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  // Supprimer une IP de la liste blanche
  const removeAllowedIp = async (ip) => {
    try {
      await requestWorker("tunnel_remove_allowed_ip", { ip });
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  // Validation du token personnalisé
  const validateCustomToken = async () => {
    if (!String(customToken || '').trim()) {
      setError(language === 'fr' ? 'Token requis' : 'Token required');
      return;
    }

    try {
      setValidatingCustomToken(true);
      setCustomTokenStrength(null);
      setError(null);

      const result = await requestWorker("tunnel_validate_custom_token", {
        token: customToken
      });

      if (result?.valid) {
        setCustomTokenStrength(result.strength);
      } else {
        setCustomTokenStrength('invalid');
        setError(result?.error || (language === 'fr' ? 'Token invalide' : 'Invalid token'));
      }
    } catch (err) {
      setCustomTokenStrength('invalid');
      setError(err.message);
    } finally {
      setValidatingCustomToken(false);
    }
  };

  // Définir un token personnalisé
  const applyCustomToken = async () => {
    if (!customToken.trim() || !customTokenStrength || customTokenStrength === 'invalid') {
      setError(language === 'fr' ? 'Token invalide' : 'Invalid token');
      return;
    }

    try {
      setGeneratingToken(true);
      setError(null);

      const result = await requestWorker("tunnel_set_custom_token", {
        token: customToken
      });

      if (result?.success) {
        setCurrentToken({
          token: customToken,
          expires_hours: 24
        });
        setShowToken(true);
        setTokenType('auto'); // Retour au mode auto après définition
        setCustomToken('');
        setCustomTokenStrength(null);
        await loadStatus();
      } else {
        setError(result?.error || (language === 'fr' ? 'Erreur lors de la définition du token' : 'Error setting token'));
      }
    } catch (err) {
      setError(text.errorGeneratingToken);
    } finally {
      setGeneratingToken(false);
    }
  };

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

  // Afficher l'écran d'installation si cloudflared n'est pas installé
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

              {/* Bouton d'installation automatique */}
              {!installing ? (
                <button
                  onClick={installCloudflared}
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
                  {/* Barre de progression */}
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

              {/* Installation manuelle (alternative) */}
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

  return (
    <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Globe className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={22} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">{text.title}</h2>
            <p className={`text-[10px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>{text.subtitle}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
          {status?.tunnel_running ? <Unlock size={14} /> : <Lock size={14} />}
          <span className="text-xs font-bold">
            {toggling ? text.connecting : status?.tunnel_running ? text.tunnelActive : text.tunnelInactive}
          </span>
        </div>
      </div>

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

      {/* Contenu actif quand le tunnel est en cours */}
      {status?.tunnel_running && (
        <div className="space-y-6">

          {/* URL Publique */}
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">{text.publicUrl}</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={status?.tunnel_url || "Initialisation..."}
                className={`flex-1 p-3 rounded-xl text-xs font-mono ${isDarkMode ? 'bg-black/40 text-white' : 'bg-white text-slate-900'} border-none outline-none`}
              />

              <button
                onClick={() => copyToClipboard(status?.tunnel_url, 'url')}
                className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
                title={text.copyUrl}
              >
                {copied === 'url' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>

              <a
                href={status?.tunnel_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
                title={text.openInBrowser}
              >
                <ExternalLink size={16} />
              </a>
            </div>

            {copied === 'url' && (
              <p className="text-xs text-emerald-500 mt-2">{text.urlCopied}</p>
            )}

            {/* Lien personnalisé avec token */}
            {currentToken && status?.tunnel_url && (
              <div className={`mt-4 p-3 rounded-xl ${isDarkMode ? 'bg-black/40' : 'bg-white'}`}>
                <p className={`text-[10px] mb-2 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
                  {language === 'fr' ? '🔗 Lien avec authentification (connexion automatique):' : '🔗 Link with auth (auto-login):'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${status.tunnel_url}?token=${currentToken.token}`}
                    className={`flex-1 p-2 rounded-lg text-[10px] font-mono ${isDarkMode ? 'bg-white/5 text-white/60' : 'bg-slate-50 text-slate-600'} border-none outline-none`}
                  />
                  <button
                    onClick={() => copyToClipboard(`${status.tunnel_url}?token=${currentToken.token}`, 'fullUrl')}
                    className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition-colors`}
                    title={language === 'fr' ? 'Copier le lien complet' : 'Copy full link'}
                  >
                    {copied === 'fullUrl' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className={`text-[9px] mt-2 ${isDarkMode ? 'text-amber-400/60' : 'text-amber-600'}`}>
                  ⚠️ {language === 'fr' ? 'Ce lien contient votre token - ne le partagez pas publiquement' : 'This link contains your token - do not share publicly'}
                </p>
              </div>
            )}
          </div>

          {/* Token d'authentification */}
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

            {/* Options de token */}
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
                      onClick={validateCustomToken}
                      disabled={validatingCustomToken || !String(customToken || '').trim()}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors disabled:opacity-50`}
                    >
                      {validatingCustomToken ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {language === 'fr' ? 'Validation...' : 'Validating...'}
                        </>
                      ) : (
                        language === 'fr' ? 'Valider le token' : 'Validate token'
                      )}
                    </button>

                    <button
                      onClick={setCustomToken}
                      disabled={!customTokenStrength || customTokenStrength === 'invalid'}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition-colors disabled:opacity-50`}
                    >
                      {language === 'fr' ? 'Définir ce token' : 'Set this token'}
                    </button>
                  </div>

                  {/* Indicateur de force */}
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
                    onClick={() => copyToClipboard(currentToken.token, 'token')}
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

          {/* Liste blanche IP */}
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} />
              <span className="text-xs font-bold">{text.ipAllowlist}</span>
            </div>
            <p className={`text-[10px] mb-3 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
              {text.ipAllowlistDesc}
            </p>

            {/* Liste des IPs */}
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

            {/* Ajouter une IP */}
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

      {/* Note de sécurité (toujours visible) */}
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
}// Validation du token personnalisé
