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
  const [airllmStatus, setAirllmStatus] = useState({ status: 'OFF' });
  const [airllmModels, setAirllmModels] = useState([]);
  const [airllmBusy, setAirllmBusy] = useState(false);
  const [airllmError, setAirllmError] = useState(null);
  const [selectedAirModel, setSelectedAirModel] = useState('');

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

  const loadAirllmState = useCallback(async () => {
    try {
      const [statusRes, listRes] = await Promise.all([
        requestWorker('airllm_status'),
        requestWorker('airllm_list_models'),
      ]);
      if (statusRes && statusRes.status) setAirllmStatus(statusRes);
      const curated = Array.isArray(listRes?.models) ? listRes.models : [];
      setAirllmModels(curated);
      if (!selectedAirModel && (statusRes?.model || curated[0]?.id)) {
        setSelectedAirModel(statusRes?.model || curated[0]?.id);
      }
    } catch (err) {
      setAirllmError(err?.message || 'AirLLM unavailable');
    }
  }, [selectedAirModel]);

  const handleAirllmEnable = async () => {
    const model = selectedAirModel || airllmModels[0]?.id;
    if (!model) {
      setAirllmError(language === 'fr' ? 'Choisissez un modèle AirLLM.' : 'Select an AirLLM model.');
      return;
    }
    setAirllmBusy(true);
    setAirllmError(null);
    try {
      setAirllmStatus((prev) => ({ ...(prev || {}), status: 'LOADING', model }));
      await requestWorker('airllm_enable', { model });
      window.dispatchEvent(new Event('airllm-updated'));
      await loadAirllmState();
    } catch (err) {
      setAirllmError(err?.message || 'AirLLM enable failed');
    } finally {
      setAirllmBusy(false);
    }
  };

  const handleAirllmReload = async () => {
    const model = selectedAirModel || airllmModels[0]?.id;
    if (!model) return;
    setAirllmBusy(true);
    setAirllmError(null);
    try {
      setAirllmStatus((prev) => ({ ...(prev || {}), status: 'LOADING', model }));
      await requestWorker('airllm_reload', { model });
      window.dispatchEvent(new Event('airllm-updated'));
      await loadAirllmState();
    } catch (err) {
      setAirllmError(err?.message || 'AirLLM reload failed');
    } finally {
      setAirllmBusy(false);
    }
  };

  const handleAirllmStop = async () => {
    setAirllmBusy(true);
    setAirllmError(null);
    try {
      await requestWorker('airllm_disable');
      window.dispatchEvent(new Event('airllm-updated'));
      await loadAirllmState();
    } catch (err) {
      setAirllmError(err?.message || 'AirLLM stop failed');
    } finally {
      setAirllmBusy(false);
    }
  };

  useEffect(() => {
    fetchInstalledModels();

    const handleModelsUpdate = () => {
      fetchInstalledModels();
    };

    const handleAirUpdate = () => {
      loadAirllmState();
    };

    window.addEventListener('models-updated', handleModelsUpdate);
    window.addEventListener('airllm-updated', handleAirUpdate);
    return () => {
      window.removeEventListener('models-updated', handleModelsUpdate);
      window.removeEventListener('airllm-updated', handleAirUpdate);
    };
  }, [fetchInstalledModels, loadAirllmState]);

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

  useEffect(() => {
    loadAirllmState();
    const poll = setInterval(loadAirllmState, 6000);
    return () => clearInterval(poll);
  }, [loadAirllmState]);

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

  const airStatusCode = (airllmStatus?.status || 'OFF').toUpperCase();
  const airStatusClasses = {
    OFF: isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-700',
    LOADING: 'bg-amber-500/15 text-amber-600 border border-amber-200/70',
    READY: 'bg-emerald-500/15 text-emerald-500 border border-emerald-200/70',
    ERROR: 'bg-red-500/15 text-red-500 border border-red-200/70'
  };

  const isAirCompatible = useCallback((modelName) => {
    if (!modelName || !airllmModels?.length) return false;
    const base = modelName.split(':')[0].toLowerCase();
    return airllmModels.some((m) => (m.id || '').toLowerCase().includes(base));
  }, [airllmModels]);

  return (
    <div className={`p-6 sm:p-8 lg:p-10 w-full h-full overflow-y-auto custom-scrollbar ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* AirLLM control (moved to model library for visibility) */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className={`rounded-[26px] border overflow-hidden backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.35)] ${isDarkMode
          ? 'border-white/8 bg-gradient-to-br from-[#0c0f16] via-[#0e1220] to-[#0b0e18]'
          : 'border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-5">
            <div className="space-y-2">
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>AirLLM</p>
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                {language === 'fr' ? 'Modèles HF locaux' : 'Local HF models'}
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${airStatusClasses[airStatusCode]}`}>
                  {airStatusCode}
                </span>
              </h3>
              <p className={`${isDarkMode ? 'text-white/60' : 'text-slate-600'} text-sm max-w-xl`}>
                {language === 'fr'
                  ? 'Charge un modèle HuggingFace via AirLLM (sidecar unique). Recharger pour changer de modèle.'
                  : 'Load a HuggingFace model through AirLLM (single sidecar). Reload to switch model.'}
              </p>
              {airllmError && (
                <div className="text-xs px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 inline-block">
                  {airllmError}
                </div>
              )}
            </div>
            <div className="w-full lg:w-[420px] flex flex-col gap-3">
              <div className="relative">
                <label className={`text-[10px] font-black uppercase tracking-[0.25em] block mb-2 ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                  {language === 'fr' ? 'Modèle AirLLM' : 'AirLLM model'}
                </label>
                <div className={`relative rounded-[18px] px-4 py-2 h-12 flex items-center ${isDarkMode
                  ? 'border border-white/10 bg-gradient-to-r from-[#121722] via-[#0f141e] to-[#0b0f18]'
                  : 'border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white'} shadow-[0_14px_40px_rgba(0,0,0,0.28)]`}>
                  <select
                    value={selectedAirModel || ''}
                    onChange={(e) => setSelectedAirModel(e.target.value)}
                    disabled={airllmBusy}
                    className={`w-full appearance-none bg-transparent outline-none text-sm font-semibold pr-8 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                  >
                    {(airllmModels || []).map((m) => (
                      <option key={m.id} value={m.id}>{m.label || m.id}</option>
                    ))}
                    {(!airllmModels || airllmModels.length === 0) && (
                      <option value="">{language === 'fr' ? 'Aucun modèle' : 'No models'}</option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <div className={`w-2.5 h-2.5 border-b-2 border-r-2 rotate-45 ${isDarkMode ? 'border-white/60' : 'border-slate-500'}`} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleAirllmEnable}
                  disabled={airllmBusy}
                  className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-emerald-500 text-white hover:bg-emerald-400'} shadow-[0_10px_30px_rgba(16,185,129,0.35)] ${airllmBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {airStatusCode === 'READY'
                    ? (language === 'fr' ? 'Actif' : 'Enabled')
                    : (language === 'fr' ? 'Activer' : 'Enable')}
                </button>
                <button
                  onClick={handleAirllmReload}
                  disabled={airllmBusy || !selectedAirModel}
                  className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-indigo-500/20 text-white hover:bg-indigo-500/30' : 'bg-slate-900 text-white hover:bg-slate-800'} shadow-[0_10px_30px_rgba(99,102,241,0.25)] ${airllmBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {language === 'fr' ? 'Charger' : 'Load / Reload'}
                </button>
                <button
                  onClick={handleAirllmStop}
                  disabled={airllmBusy || airStatusCode === 'OFF'}
                  className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/8 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'} ${airllmBusy || airStatusCode === 'OFF' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {language === 'fr' ? 'Stop' : 'Stop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
            const airCompat = isAirCompatible(model.name);
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
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                            airCompat
                              ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-200' : 'bg-cyan-100 text-cyan-700')
                              : (isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500')
                          }`}>
                            {airCompat
                              ? (language === 'fr' ? 'AirLLM OK' : 'AirLLM OK')
                              : (language === 'fr' ? 'AirLLM Non' : 'AirLLM No')}
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
