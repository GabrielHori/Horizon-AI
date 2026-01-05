import React, { useState, useEffect } from 'react';
import { Wifi, Rocket, User, Save, Languages, Loader2, HardDrive, Search, Check, AlertCircle } from 'lucide-react';
import { translations } from '../constants/translations';
import { useTheme } from '../contexts/ThemeContext';
import { open } from '@tauri-apps/plugin-dialog';
import { requestWorker } from '../services/bridge';

export default function Settings({ userName, setUserName, language, setLanguage }) {
  const { isDarkMode } = useTheme();
  
  const [settings, setSettings] = useState({
    userName: userName || "Horizon",
    language: language || "fr",
    internetAccess: false,
    runAtStartup: false,
    autoUpdate: true,
    ollama_models_path: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelsPath, setModelsPath] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

  const t = translations[settings.language] || translations.en;

  // --- CHARGEMENT DES PARAMÈTRES AU DÉMARRAGE ---
  useEffect(() => {
    const initSettings = async () => {
      try {
        const response = await requestWorker("load_settings");
        
        if (response && typeof response === 'object') {
          setSettings(response);
          if (response.ollama_models_path) setModelsPath(response.ollama_models_path);
          if (response.userName) setUserName(response.userName);
          if (response.language) setLanguage(response.language);
        }
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
    <div className={`p-12 w-full h-full overflow-y-auto custom-scrollbar animate-page-entry transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
              <span className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.4em]">{t.settings?.subtitle || "CONFIGURATION"}</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-tight">
              {t.settings?.title || "SETTINGS"} <span className={`${isDarkMode ? 'opacity-30' : 'opacity-10'} italic font-light`}>Horizon</span>
            </h1>
          </div>
          
          {/* Status Badge */}
          {saveStatus && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl animate-fade-in ${
              saveStatus === 'success' 
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
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
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.language === lang ? 'bg-indigo-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                      {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                icon={Wifi}
                label={t.settings?.internet_label || "Internet Access"}
                description={language === 'fr' ? "Permettre l'accès réseau pour les fonctionnalités avancées" : "Allow network access for advanced features"}
                active={settings.internetAccess}
                onClick={() => toggleSetting('internetAccess')}
                color="bg-emerald-500"
                isDarkMode={isDarkMode}
              />
            </div>
          </SectionContainer>

          {/* INITIALIZATION */}
          <SectionContainer title={t.settings?.init_title || "SYSTEM"} icon={Rocket} isDarkMode={isDarkMode}>
            <div className="space-y-6">
              <ToggleRow
                label={t.settings?.startup_label || "Startup"}
                description={t.settings?.startup_sub || "Launch with OS"}
                active={settings.runAtStartup}
                onClick={() => toggleSetting('runAtStartup')}
                isDarkMode={isDarkMode}
              />

              <ToggleRow
                label={t.settings?.update_label || "Updates"}
                description={t.settings?.update_sub || "Auto-update models"}
                active={settings.autoUpdate}
                onClick={() => toggleSetting('autoUpdate')}
                isDarkMode={isDarkMode}
              />
            </div>
          </SectionContainer>

          {/* STOCKAGE */}
          <SectionContainer title={t.settings?.storage_title || "STORAGE"} icon={HardDrive} isDarkMode={isDarkMode}>
            <div className="space-y-4">
              <p className={`text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-500'}`}>{t.settings?.storage_desc || "Ollama models path."}</p>
              
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  readOnly
                  value={modelsPath} 
                  placeholder={t.settings?.storage_placeholder || "Default path..."}
                  className={`flex-1 p-3 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-black/40 border-white/5 text-white/40' : 'bg-white border-slate-200 text-slate-400'}`}
                />
                <button 
                  onClick={selectFolder}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
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
          <div className={`md:col-span-2 p-8 rounded-[32px] border transition-all ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-4 mb-8">
              <User className="text-indigo-500" size={22} />
              <h2 className="text-sm font-black uppercase tracking-widest">{t.settings?.identity_title || "IDENTITY"}</h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <label className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 block ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>{t.settings?.name_label || "User Name"}</label>
                <input 
                  type="text" 
                  value={settings.userName} 
                  onChange={(e) => setSettings({...settings, userName: e.target.value})}
                  className={`w-full border rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                />
              </div>
              <button 
                onClick={saveSettings} 
                disabled={isSaving} 
                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 min-w-[200px] justify-center shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? (t.settings?.syncing || "SYNCING") : (t.settings?.save_btn || "SAVE")}
              </button>
            </div>
          </div>

        </div>
        
        {/* Version Footer */}
        <div className={`text-center pt-8 ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
          <p className="text-xs font-mono">Horizon AI v1.0 • {language === 'fr' ? 'Construit avec' : 'Built with'} ❤️</p>
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANTS INTERNES UTILITAIRES ---
const SectionContainer = ({ children, title, icon: Icon, isDarkMode }) => (
  <div className={`p-8 rounded-[32px] border transition-all ${isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex items-center gap-4 mb-8">
      <Icon className="text-indigo-500" size={22} />
      <h2 className="text-sm font-black uppercase tracking-widest">{title}</h2>
    </div>
    {children}
  </div>
);

const ToggleRow = ({ icon: Icon, label, description, active, onClick, color = "bg-indigo-600", isDarkMode }) => (
  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
    <div className="flex items-center gap-3">
      {Icon && <Icon size={16} className={active ? "text-emerald-500" : "opacity-20"} />}
      <div>
        <span className="text-xs font-bold block">{label}</span>
        {description && <span className={`text-[9px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>{description}</span>}
      </div>
    </div>
    <Toggle active={active} onClick={onClick} color={color} />
  </div>
);

const Toggle = ({ active, onClick, color = "bg-indigo-600" }) => (
  <button 
    onClick={onClick} 
    className={`w-12 h-6 rounded-full transition-all relative ${active ? color : 'bg-slate-300 dark:bg-gray-700'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${active ? 'left-7' : 'left-1'}`}></div>
  </button>
);
