import React, { useEffect, useState } from 'react';
import { ShieldCheck, Globe, Database, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import PermissionService from '../services/permission_service';
import { requestWorker } from '../services/bridge';

const SecurityCenter = ({ language = 'fr', setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;
  const s = t.securityCenter || {};

  const [paranoMode, setParanoMode] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValue, setPendingValue] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSecurity = async () => {
      try {
        const parano = await PermissionService.getParanoMode();
        if (isMounted) setParanoMode(!!parano);
      } catch {
        if (isMounted) setParanoMode(false);
      }
    };

    const loadRemote = async () => {
      try {
        const status = await requestWorker('tunnel_get_status');
        if (isMounted) setRemoteStatus(status);
      } catch {
        if (isMounted) setRemoteStatus(null);
      }
    };

    loadSecurity();
    loadRemote();

    const interval = setInterval(loadRemote, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleSecurity = async () => {
    const nextValue = !paranoMode;
    const confirmMessage = nextValue
      ? (s.confirmEnable || 'Enable maximum security?')
      : (s.confirmDisable || 'Disable maximum security?');

    setPendingValue(nextValue);
    setConfirmMessage(confirmMessage);
    setShowConfirm(true);
  };

  const handleConfirmToggle = async () => {
    try {
      await PermissionService.setParanoMode(pendingValue);
      setParanoMode(pendingValue);
      window.dispatchEvent(new CustomEvent('parano-mode-updated', {
        detail: { enabled: pendingValue }
      }));
    } catch (error) {
      console.error('Failed to update security mode:', error);
    } finally {
      setShowConfirm(false);
    }
  };

  const remoteOn = remoteStatus?.tunnel_running;
  const remoteLabel = remoteOn ? (s.remoteOn || 'On') : (s.remoteOff || 'Off');

  return (
    <div className={`p-6 sm:p-8 lg:p-12 w-full h-full overflow-y-auto custom-scrollbar ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {s.title || 'Security'}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
            {s.subtitle || 'Clear, human approvals. Nothing happens without you.'}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} className={paranoMode ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {s.maximumTitle || 'Maximum security'}
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                  {s.maximumDesc || 'Always ask before sensitive actions.'}
                </p>
              </div>
              <button
                onClick={handleToggleSecurity}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paranoMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}
              >
                {paranoMode ? (s.enabled || 'Enabled') : (s.disabled || 'Disabled')}
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={18} className={remoteOn ? 'text-emerald-400' : 'text-slate-400'} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {s.remoteTitle || 'Access from another device'}
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                  {s.remoteDesc || 'Optional. You stay in control.'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${remoteOn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                {remoteLabel}
              </span>
            </div>
            <button
              onClick={() => setActiveTab?.('remote')}
              className={`mt-4 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {s.remoteAction || 'Open access settings'} <ArrowRight size={12} className="inline ml-2" />
            </button>
          </div>
        </div>

        <div className={`p-6 rounded-[24px] border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database size={18} className="text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {s.historyTitle || 'Local history'}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                {s.historyDesc || 'Stored on this device only.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab?.('memory')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'}`}
            >
              {s.historyAction || 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className={`w-full max-w-md rounded-[24px] border p-6 shadow-2xl ${isDarkMode ? 'bg-[#0b0b0f] border-white/10' : 'bg-white border-slate-200'}`}
            style={{
              boxShadow: isDarkMode
                ? '0 25px 60px rgba(0,0,0,0.55)'
                : '0 25px 60px rgba(0,0,0,0.15)'
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} className={pendingValue ? 'text-emerald-400' : 'text-rose-400'} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {s.maximumTitle || 'Maximum security'}
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-slate-600'}`}>
                  {confirmMessage}
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${isDarkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-500'}`}
                aria-label={language === 'fr' ? 'Fermer' : 'Close'}
              >
                x
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-800'}`}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pendingValue ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}
              >
                {pendingValue ? (s.enabled || 'Enabled') : (s.disabled || 'Disabled')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenter;
