import React, { useState, useEffect } from 'react';
import { Wifi, Rocket, User, Save, Languages, Loader2, HardDrive, Search, Check, AlertCircle, Shield, Globe, Sparkles, Cpu } from 'lucide-react';
import { translations } from '../constants/translations';
import { useTheme } from '../contexts/ThemeContext';
import { open } from '@tauri-apps/plugin-dialog';
import { requestWorker } from '../services/bridge';
// RemoteAccess déplacé dans la sidebar principale (V2.1)
import PermissionService from '../services/permission_service';

export default function Settings({ userName, setUserName, language, setLanguage, setActiveTab }) {
  const { isDarkMode } = useTheme();

  const defaultSettings = {
    userName: userName || "Horizon",
    language: language || "fr",
    internetAccess: false,
    gpuAcceleration: true,
    runAtStartup: false,
    autoUpdate: true,
    ollama_models_path: ""
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelsPath, setModelsPath] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [paranoMode, setParanoMode] = useState(true); // Mode parano (V2)
  const [clickCount, setClickCount] = useState(0); // Easter egg counter
  const [showSecurityConfirm, setShowSecurityConfirm] = useState(false);
  const [pendingSecurityValue, setPendingSecurityValue] = useState(false);
  const [securityConfirmMessage, setSecurityConfirmMessage] = useState('');

  const t = translations[settings.language] || translations.en;

  // --- CHARGEMENT DES PARAMÈTRES AU DÉMARRAGE ---
  useEffect(() => {
    const initSettings = async () => {
      try {
        const response = await requestWorker("load_settings");

        if (response && typeof response === 'object') {
          const mergedSettings = { ...defaultSettings, ...response };
          setSettings(mergedSettings);
          if (mergedSettings.ollama_models_path) setModelsPath(mergedSettings.ollama_models_path);
          if (mergedSettings.userName) setUserName(mergedSettings.userName);
          if (mergedSettings.language) setLanguage(mergedSettings.language);
        }

        // Charger le mode parano (V2)
        const parano = await PermissionService.getParanoMode();
        setParanoMode(parano);
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres:", err);
      } finally {
        setLoading(false);
      }
    };

    initSettings();
  }, [setUserName, setLanguage]);

  // --- SAUVEGARDE AUTOMATIQUE (pour les toggles) ---
  const saveSettingsAuto = async (newSettings) => {
    try {
      await requestWorker("save_settings", newSettings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("Erreur sauvegarde auto:", err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // --- TOGGLE AVEC SAUVEGARDE AUTOMATIQUE ---
  const toggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    // Sauvegarde automatique immédiate
    await saveSettingsAuto(newSettings);
  };

  // --- CHANGEMENT DE LANGUE AUTOMATIQUE ---
  const handleLanguageChange = async (newLang) => {
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    setLanguage(newLang);
    await saveSettingsAuto(newSettings);
  };

  // --- SAUVEGARDE MANUELLE (bouton Save) ---
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await requestWorker("save_settings", settings);
      setUserName(settings.userName);
      setLanguage(settings.language);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const requestSecurityToggle = () => {
    const newValue = !paranoMode;
    const message = newValue
      ? (language === 'fr'
        ? "Securite maximale activee: chaque action sensible demandera votre accord. Continuer ?"
        : "Maximum security enabled: sensitive actions will always ask for approval. Continue?")
      : (language === 'fr'
        ? "Securite maximale desactivee: les autorisations accordees peuvent persister. Continuer ?"
        : "Maximum security disabled: granted permissions may persist. Continue?");

    setPendingSecurityValue(newValue);
    setSecurityConfirmMessage(message);
    setShowSecurityConfirm(true);
  };

  const confirmSecurityToggle = async () => {
    try {
      await PermissionService.setParanoMode(pendingSecurityValue);
      setParanoMode(pendingSecurityValue);
      window.dispatchEvent(new CustomEvent('parano-mode-updated', {
        detail: { enabled: pendingSecurityValue }
      }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("Erreur changement mode securite:", err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setShowSecurityConfirm(false);
    }
  };

  // --- SÉLECTION DU DOSSIER OLLAMA ---
  const selectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === 'fr' ? "Sélectionner le dossier des modèles Ollama" : "Select Ollama models folder"
      });

      if (selected && !Array.isArray(selected)) {
        setModelsPath(selected);

        const newSettings = { ...settings, ollama_models_path: selected };
        setSettings(newSettings);
        await saveSettingsAuto(newSettings);
      }
    } catch (err) {
      console.error("Erreur sélection dossier:", err);
    }
  };

  if (loading) return (
    <div className={`p-20 opacity-20 animate-pulse font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {language === 'fr' ? 'INITIALISATION...' : 'INITIALIZING...'}
    </div>
  );

  return (
    <div className={`p-6 sm:p-8 lg:p-12 xl:p-16 w-full h-full overflow-y-auto custom-scrollbar animate-page-entry transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="w-[90%] lg:w-[92%] xl:w-[94%] 2xl:w-[95%] mx-auto space-y-10">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Barre prismatique arc-en-ciel */}
              <div
                className="h-1 w-12 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))'
                }}
              />
              <span className={`font-black text-[10px] uppercase tracking-[0.4em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.settings?.subtitle || "CONFIGURATION"}</span>
            </div>
            <h1
              className="text-5xl font-black italic uppercase tracking-tighter leading-tight cursor-pointer select-none transition-all hover:opacity-80"
              onClick={() => {
                const newCount = clickCount + 1;
                setClickCount(newCount);
                // Reset après 5 secondes d'inactivité
                setTimeout(() => setClickCount(0), 5000);
              }}
              title={clickCount > 0 ? `${clickCount}/3 clicks` : ''}
            >
              {t.settings?.title || "SETTINGS"} <span className={`${isDarkMode ? 'opacity-30' : 'opacity-10'} italic font-light`}>Horizon</span>
            </h1>
          </div>

          {/* Status Badge */}
          {saveStatus && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl animate-fade-in ${saveStatus === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-500 border border-red-500/30'
              }`}>
              {saveStatus === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span className="text-xs font-bold uppercase">
                {saveStatus === 'success'
                  ? (language === 'fr' ? 'Sauvegardé' : 'Saved')
                  : (language === 'fr' ? 'Erreur' : 'Error')}
              </span>
            </div>
          )}
        </div>

        {/* Easter Egg - Animation Demo Access */}
        {clickCount >= 3 && (
          <div className="animate-fade-in">
            <button
              onClick={() => {
                if (setActiveTab) {
                  setActiveTab('animation-demo');
                }
              }}
              className={`w-full p-6 rounded-3xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode
                ? 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/30 hover:border-indigo-400/50'
                : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200 hover:border-indigo-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <Sparkles className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-sm mb-1">
                      {language === 'fr' ? '🎨 Démo d\'Animation' : '🎨 Animation Demo'}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      {language === 'fr'
                        ? 'Explorez l\'effet Loop+Audio Icon interactif'
                        : 'Explore the interactive Loop+Audio Icon effect'}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-white/10 text-white/70' : 'bg-white text-gray-700'
                  }`}>
                  {language === 'fr' ? 'Découvrir →' : 'Explore →'}
                </div>
              </div>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 xl:gap-8">

          {/* INTERFACE */}
          <SectionContainer title={t.settings?.interface_title || "INTERFACE"} icon={Languages} isDarkMode={isDarkMode}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDarkMode ? 'opacity-60' : 'text-slate-500'}`}>{t.settings?.lang_label || "Language"}</span>
                <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                  {['fr', 'en'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.language === lang ? 'text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                      style={settings.language === lang ? {
                        background: isDarkMode
                          ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                          : 'linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
                      } : {}}
                    >
                      {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                icon={Cpu}
                label={t.settings?.gpuAcceleration || "GPU Acceleration"}
                description={t.settings?.gpuAcceleration_desc || (language === 'fr' ? 'Acceleration GPU pour Ollama.' : 'Use GPU acceleration for Ollama.')}
                active={settings.gpuAcceleration}
                onClick={() => toggleSetting('gpuAcceleration')}
                isDarkMode={isDarkMode}
              />
              <ToggleRow
                icon={Wifi}
                label={t.settings?.internet_label || "Internet Access"}
                description={language === 'fr' ? "Permettre l'accès réseau pour les fonctionnalités avancées" : "Allow network access for advanced features"}
                active={settings.internetAccess}
                onClick={() => toggleSetting('internetAccess')}
                isDarkMode={isDarkMode}
              />
            </div>
          </SectionContainer>

          {/* SYSTEM */}
          <SectionContainer title={t.settings?.init_title || "SYSTEM"} icon={Rocket} isDarkMode={isDarkMode}>
            <div className="space-y-6">
              {/* Version info */}
              <div className={`flex items-center justify-between p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                <div>
                  <p className="text-xs font-bold">{language === 'fr' ? 'Version' : 'Version'}</p>
                  <p className={`text-[9px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>Horizon AI v1.0</p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">STABLE</span>
              </div>

              {/* Startup option */}
              <ToggleRow
                label={t.settings?.startup_label || "Startup"}
                description={t.settings?.startup_desc || (language === 'fr' ? "Lancer au demarrage du systeme." : "Launch at system startup.")}
                active={settings.runAtStartup}
                onClick={() => toggleSetting('runAtStartup')}
                isDarkMode={isDarkMode}
              />

              {/* Auto-update option */}
              <ToggleRow
                label={t.settings?.update_label || "Updates"}
                description={t.settings?.update_desc || (language === 'fr' ? "Mise a jour auto des modeles." : "Auto-update installed models.")}
                active={settings.autoUpdate}
                onClick={() => toggleSetting('autoUpdate')}
                isDarkMode={isDarkMode}
              />
            </div>
          </SectionContainer>

          {/* SÉCURITÉ (V2) */}
          <SectionContainer title={language === 'fr' ? "SECURITE" : "SECURITY"} icon={Shield} isDarkMode={isDarkMode}>
            <div className="space-y-6">
              {/* Securite maximale */}
              <ToggleRow
                label={language === 'fr' ? "Securite maximale" : "Maximum security"}
                description={language === 'fr'
                  ? "Toutes les actions sensibles demandent votre accord."
                  : "Sensitive actions always ask for your approval."}
                active={paranoMode}
                onClick={requestSecurityToggle}
                isDarkMode={isDarkMode}
              />

              {paranoMode && (
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-500 mb-1 font-bold">
                        {language === 'fr' ? 'Securite maximale active' : 'Maximum security active'}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? 'opacity-60' : 'text-slate-600'}`}>
                        {language === 'fr'
                          ? "Vous devrez confirmer a nouveau a chaque action sensible."
                          : "You will confirm again for each sensitive action."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionContainer>

          {/* STOCKAGE */}
          <SectionContainer title={t.settings?.storage_title || "STORAGE"} icon={HardDrive} isDarkMode={isDarkMode}>
            <div className="space-y-4">
              <p className={`text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-500'}`}>{t.settings?.storage_desc || "Ollama models path."}</p>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={modelsPath}
                  placeholder={t.settings?.storage_placeholder || "Default path..."}
                  className={`flex-1 min-w-0 p-3 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white/40' : 'bg-white border-slate-200 text-slate-400'}`}
                />
                <button
                  onClick={selectFolder}
                  className="w-full sm:w-auto px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  }}
                >
                  <Search size={16} />
                  {t.settings?.storage_browse || "Browse"}
                </button>
              </div>

              {modelsPath && (
                <p className={`text-[10px] ${isDarkMode ? 'text-emerald-400/60' : 'text-emerald-600'}`}>
                  ✓ {language === 'fr' ? 'Chemin configuré' : 'Path configured'}
                </p>
              )}
            </div>
          </SectionContainer>

          {/* IDENTITY */}
          <div className={`md:col-span-2 lg:col-span-2 xl:col-span-3 2xl:col-span-4 p-8 rounded-[32px] border transition-all ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-4 mb-8">
              <User className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={22} />
              <h2 className="text-sm font-black uppercase tracking-widest">{t.settings?.identity_title || "IDENTITY"}</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 block ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>{t.settings?.name_label || "User Name"}</label>
                <input
                  type="text"
                  value={settings.userName}
                  onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                  className={`w-full border rounded-2xl px-6 py-4 font-bold outline-none focus:border-gray-400 transition-all ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="px-10 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 min-w-[200px] justify-center shadow-lg active:scale-95 disabled:opacity-50 hover:scale-105"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                    : 'linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? (t.settings?.syncing || "SYNCING") : (t.settings?.save_btn || "SAVE")}
              </button>
            </div>
          </div>

        </div>

        {/* Version Footer */}
        <div className={`text-center pt-8 ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
          <p className="text-xs font-mono">Horizon AI v1.0</p>
        </div>
      </div>

      {showSecurityConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className={`w-full max-w-md rounded-[24px] border p-6 shadow-2xl ${isDarkMode ? 'bg-[#0b0b0f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            style={{
              boxShadow: isDarkMode
                ? '0 25px 60px rgba(0,0,0,0.55)'
                : '0 25px 60px rgba(0,0,0,0.15)'
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className={pendingSecurityValue ? 'text-emerald-400' : 'text-rose-400'} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {language === 'fr' ? 'Securite maximale' : 'Maximum security'}
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-slate-600'}`}>
                  {securityConfirmMessage}
                </p>
              </div>
              <button
                onClick={() => setShowSecurityConfirm(false)}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${isDarkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-slate-100 text-slate-500'}`}
                aria-label={language === 'fr' ? 'Fermer' : 'Close'}
              >
                x
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSecurityConfirm(false)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-800'}`}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={confirmSecurityToggle}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pendingSecurityValue ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}
              >
                {pendingSecurityValue ? (language === 'fr' ? 'Activer' : 'Enable') : (language === 'fr' ? 'Desactiver' : 'Disable')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANTS INTERNES UTILITAIRES ---
const SectionContainer = ({ children, title, icon: Icon, isDarkMode }) => (
  <div className={`min-w-0 p-8 rounded-[32px] border transition-all ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex items-center gap-4 mb-8">
      <Icon className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={22} />
      <h2 className="text-sm font-black uppercase tracking-widest">{title}</h2>
    </div>
    {children}
  </div>
);

const ToggleRow = ({ icon: Icon, label, description, active, onClick, isDarkMode, disabled = false }) => (
  <div className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all overflow-hidden ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'} ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {Icon && <Icon size={16} className={active ? "text-emerald-500" : "opacity-20"} />}
      <div className="min-w-0">
        <span className="text-xs font-bold block">{label}</span>
        {description && <span className={`text-[9px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'} block`}>{description}</span>}
      </div>
    </div>
    <Toggle active={active} onClick={disabled ? undefined : onClick} disabled={disabled} />
  </div>
);

const Toggle = ({ active, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${active ? 'left-7' : 'left-1'}`}></div>
  </button>
);
