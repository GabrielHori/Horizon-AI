import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  Download, 
  Loader2, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Box,
  Settings,
  Cpu
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { requestWorker, setupStreamListener } from '../services/bridge';
import { translations } from '../constants/translations';

const Dashboard = ({ 
  systemStats, 
  language = 'en', 
  healthStatus = 'healthy',
  selectedModel,
  setActiveTab,
  setSelectedChatId,
  userName = 'User'
}) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;
  const d = t.dashboard || translations.en.dashboard; // Traductions Dashboard
  
  // Mini Chat State
  const [quickInput, setQuickInput] = useState('');
  const [quickResponse, setQuickResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const responseRef = useRef(null);
  
  // Model Download State
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [pullProgress, setPullProgress] = useState(null);

  // Suggestions de prompts rapides (utilisant les traductions)
  const quickPrompts = [
    { icon: '💡', text: d.prompts?.explain || "Explain a concept" },
    { icon: '📝', text: d.prompts?.write || "Write about..." },
    { icon: '🔧', text: d.prompts?.code || "Help me code" },
    { icon: '🎯', text: d.prompts?.summarize || "Summarize this" },
  ];

  // Modèles populaires (utilisant les traductions)
  const popularModels = [
    { name: "llama3.2:3b", desc: d.modelFastLight, size: "2GB", speed: "⚡⚡⚡" },
    { name: "mistral", desc: d.modelBalanced, size: "4GB", speed: "⚡⚡" },
    { name: "deepseek-r1:7b", desc: d.modelReasoning, size: "4GB", speed: "⚡⚡" },
  ];

  // Écouter les événements de streaming
  useEffect(() => {
    let unlisten = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await setupStreamListener((payload) => {
        if (!isMounted) return;
        
        // Événements de chat (mini-chat)
        if (payload.event === "token" && payload.data !== undefined && isThinking) {
          setQuickResponse(prev => prev + payload.data);
        }
        
        if (payload.event === "done" && payload.chat_id && isThinking) {
          setIsThinking(false);
        }
        
        // Événements de pull
        if (payload.model) {
          if (payload.event === "progress") {
            setPullProgress(payload.progress || payload.message);
          }
          if (payload.event === "done") {
            setDownloadingModel(null);
            setPullProgress(null);
            window.dispatchEvent(new Event("models-updated"));
          }
          if (payload.event === "error" && !payload.chat_id) {
            setDownloadingModel(null);
            setPullProgress(null);
          }
        }
      });
    };

    setupListener();
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [isThinking]);

  // Quick Chat - Envoyer un message rapide
  const handleQuickChat = async (prompt) => {
    const messageToSend = prompt || quickInput;
    if (!messageToSend.trim() || isThinking) return;

    // Si pas de modèle sélectionné, afficher un message d'aide
    if (!selectedModel) {
      setQuickResponse(language === 'fr' 
        ? "⚠️ Veuillez d'abord sélectionner un modèle dans le menu déroulant en haut de l'écran (SELECT MODEL).\n\nSi aucun modèle n'apparaît, installez-en un en cliquant sur 'Install' ci-dessous." 
        : "⚠️ Please select a model from the dropdown menu at the top (SELECT MODEL).\n\nIf no models appear, install one by clicking 'Install' below.");
      return;
    }

    setQuickResponse('');
    setIsThinking(true);
    setQuickInput('');

    try {
      const result = await requestWorker("chat", {
        model: selectedModel,
        prompt: messageToSend,
        chat_id: null,
        language: language
      });
      
      // Si pas de réponse après 2 secondes, vérifier Ollama
      setTimeout(() => {
        if (isThinking && !quickResponse) {
          // Le streaming devrait avoir commencé
        }
      }, 2000);
      
    } catch (e) {
      console.error("Chat error:", e);
      setQuickResponse(language === 'fr' 
        ? "❌ Erreur de connexion. Vérifiez que :\n• Ollama est bien lancé\n• Le modèle est correctement installé\n\nLancez Ollama avec : ollama serve" 
        : "❌ Connection error. Please check:\n• Ollama is running\n• Model is properly installed\n\nStart Ollama with: ollama serve");
      setIsThinking(false);
    }
  };

  // Télécharger un modèle
  const pullModel = async (modelName) => {
    if (!modelName || downloadingModel) return;
    setDownloadingModel(modelName);
    setPullProgress("Starting...");
    
    try {
      await requestWorker("pull", { model: modelName });
    } catch (error) {
      setDownloadingModel(null);
      setPullProgress(null);
    }
  };

  // Aller vers le chat complet
  const goToFullChat = () => {
    setActiveTab('chat');
  };

  // Heure actuelle formatée
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'fr' ? 'Bonjour' : 'Good morning';
    if (hour < 18) return language === 'fr' ? 'Bon après-midi' : 'Good afternoon';
    return language === 'fr' ? 'Bonsoir' : 'Good evening';
  };

  return (
    <div className="relative w-full h-full overflow-y-auto bg-transparent p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* === WELCOME HEADER === */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles size={14} />
            {healthStatus === 'healthy' 
              ? (language === 'fr' ? 'Système Prêt' : 'System Ready')
              : (language === 'fr' ? 'Connexion...' : 'Connecting...')}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
            {getGreeting()}, <span className="text-indigo-500">{userName}</span>
          </h1>
          
          <p className={`text-lg ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
            {language === 'fr' 
              ? "Comment puis-je vous aider aujourd'hui ?" 
              : "How can I help you today?"}
          </p>
        </div>

        {/* === MINI CHAT BOX === */}
        <div className={`p-6 rounded-[32px] border backdrop-blur-xl transition-all
          ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-xl'}
        `}>
          {/* Zone de réponse */}
          {(quickResponse || isThinking) && (
            <div 
              ref={responseRef}
              className={`mb-6 p-5 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar
                ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}
              `}
            >
              {isThinking && !quickResponse && (
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  <span className="text-sm opacity-60">
                    {language === 'fr' ? 'Réflexion en cours...' : 'Thinking...'}
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{quickResponse}</p>
              
              {/* Bouton pour continuer dans le chat complet */}
              {quickResponse && !isThinking && (
                <button
                  onClick={goToFullChat}
                  className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                >
                  <MessageSquare size={14} />
                  {language === 'fr' ? 'Continuer la conversation' : 'Continue conversation'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickChat()}
                placeholder={selectedModel 
                  ? (language === 'fr' ? "Posez votre question..." : "Ask anything...")
                  : (language === 'fr' ? "Sélectionnez un modèle d'abord ↗" : "Select a model first ↗")}
                disabled={!selectedModel || isThinking}
                className={`w-full px-6 py-4 rounded-2xl text-sm font-medium outline-none transition-all
                  ${isDarkMode 
                    ? 'bg-white/5 border border-white/10 focus:border-indigo-500/50' 
                    : 'bg-slate-100 border border-slate-200 focus:border-indigo-500'}
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              />
            </div>
            
            <button
              onClick={() => handleQuickChat()}
              disabled={!quickInput.trim() || !selectedModel || isThinking}
              className="p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isThinking ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 mt-4">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuickInput(prompt.text);
                }}
                disabled={!selectedModel}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all
                  ${isDarkMode 
                    ? 'bg-white/5 hover:bg-white/10 border border-white/5' 
                    : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'}
                  disabled:opacity-30
                `}
              >
                {prompt.icon} {prompt.text}
              </button>
            ))}
          </div>
        </div>

        {/* === QUICK ACTIONS === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={MessageSquare}
            title={language === 'fr' ? "Chat Complet" : "Full Chat"}
            desc={language === 'fr' ? "Conversations avec historique" : "Conversations with history"}
            onClick={() => setActiveTab('chat')}
            isDarkMode={isDarkMode}
            color="indigo"
          />
          <QuickActionCard
            icon={Box}
            title={language === 'fr' ? "Mes Modèles" : "My Models"}
            desc={language === 'fr' ? "Gérer les modèles installés" : "Manage installed models"}
            onClick={() => setActiveTab('files')}
            isDarkMode={isDarkMode}
            color="emerald"
          />
          <QuickActionCard
            icon={Settings}
            title={language === 'fr' ? "Paramètres" : "Settings"}
            desc={language === 'fr' ? "Configurer l'application" : "Configure the app"}
            onClick={() => setActiveTab('settings')}
            isDarkMode={isDarkMode}
            color="purple"
          />
        </div>

        {/* === POPULAR MODELS === */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest opacity-40">
              {language === 'fr' ? "Modèles Recommandés" : "Recommended Models"}
            </h2>
            <span className="text-xs opacity-30">
              {language === 'fr' ? "Cliquez pour installer" : "Click to install"}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularModels.map((model, i) => (
              <ModelCard
                key={i}
                model={model}
                isDownloading={downloadingModel === model.name}
                progress={downloadingModel === model.name ? pullProgress : null}
                onDownload={() => pullModel(model.name)}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        </div>

        {/* === STATUS BAR === */}
        <div className={`flex items-center justify-between p-4 rounded-2xl
          ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}
        `}>
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <span className="text-xs font-medium opacity-60">
              {selectedModel 
                ? `${language === 'fr' ? 'Modèle actif:' : 'Active model:'} ${selectedModel}`
                : (language === 'fr' ? 'Aucun modèle sélectionné' : 'No model selected')}
            </span>
          </div>
          <div className="text-xs opacity-40">
            Horizon AI v1.0
          </div>
        </div>
      </div>
    </div>
  );
};

/* === COMPOSANTS INTERNES === */

const QuickActionCard = ({ icon: Icon, title, desc, onClick, isDarkMode, color }) => (
  <button
    onClick={onClick}
    className={`p-6 rounded-[24px] border text-left transition-all group hover:scale-[1.02] active:scale-[0.98]
      ${isDarkMode 
        ? 'bg-black/30 border-white/10 hover:border-white/20' 
        : 'bg-white border-slate-200 shadow-lg hover:shadow-xl'}
    `}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110
      ${color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' : 
        color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 
        'bg-purple-500/10 text-purple-500'}
    `}>
      <Icon size={24} />
    </div>
    <h3 className="font-bold mb-1">{title}</h3>
    <p className="text-xs opacity-50">{desc}</p>
  </button>
);

const ModelCard = ({ model, isDownloading, progress, onDownload, isDarkMode }) => (
  <div className={`p-5 rounded-[24px] border transition-all
    ${isDarkMode 
      ? 'bg-black/30 border-white/10' 
      : 'bg-white border-slate-200 shadow-md'}
  `}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-bold text-sm">{model.name}</h3>
        <p className="text-xs opacity-50 mt-1">{model.desc}</p>
      </div>
      <span className="text-xs opacity-40">{model.size}</span>
    </div>
    
    <div className="flex items-center justify-between">
      <span className="text-xs opacity-40">{model.speed}</span>
      
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition-all"
      >
        {isDownloading ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            {typeof progress === 'number' ? `${progress}%` : '...'}
          </>
        ) : (
          <>
            <Download size={12} />
            Install
          </>
        )}
      </button>
    </div>
    
    {isDownloading && typeof progress === 'number' && (
      <div className="mt-3 w-full h-1 rounded-full bg-white/10 overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    )}
  </div>
);

export default Dashboard;
