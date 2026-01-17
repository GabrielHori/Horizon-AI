import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Search, Database, Download, HardDrive } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { requestWorker, setupStreamListener } from '../services/bridge';
import { MODEL_LIBRARY } from '../constants/model_library';

const ModelLibrary = ({ language = 'fr', systemStats, setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const [installedModels, setInstalledModels] = useState([]);
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [showVramModal, setShowVramModal] = useState(false);
  const [pendingModel, setPendingModel] = useState(null);

  const vramTotalMb = Number(systemStats?.vramTotal ?? systemStats?.gpu?.vram_total ?? 0);
  const vramTotalGb = vramTotalMb > 0 ? vramTotalMb / 1024 : 0;
  const hasVramInfo = vramTotalGb > 0;

  const fetchInstalledModels = useCallback(async () => {
    try {
      const response = await requestWorker('get_models');
      const models = Array.isArray(response)
        ? response
        : response?.models || [];
      setInstalledModels(models);
    } catch (err) {
      console.error('[ModelLibrary] get_models error:', err);
    }
  }, []);

  useEffect(() => {
    fetchInstalledModels();

    const handleModelsUpdate = () => {
      fetchInstalledModels();
    };

    window.addEventListener('models-updated', handleModelsUpdate);
    return () => window.removeEventListener('models-updated', handleModelsUpdate);
  }, [fetchInstalledModels]);

  useEffect(() => {
    let unlisten = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await setupStreamListener((payload) => {
        if (!isMounted || !payload?.model) return;

        if (payload.event === 'progress' && payload.model === downloadingModel) {
          setDownloadProgress(payload.progress || 0);
        }
        if (payload.event === 'done') {
          if (payload.model === downloadingModel) {
            setDownloadingModel(null);
            setDownloadProgress(0);
          }
          fetchInstalledModels();
        }
        if (payload.event === 'error' && payload.model === downloadingModel) {
          setDownloadingModel(null);
          setDownloadProgress(0);
        }
      });
    };

    setupListener();
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [downloadingModel, fetchInstalledModels]);

  const isModelInstalled = useCallback((libraryName) => {
    if (!libraryName) return false;
    const [base, tag] = libraryName.split(':');
    return installedModels.some((model) => {
      if (!model?.name) return false;
      if (model.name === libraryName) return true;
      const [modelBase, modelTag] = model.name.split(':');
      if (modelBase !== base) return false;
      if (!tag) return true;
      return modelTag === tag;
    });
  }, [installedModels]);

  const handleDownload = async (modelName) => {
    if (!modelName || downloadingModel) return;
    setDownloadingModel(modelName);
    setDownloadProgress(0);
    try {
      await requestWorker('pull', { model: modelName });
    } catch (error) {
      setDownloadingModel(null);
      setDownloadProgress(0);
    }
  };

  const handleDownloadRequest = (modelName, requiredVram, vramOk) => {
    if (!modelName || downloadingModel) return;
    if (hasVramInfo && vramOk === false) {
      setPendingModel({
        name: modelName,
        requiredVram,
        availableVram: vramTotalGb.toFixed(1)
      });
      setShowVramModal(true);
      return;
    }
    handleDownload(modelName);
  };

  const filteredModels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return MODEL_LIBRARY;
    return MODEL_LIBRARY.filter((model) => {
      const desc = model.desc?.[language] || '';
      const descAlt = model.desc?.en || '';
      const tags = (model.tags || []).join(' ');
      const haystack = `${model.name} ${desc} ${descAlt} ${tags}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [searchTerm, language]);

  return (
    <div className={`p-6 sm:p-8 lg:p-10 w-full h-full overflow-y-auto custom-scrollbar ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {showVramModal && pendingModel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className={`p-6 w-full max-w-md rounded-[28px] border ${isDarkMode ? 'bg-[#0A0A0A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600'}`}>
                <Database size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">
                  {language === 'fr' ? 'VRAM insuffisante' : 'Not enough VRAM'}
                </p>
                <p className="text-[10px] opacity-60 uppercase tracking-widest">
                  {pendingModel.name}
                </p>
              </div>
            </div>
            <p className="text-sm opacity-70 mb-6">
              {language === 'fr'
                ? `Ce modele demande environ ${pendingModel.requiredVram} GB de VRAM, mais votre systeme a ${pendingModel.availableVram} GB.`
                : `This model needs about ${pendingModel.requiredVram} GB of VRAM, but your system has ${pendingModel.availableVram} GB.`}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowVramModal(false);
                  setPendingModel(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const name = pendingModel?.name;
                  setShowVramModal(false);
                  setPendingModel(null);
                  if (name) handleDownload(name);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-400"
              >
                {language === 'fr' ? 'Continuer' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-1 w-12 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))'
                }}
              />
              <span className={`font-black text-[10px] uppercase tracking-[0.4em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {language === 'fr' ? 'BIBLIOTHEQUE' : 'LIBRARY'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
              {language === 'fr' ? 'Modeles disponibles' : 'Available models'}
            </h1>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
              {language === 'fr'
                ? 'Choisissez un modele a telecharger depuis Ollama.'
                : 'Pick a model to download from Ollama.'}
            </p>
            <div className={`text-[10px] font-black uppercase tracking-widest mt-3 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
              {hasVramInfo
                ? `${language === 'fr' ? 'VRAM detectee' : 'Detected VRAM'}: ${vramTotalGb.toFixed(1)} GB`
                : (language === 'fr' ? 'VRAM inconnue' : 'VRAM unknown')}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('models')}
                className={`px-4 py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <HardDrive size={14} />
                {language === 'fr' ? 'Modeles installes' : 'Installed models'}
              </button>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <Search size={16} className="opacity-50" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={language === 'fr' ? 'Rechercher (polyvalent, code...)' : 'Search (general, code...)'}
                  className="bg-transparent outline-none text-sm font-medium w-56"
                />
              </div>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <input
                  value={customModelName}
                  onChange={(event) => setCustomModelName(event.target.value)}
                  placeholder={language === 'fr' ? 'Ex: qwen2.5:7b' : 'e.g. qwen2.5:7b'}
                  className="bg-transparent outline-none text-sm font-medium w-48"
                />
                <button
                  onClick={() => handleDownload(customModelName.trim())}
                  disabled={!customModelName.trim() || Boolean(downloadingModel)}
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    isDarkMode
                      ? 'bg-white/10 text-white/70 hover:bg-white/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } ${downloadingModel ? 'opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <Download size={12} />
                    {language === 'fr' ? 'Pull' : 'Pull'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {downloadingModel && (
          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
              <span>
                {language === 'fr' ? 'Telechargement' : 'Downloading'}: {downloadingModel}
              </span>
              <span className="font-mono">{downloadProgress}%</span>
            </div>
            <div className={`h-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div
                className="h-1 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const isInstalled = isModelInstalled(model.name);
            const isDownloading = downloadingModel === model.name;
            const description = model.desc?.[language] || model.desc?.en || '';
            const tags = model.tags || [];
            const requiredVram = Number.parseFloat(model.vram);
            const vramOk = !hasVramInfo
              ? null
              : (!Number.isFinite(requiredVram) || requiredVram <= vramTotalGb);
            const vramBadge = !hasVramInfo
              ? (language === 'fr' ? 'VRAM inconnue' : 'VRAM unknown')
              : (vramOk ? (language === 'fr' ? 'Compatible' : 'Compatible') : (language === 'fr' ? 'VRAM insuffisante' : 'VRAM too low'));
            const vramBadgeTone = !hasVramInfo ? 'neutral' : (vramOk ? 'good' : 'bad');
            const disableDownload = isInstalled || (downloadingModel && !isDownloading);
            return (
              <div
                key={model.name}
                className={`p-5 rounded-[24px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
                        <Database size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase truncate">{model.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest opacity-50">
                          <span>VRAM {model.vram}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                            vramBadgeTone === 'good'
                              ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-600')
                              : vramBadgeTone === 'bad'
                                ? (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600')
                                : (isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500')
                          }`}>
                            {vramBadge}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] opacity-60 leading-snug">{description}</p>
                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={`${model.name}-${tag}`}
                            className={`text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadRequest(model.name, requiredVram, vramOk)}
                    disabled={disableDownload}
                    title={hasVramInfo && !vramOk
                      ? (language === 'fr' ? 'VRAM insuffisante (confirmation requise)' : 'VRAM too low (confirmation required)')
                      : undefined}
                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      isInstalled
                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-600')
                        : (isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    } ${isDownloading || (hasVramInfo && !vramOk) ? 'opacity-60' : ''}`}
                  >
                    {isInstalled
                      ? (language === 'fr' ? 'Installe' : 'Installed')
                      : (isDownloading
                        ? (language === 'fr' ? 'Telechargement' : 'Downloading')
                        : (language === 'fr' ? 'Telecharger' : 'Download'))}
                  </button>
                </div>

                {isInstalled && (
                  <div className="mt-3 flex items-center gap-2 text-[9px] font-bold uppercase opacity-60">
                    <CheckCircle size={12} className="text-emerald-400" />
                    {language === 'fr' ? 'Deja installe' : 'Already installed'}
                  </div>
                )}

                {isDownloading && (
                  <div className="mt-3">
                    <div className={`flex items-center justify-between text-[10px] mb-1 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                      <span>{language === 'fr' ? 'Progression' : 'Progress'}</span>
                      <span className="font-mono">{downloadProgress}%</span>
                    </div>
                    <div className={`h-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredModels.length === 0 && (
          <div className={`p-10 rounded-[24px] border text-center ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <p className="text-sm opacity-60">
              {language === 'fr' ? 'Aucun modele ne correspond a votre recherche.' : 'No models match your search.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelLibrary;
