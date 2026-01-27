import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Sparkles, ChevronDown, Check, Sun, Moon, Menu } from 'lucide-react'; // ✅ SPRINT 1: Cleaned imports
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import { requestWorker } from '../services/bridge';
import { AI_STYLES, DEFAULT_STYLE_ID, resolveModelForStyle, getModelsForStyle } from '../constants/ai_styles';

/**
 * TopBar - Barre de navigation supérieure
 * 
 * Design: Gris métallique chromé, accents prismatiques
 * Compatible mode jour/nuit
 */
const TopBar = ({ activeTab, selectedModel, setSelectedModel, selectedProvider, setSelectedProvider, selectedStyle, setSelectedStyle, userName, language, chatIntent, isCompact = false, onToggleSidebar, modelOverride, setModelOverride }) => {
  const [models, setModels] = useState([]);
  const [airllmStatus, setAirllmStatus] = useState(null);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const styleDropdownRef = useRef(null);
  const modelDropdownRef = useRef(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const t = translations[language] || translations.en;
  const labels = t.labels || translations.en.labels;
  const showSession = activeTab === 'chat' && !isCompact;
  const autoModelValue = '__auto__';
  const airllmReady = airllmStatus?.status === "READY";
  const hasModels = models.length > 0 || airllmReady;
  const intentLabel = chatIntent?.title || (language === 'fr' ? 'Libre' : 'Free');
  const intentDesc = chatIntent?.desc || (language === 'fr' ? 'Mode libre' : 'Free mode');
  const ollamaModels = models.filter((m) => !m?.provider || m.provider === "ollama");
  const airllmModels = models.filter((m) => m?.provider === "airllm");
  const recommendedModel = resolveModelForStyle(ollamaModels, selectedStyle);
  const recommendedModelName = recommendedModel?.name || null;
  const modelDisplayLabel = modelOverride
    ? (selectedModel
      ? `${selectedModel}${selectedProvider === 'airllm' ? ' · AirLLM' : ''}`
      : (language === 'fr' ? 'Aucun modele' : 'No model'))
    : (recommendedModelName || (language === 'fr' ? 'Auto' : 'Auto'));
  const recommendedBadge = language === 'fr' ? 'Recommande' : 'Suggested';


  const getStyleLabel = useCallback((styleId) => {
    if (!styleId) return '';
    return t.styles?.[styleId]?.label || styleId;
  }, [t]);

  const getStyleDescription = useCallback((styleId) => {
    if (!styleId) return '';
    return t.styles?.[styleId]?.desc || '';
  }, [t]);

  const resolveStyleModel = useCallback((styleId, availableModels) => {
    const targetStyle = styleId || DEFAULT_STYLE_ID;
    if (modelOverride) {
      const styleModels = getModelsForStyle(availableModels, targetStyle);
      const stillAvailable = selectedModel && styleModels.some((model) => model?.name === selectedModel);
      if (stillAvailable) {
        return;
      }
      if (setModelOverride) {
        setModelOverride(false);
      }
    }
    const autoPool = (availableModels || []).filter((m) => !m?.provider || m.provider === 'ollama');
    const resolved = resolveModelForStyle(autoPool, targetStyle);

    if (resolved?.name) {
      if (resolved.name !== selectedModel) {
        setSelectedModel(resolved.name);
        setSelectedProvider?.(resolved.provider || 'ollama');
      }
    } else if (availableModels.length === 0 && selectedModel) {
      setSelectedModel(null);
      setSelectedProvider?.('ollama');
    }
  }, [selectedModel, setSelectedModel, modelOverride, setModelOverride, setSelectedProvider]);

  const handleModelChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string'
      ? valueOrEvent
      : valueOrEvent?.target?.value;
    if (!value) return;
    if (value === autoModelValue) {
      if (setModelOverride) {
        setModelOverride(false);
      }
      resolveStyleModel(selectedStyle, models);
      setSelectedProvider?.('ollama');
      setIsModelOpen(false);
      return;
    }
    if (setModelOverride) {
      setModelOverride(true);
    }
    const chosen = models.find((model) => model?.name === value);
    setSelectedProvider?.(chosen?.provider || 'ollama');
    setSelectedModel(value);
    setIsModelOpen(false);
  };

  const modelOptions = useMemo(() => {
    const styled = getModelsForStyle(ollamaModels, selectedStyle);
    let base = styled.length > 0 ? styled : ollamaModels;

    if (recommendedModelName) {
      const recommendedEntry = base.find((model) => model?.name === recommendedModelName);
      if (recommendedEntry) {
        base = [
          recommendedEntry,
          ...base.filter((model) => model?.name !== recommendedModelName)
        ];
      }
    }

    const combined = airllmModels.length ? [...base, ...airllmModels] : base;
    return combined;
  }, [ollamaModels, airllmModels, selectedStyle, recommendedModelName]);

    const titles = {
    dashboard: t.nav?.dashboard || 'Home',
    chat: t.nav?.chat || 'Assistant',
    library: t.nav?.library || 'Library',
    security: t.nav?.security || 'Security',
    advanced: t.nav?.advanced || 'Advanced Center',
    files: t.nav?.files || 'Files',
    memory: t.nav?.memory || 'Memory',
    remote: t.nav?.remote || 'Remote Access',
    models: t.nav?.models || 'Models',
    settings: t.nav?.settings || 'Settings'
  };


  // =========================
  // FETCH MODELS
  // =========================
  const fetchModels = async () => {
    try {
      const [ollamaResponse, airStatus] = await Promise.all([
        requestWorker("get_models"),
        requestWorker("airllm_status").catch(() => null)
      ]);

      const fetchedModels = Array.isArray(ollamaResponse)
        ? ollamaResponse
        : (ollamaResponse?.models || []);

      const normalized = fetchedModels.map((m) => ({
        ...m,
        provider: m.provider || "ollama"
      }));

      const combined = [...normalized];

      if (airStatus && typeof airStatus === 'object' && airStatus.status) {
        setAirllmStatus(airStatus);
        if (airStatus.status === "READY" && airStatus.model) {
          combined.push({
            name: airStatus.model,
            provider: "airllm",
            status: airStatus.status
          });
        }
      }

      setModels(combined);
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

    const handleAirllmUpdate = () => {
      fetchModels();
    };

    window.addEventListener("models-updated", handleModelsUpdate);
    window.addEventListener("airllm-updated", handleAirllmUpdate);
    return () => {
      window.removeEventListener("models-updated", handleModelsUpdate);
      window.removeEventListener("airllm-updated", handleAirllmUpdate);
    };
  }, []);

  useEffect(() => {
    if (!selectedStyle) {
      setSelectedStyle(DEFAULT_STYLE_ID);
      return;
    }
    resolveStyleModel(selectedStyle, models);
  }, [models, selectedStyle, resolveStyleModel, setSelectedStyle]);

  // =========================
  // CLOSE DROPDOWN ON OUTSIDE
  // =========================
  useEffect(() => {
    const handleClickOutside = (e) => {
      const styleHit = styleDropdownRef.current && styleDropdownRef.current.contains(e.target);
      const modelHit = modelDropdownRef.current && modelDropdownRef.current.contains(e.target);
      if (!styleHit) {
        setIsStyleOpen(false);
      }
      if (!modelHit) {
        setIsModelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const styleButtonClass = isCompact
    ? 'px-3 sm:px-4 py-2 gap-2 min-w-[140px] sm:min-w-[180px]'
    : showSession
      ? 'px-3 sm:px-4 py-2 gap-2 min-w-[150px] sm:min-w-[180px]'
      : 'px-4 sm:px-6 py-2.5 sm:py-3 gap-2 sm:gap-4 min-w-[180px] sm:min-w-[220px] md:min-w-[240px]';

  const styleSelector = (
    <div className="relative" ref={styleDropdownRef}>
      <button
        onClick={() => setIsStyleOpen((prev) => {
          const next = !prev;
          if (next) {
            setIsModelOpen(false);
          }
          return next;
        })}
        data-onboarding="style-picker"
        className={`flex items-center rounded-[20px] ${styleButtonClass} transition-all justify-between`}
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
            {getStyleLabel(selectedStyle) || (t.topbar?.style_select || 'STYLE')}
          </span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 flex-shrink-0 ${isDarkMode ? 'text-white/50' : 'text-gray-500'} ${isStyleOpen ? 'rotate-180' : ''}`} />
      </button>

      {isStyleOpen && (
        <div
          className="absolute top-full mt-3 w-full rounded-[25px] overflow-hidden shadow-2xl z-50 backdrop-blur-2xl"
          style={{
            background: isDarkMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <div className="py-3 max-h-72 overflow-y-auto custom-scrollbar">
            {AI_STYLES.map((style) => {
              const label = getStyleLabel(style.id);
              const desc = getStyleDescription(style.id);
              const isActive = selectedStyle === style.id;

              return (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    if (setModelOverride) {
                      setModelOverride(false);
                    }
                    setIsStyleOpen(false);
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between transition-colors"
                  style={isActive ? {
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #e5e5e5 0%, #d5d5d5 100%)',
                    color: isDarkMode ? 'white' : '#1a1a1a',
                  } : {
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4a4a4a',
                  }}
                >
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest block">{label}</span>
                    {desc && (
                      <span className="text-[9px] opacity-50 block mt-1">{desc}</span>
                    )}
                  </div>
                  {isActive && <Check size={14} />}
                </button>
              );
            })}
            {models.length === 0 && (
              <div className="px-6 py-3 text-[9px] font-bold uppercase opacity-40 text-center">
                {t.topbar?.style_unavailable || (language === 'fr' ? 'Aucun style disponible' : 'No styles available')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const modelSelector = (
    <div className="relative" ref={modelDropdownRef}>
      <button
        onClick={() => setIsModelOpen((prev) => {
          const next = !prev;
          if (next) {
            setIsStyleOpen(false);
          }
          return next;
        })}
        disabled={!hasModels}
        className={`flex items-center rounded-[18px] px-3 py-2 gap-2 min-w-[170px] sm:min-w-[200px] justify-between transition-all ${!hasModels ? 'opacity-60 cursor-not-allowed' : ''}`}
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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {modelDisplayLabel}
          </span>
          {!modelOverride && recommendedModelName && (
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-black/10 text-gray-600'}`}>
              Auto
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 flex-shrink-0 ${isDarkMode ? 'text-white/50' : 'text-gray-500'} ${isModelOpen ? 'rotate-180' : ''}`} />
      </button>

      {isModelOpen && (
        <div
          className="absolute top-full mt-3 w-full rounded-[22px] overflow-hidden shadow-2xl z-50 backdrop-blur-2xl"
          style={{
            background: isDarkMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <div className="py-3 max-h-72 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => handleModelChange(autoModelValue)}
              className="w-full px-5 py-3 flex items-center justify-between transition-colors"
              style={!modelOverride ? {
                background: isDarkMode
                  ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                  : 'linear-gradient(135deg, #e5e5e5 0%, #d5d5d5 100%)',
                color: isDarkMode ? 'white' : '#1a1a1a',
              } : {
                color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4a4a4a',
              }}
            >
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest block">
                  {language === 'fr' ? 'Auto (recommande)' : 'Auto (recommended)'}
                </span>
                {recommendedModelName && (
                  <span className="text-[9px] opacity-50 block mt-1">
                    {recommendedModelName}
                  </span>
                )}
              </div>
              {!modelOverride && <Check size={14} />}
            </button>

            {modelOptions.length === 0 && (
              <div className="px-6 py-3 text-[9px] font-bold uppercase opacity-40 text-center">
                {language === 'fr' ? 'Aucun modele disponible' : 'No models available'}
              </div>
            )}

            {modelOptions.map((model) => {
              const isActive = modelOverride && selectedModel === model.name;
              const isSuggested = recommendedModelName && model.name === recommendedModelName;

              return (
                <button
                  key={model.name}
                  onClick={() => handleModelChange(model.name)}
                  className="w-full px-5 py-3 flex items-center justify-between transition-colors"
                  style={isActive ? {
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #e5e5e5 0%, #d5d5d5 100%)',
                    color: isDarkMode ? 'white' : '#1a1a1a',
                  } : {
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4a4a4a',
                  }}
                >
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest block">
                      {model.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {model.provider === 'airllm' && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-700'}`}>
                          AirLLM
                        </span>
                      )}
                      {isSuggested && (
                        <span className="text-[9px] opacity-50 block">{recommendedBadge}</span>
                      )}
                    </div>
                  </div>
                  {isActive && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
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

          {showSession ? (
            <div
              className="flex items-center gap-3 rounded-[22px] border px-4 py-2 shadow-lg backdrop-blur-xl"
              style={{
                background: isDarkMode ? 'rgba(10,10,10,0.65)' : 'rgba(255,255,255,0.55)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex flex-col min-w-[140px]">
                <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                  Session
                </span>
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {intentLabel}
                </span>
                <span className={`text-[9px] opacity-50 leading-snug ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  {intentDesc}
                </span>
              </div>

              <div className={`h-10 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />

              <div className="flex flex-col gap-2 min-w-[160px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                  {labels?.style || 'Style'}
                </span>
                {styleSelector}
              </div>

              <div className={`h-10 w-px ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} />

              <div className="flex flex-col gap-2 min-w-[200px]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                  {labels?.model || 'Model'}
                </span>
                {modelSelector}
              </div>
            </div>
          ) : (
            styleSelector
          )}

          {/* THEME TOGGLE - Gris metallique */}
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

    </>
  );
};

export default TopBar;
