import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import { requestWorker } from '../services/bridge';

const TopBar = ({ activeTab, selectedModel, setSelectedModel, userName, language }) => {
  const [availableModels, setAvailableModels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const t = translations[language] || translations.en;

  const titles = { 
    dashboard: t.nav?.dashboard || "Dashboard", 
    files: t.nav?.files || "Files", 
    settings: t.nav?.settings || "Settings", 
    chat: t.nav?.chat || "Assistant" 
  };

  // =========================
  // FETCH MODELS
  // =========================
  const fetchModels = async () => {
    try {
      const response = await requestWorker("get_models");
      if (!response) return;

      const models = Array.isArray(response)
        ? response
        : response.models || [];

      setAvailableModels(models);

      // 🔥 Si le modèle sélectionné a été supprimé
      if (selectedModel && !models.find(m => m.name === selectedModel)) {
        setSelectedModel(models[0]?.name || null);
      }

      // Modèle par défaut (au premier load)
      if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0].name);
      }
    } catch (e) {
      console.error("[TopBar] get_models error:", e);
    }
  };


  // =========================
  // INIT + EVENT LISTENER (unique)
  // =========================
  useEffect(() => {
    fetchModels();

    const handleModelsUpdate = () => {
      fetchModels();
    };

    window.addEventListener("models-updated", handleModelsUpdate);
    return () => window.removeEventListener("models-updated", handleModelsUpdate);
  }, []);

  // =========================
  // CLOSE DROPDOWN ON OUTSIDE
  // =========================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`h-22 flex items-center justify-between px-10 border-b z-40 backdrop-blur-xl transition-all duration-500 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-black/5 bg-white/20'}`}>
      
      {/* GAUCHE */}
      <div className="flex items-center gap-5">
        <div className="h-8 w-[3px] bg-indigo-600 rounded-full shadow-[0_0_10px_#6366f1]" />
        <h2 className={`text-sm font-black uppercase tracking-[0.4em] italic ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
          {titles[activeTab] || "System"}
        </h2>
      </div>

      {/* DROITE */}
      <div className="flex items-center gap-8">

        {/* THEME */}
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-[18px] border transition-all hover:scale-110 active:scale-95 shadow-lg ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-black/5 border-black/10 text-indigo-600'}`}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* MODEL SELECTOR */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center border rounded-[20px] px-6 py-3 gap-4 transition-all min-w-[240px] justify-between shadow-xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-indigo-400 animate-pulse" />
              <span className={`text-[10px] font-black tracking-widest uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedModel ? selectedModel.split(':')[0] : (t.topbar?.model_select || "SELECT MODEL")}
              </span>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className={`absolute top-full mt-3 w-full border rounded-[25px] overflow-hidden shadow-2xl z-50 backdrop-blur-2xl ${isDarkMode ? 'bg-zinc-900/95 border-white/10' : 'bg-white/95 border-black/10'}`}>
              <div className="py-3 max-h-72 overflow-y-auto custom-scrollbar">
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <div
                      key={m.name}
                      onClick={() => {
                        setSelectedModel(m.name);
                        setIsOpen(false);
                      }}
                      className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedModel === m.name
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                          ? 'hover:bg-white/5 text-white/70'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.name}</span>
                      {selectedModel === m.name && <Check size={14} />}
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-4 text-[9px] font-bold uppercase opacity-40 text-center">
                    {language === 'fr' ? "Aucun modèle trouvé" : "No models found"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* USER */}
        <div className={`flex items-center gap-5 border-l pl-8 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-black italic uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {userName || 'Horizon'}
            </p>
            <p className="text-[9px] text-indigo-400 font-black mt-1 uppercase tracking-widest opacity-80">
              {t.topbar?.root_access || "Admin Access"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-[18px] bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-inner">
            <User size={22} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
