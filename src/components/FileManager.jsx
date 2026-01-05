import React, { useState, useEffect } from 'react';
import {
  Trash2, RefreshCw, Database, ShieldCheck, Box,
  Search, Loader2, AlertTriangle, HardDrive, CheckCircle,
  Download, Cpu, MemoryStick, Sparkles
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { requestWorker, setupStreamListener } from '../services/bridge';
import { translations } from '../constants/translations';

const FileManager = ({ language = 'fr' }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.files || translations.en.files;

  const [installedModels, setInstalledModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [modelToConfirm, setModelToConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  
  // Download state
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [customModelName, setCustomModelName] = useState('');

  // =========================
  // FETCH MODELS
  // =========================
  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const response = await requestWorker("get_models");

      const models = Array.isArray(response)
        ? response
        : response?.models || [];

      const formatted = models.map(m => ({
        ...m,
        size_gb: m.size
          ? (m.size / (1024 ** 3)).toFixed(2)
          : m.size_gb || '0.00'
      }));

      setInstalledModels(formatted);
    } catch (err) {
      console.error("[FileManager] get_models error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    
    const handleModelsUpdate = () => {
      fetchModels();
    };
    
    window.addEventListener("models-updated", handleModelsUpdate);
    return () => window.removeEventListener("models-updated", handleModelsUpdate);
  }, []);

  // Listen to download events
  useEffect(() => {
    let unlisten = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await setupStreamListener((payload) => {
        if (!isMounted) return;
        
        if (payload.model) {
          if (payload.event === "progress") {
            setDownloadProgress(payload.progress || 0);
          }
          if (payload.event === "done") {
            setDownloadingModel(null);
            setDownloadProgress(0);
            setCustomModelName('');
            fetchModels();
          }
          if (payload.event === "error" && !payload.chat_id) {
            setDownloadingModel(null);
            setDownloadProgress(0);
          }
        }
      });
    };

    setupListener();
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  // =========================
  // DELETE MODEL
  // =========================
  const confirmDelete = async () => {
    if (!modelToConfirm) return;

    setIsDeleting(true);
    try {
      await requestWorker("delete_model", { name: modelToConfirm });

      setInstalledModels(prev =>
        prev.filter(m => m.name !== modelToConfirm)
      );

      window.dispatchEvent(new Event("models-updated"));
      setShowConfirm(false);
      setModelToConfirm(null);
    } catch (err) {
      console.error("[FileManager] delete_model error:", err);
      alert(language === 'fr' ? "Impossible de supprimer le modèle." : "Unable to delete the model.");
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================
  // DOWNLOAD MODEL
  // =========================
  const handleDownload = async (modelName) => {
    if (!modelName || downloadingModel) return;
    setDownloadingModel(modelName);
    setDownloadProgress(0);
    
    try {
      await requestWorker("pull", { model: modelName });
    } catch (error) {
      setDownloadingModel(null);
      setDownloadProgress(0);
    }
  };

  const filteredModels = installedModels.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSize = installedModels
    .reduce((acc, m) => acc + parseFloat(m.size_gb || 0), 0)
    .toFixed(2);

  // Model type detection for icons
  const getModelIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('llama')) return '🦙';
    if (n.includes('mistral')) return '🌬️';
    if (n.includes('deepseek') || n.includes('coder')) return '💻';
    if (n.includes('phi')) return '🔬';
    if (n.includes('qwen')) return '🐉';
    if (n.includes('gemma')) return '💎';
    return '🤖';
  };

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-lg">
          <div className={`p-8 max-w-md w-full rounded-[32px] border ${
            isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/10'
          }`}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black uppercase mb-2">
                {t.delete_confirm_title}
              </h2>
              <p className="text-sm opacity-60 mb-2">
                {t.delete_confirm_desc}
              </p>
              <p className="text-lg font-bold text-indigo-500 mb-6">{modelToConfirm}</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={`py-4 rounded-2xl border font-black uppercase text-xs transition-all hover:scale-[1.02]
                    ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}
                  `}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-xs disabled:opacity-50 hover:bg-red-500 transition-all hover:scale-[1.02]"
                >
                  {isDeleting ? <Loader2 className="animate-spin mx-auto" size={16}/> : t.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
          <span className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.4em]">
            {language === 'fr' ? 'GESTIONNAIRE' : 'MANAGER'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            {language === 'fr' ? 'Mes Modèles' : 'My Models'}
          </h1>
          <div className="flex items-center gap-4">
            {/* Stats Card */}
            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border
              ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}
            `}>
              <div className="flex items-center gap-2">
                <Box size={16} className="text-indigo-500" />
                <span className="text-sm font-bold">{installedModels.length}</span>
                <span className="text-xs opacity-50">{language === 'fr' ? 'modèles' : 'models'}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-emerald-500" />
                <span className="text-sm font-bold">{totalSize}</span>
                <span className="text-xs opacity-50">GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & ACTIONS BAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className={`flex-1 flex items-center gap-4 px-6 py-4 rounded-2xl border
          ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}
        `}>
          <Search size={20} className="opacity-30"/>
          <input
            className="flex-1 bg-transparent outline-none font-medium"
            placeholder={t.filter_placeholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={fetchModels}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} className="opacity-50" />}
          </button>
        </div>

        {/* Add Model Input */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border
          ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}
        `}>
          <input
            type="text"
            value={customModelName}
            onChange={(e) => setCustomModelName(e.target.value)}
            placeholder={language === 'fr' ? "ex: llama3.2:3b" : "e.g. llama3.2:3b"}
            className="bg-transparent outline-none text-sm font-medium w-40"
            disabled={downloadingModel}
          />
          <button
            onClick={() => handleDownload(customModelName)}
            disabled={!customModelName.trim() || downloadingModel}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase hover:bg-indigo-500 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            {downloadingModel === customModelName ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {language === 'fr' ? 'Ajouter' : 'Add'}
          </button>
        </div>
      </div>

      {/* DOWNLOAD PROGRESS */}
      {downloadingModel && (
        <div className={`mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-sm font-bold">
                {language === 'fr' ? 'Téléchargement de' : 'Downloading'} {downloadingModel}...
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-indigo-500">{downloadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* MODELS LIST */}
      {filteredModels.length === 0 && !isLoading ? (
        <div className={`p-16 rounded-[32px] border text-center
          ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}
        `}>
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Database size={40} className="text-indigo-500 opacity-50" />
          </div>
          <h3 className="text-xl font-black uppercase mb-2 opacity-40">
            {t.no_models}
          </h3>
          <p className="text-sm opacity-30 mb-6">
            {language === 'fr' 
              ? "Téléchargez votre premier modèle pour commencer"
              : "Download your first model to get started"}
          </p>
          
          {/* Quick Download Suggestions */}
          <div className="flex flex-wrap justify-center gap-3">
            {['llama3.2:3b', 'mistral', 'deepseek-r1:7b'].map(model => (
              <button
                key={model}
                onClick={() => handleDownload(model)}
                disabled={downloadingModel}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase hover:bg-indigo-500 disabled:opacity-30 transition-all flex items-center gap-2"
              >
                <Download size={12} />
                {model}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map(model => (
            <ModelCard
              key={model.name}
              model={model}
              icon={getModelIcon(model.name)}
              onDelete={() => {
                setModelToConfirm(model.name);
                setShowConfirm(true);
              }}
              isDarkMode={isDarkMode}
              language={language}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =========================
// MODEL CARD COMPONENT
// =========================
const ModelCard = ({ model, icon, onDelete, isDarkMode, language, t }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Extract model info
  const modelBase = model.name.split(':')[0];
  const modelTag = model.name.includes(':') ? model.name.split(':')[1] : 'latest';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-6 rounded-[24px] border transition-all duration-300 group
        ${isDarkMode 
          ? 'bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5' 
          : 'bg-white border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300'}
        ${isHovered ? 'scale-[1.02]' : ''}
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle size={10} />
          <span className="text-[8px] font-black uppercase">{t.ready}</span>
        </div>
      </div>

      {/* Icon & Name */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
          ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'}
        `}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black uppercase truncate">{modelBase}</h3>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
            :{modelTag}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl
          ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}
        `}>
          <HardDrive size={12} className="text-indigo-500" />
          <span className="text-xs font-bold">{model.size_gb} GB</span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className={`w-full py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all
          ${isDarkMode 
            ? 'border-white/10 text-white/50 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10' 
            : 'border-slate-200 text-slate-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50'}
        `}
      >
        <span className="flex items-center justify-center gap-2">
          <Trash2 size={14} />
          {language === 'fr' ? 'Supprimer' : 'Delete'}
        </span>
      </button>
    </div>
  );
};

export default FileManager;
