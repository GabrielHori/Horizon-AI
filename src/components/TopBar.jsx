import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, ChevronDown, Check, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import { requestWorker } from '../services/bridge';

/**
 * TopBar - Barre de navigation supérieure
 * 
 * Design: Gris métallique chromé, accents prismatiques
 * Compatible mode jour/nuit
 */
const TopBar = ({ activeTab, selectedModel, setSelectedModel, userName, language, isCompact = false, onToggleSidebar }) => {
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

      // Si le modèle sélectionné a été supprimé
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
  // INIT + EVENT LISTENER
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
    <header className={`${isCompact ? 'h-16 px-4' : 'h-22 px-4 sm:px-6 md:px-10'} flex items-center justify-between border-b z-40 backdrop-blur-xl transition-all duration-500 ${isDarkMode ? 'border-white/5 bg-black/10' : 'border-black/5 bg-white/20'}`}>
      
      {/* GAUCHE */}
      {!isCompact && (
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Bouton Menu Mobile */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="sm:hidden p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Menu size={20} className={isDarkMode ? 'text-white/70' : 'text-gray-600'} />
            </button>
          )}
          {/* Barre prismatique arc-en-ciel */}
          <div 
            className="h-6 sm:h-8 w-[3px] rounded-full hidden sm:block"
            style={{
              background: 'linear-gradient(180deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))',
              boxShadow: '0 0 10px rgba(255,200,100,0.3)',
            }}
          />
          <h2 className={`text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] italic ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>
            {titles[activeTab] || "System"}
          </h2>
        </div>
      )}

      {/* DROITE */}
      <div className={`flex items-center ${isCompact ? 'gap-2 sm:gap-3 w-full justify-end' : 'gap-3 sm:gap-6 md:gap-8'}`}>

        {/* THEME TOGGLE - Gris métallique */}
        <button
          onClick={toggleTheme}
          className="p-2.5 sm:p-3 rounded-[18px] border transition-all hover:scale-110 active:scale-95 shadow-lg flex-shrink-0"
          style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
              : 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isDarkMode 
              ? '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {isDarkMode 
            ? <Sun size={18} className="sm:w-5 sm:h-5 text-yellow-400" /> 
            : <Moon size={18} className="sm:w-5 sm:h-5 text-gray-600" />
          }
        </button>

        {/* MODEL SELECTOR - Gris métallique */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center rounded-[20px] ${isCompact ? 'px-3 sm:px-4 py-2 gap-2 min-w-[140px] sm:min-w-[180px]' : 'px-4 sm:px-6 py-2.5 sm:py-3 gap-2 sm:gap-4 min-w-[180px] sm:min-w-[220px] md:min-w-[240px]'} transition-all justify-between`}
            style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
                : 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Sparkles size={14} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:block`} />
              <span className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase truncate max-w-[120px] sm:max-w-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {selectedModel ? selectedModel.split(':')[0] : (t.topbar?.model_select || "SELECT MODEL")}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 flex-shrink-0 ${isDarkMode ? 'text-white/50' : 'text-gray-500'} ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div 
              className="absolute top-full mt-3 w-full rounded-[25px] overflow-hidden shadow-2xl z-50 backdrop-blur-2xl"
              style={{
                background: isDarkMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <div className="py-3 max-h-72 overflow-y-auto custom-scrollbar">
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <div
                      key={m.name}
                      onClick={() => {
                        setSelectedModel(m.name);
                        setIsOpen(false);
                      }}
                      className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors`}
                      style={selectedModel === m.name ? {
                        background: isDarkMode 
                          ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                          : 'linear-gradient(135deg, #e5e5e5 0%, #d5d5d5 100%)',
                        color: isDarkMode ? 'white' : '#1a1a1a',
                      } : {
                        color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4a4a4a',
                      }}
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

        {/* USER - Gris métallique (masqué en mode compact) */}
        {!isCompact && (
          <div className={`flex items-center gap-3 sm:gap-5 border-l pl-4 sm:pl-6 md:pl-8 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
            <div className="text-right hidden lg:block">
              <p className={`text-xs font-black italic uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {userName || 'Horizon'}
              </p>
              <p className={`text-[9px] font-black mt-1 uppercase tracking-widest opacity-60 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.topbar?.root_access || "Admin Access"}
              </p>
            </div>
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-[18px] flex items-center justify-center shadow-inner flex-shrink-0"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
                  : 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <User size={20} className="sm:w-[22px] sm:h-[22px] text-gray-400 sm:text-gray-500" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
