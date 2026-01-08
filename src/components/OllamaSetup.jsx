import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Loader2, Cpu, CheckCircle, Sparkles } from 'lucide-react';
import { requestWorker, setupStreamListener } from '../services/bridge';

/**
 * OllamaSetup - Écran de premier lancement TRANSPARENT
 * Design: Dark Liquid Metal & Prism
 */
const OllamaSetup = ({ onComplete, language = 'fr' }) => {
  // États du processus global
  const [phase, setPhase] = useState('init'); 
  // Phases: init → checking → installing → starting → pulling → ready → complete
  
  const [progress, setProgress] = useState(0);
  const [subMessage, setSubMessage] = useState('');
  const hasStartedRef = useRef(false);

  // Messages simples pour l'utilisateur
  const messages = {
    init: language === 'fr' ? 'Bienvenue' : 'Welcome',
    checking: language === 'fr' ? 'Vérification du système...' : 'Checking system...',
    installing: language === 'fr' ? 'Préparation de votre assistant IA...' : 'Preparing your AI assistant...',
    starting: language === 'fr' ? 'Démarrage des services...' : 'Starting services...',
    pulling: language === 'fr' ? 'Téléchargement du modèle IA...' : 'Downloading AI model...',
    ready: language === 'fr' ? 'Votre assistant est prêt !' : 'Your assistant is ready!',
    error: language === 'fr' ? 'Configuration requise' : 'Setup required'
  };

  const subMessages = {
    init: language === 'fr' ? 'Préparation de Horizon AI...' : 'Preparing Horizon AI...',
    checking: language === 'fr' ? 'Cette opération ne prend que quelques secondes' : 'This only takes a few seconds',
    installing: language === 'fr' ? 'Installation silencieuse en cours... (2-3 min)' : 'Silent installation in progress... (2-3 min)',
    starting: language === 'fr' ? 'Presque terminé...' : 'Almost done...',
    pulling: language === 'fr' ? 'Premier téléchargement, cela peut prendre quelques minutes' : 'First download, this may take a few minutes',
    ready: language === 'fr' ? 'Tout est configuré automatiquement' : 'Everything is configured automatically'
  };

  // =============================================
  // FLOW AUTOMATIQUE COMPLET
  // =============================================
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    runSetupFlow();
  }, []);

  const runSetupFlow = async () => {
    try {
      setPhase('checking');
      setProgress(10);
      setSubMessage(subMessages.checking);

      const isInstalled = await checkOllamaInstalled();
      
      if (isInstalled) {
        setProgress(30);

        // 🔹 AJOUT CLOUDLFARED
        const cloudflaredInstalled = await installCloudflaredAuto();
        if (cloudflaredInstalled) {
          setProgress(35);
        }

        const isRunning = await checkOllamaRunning();
        
        if (!isRunning) {
          setPhase('starting');
          setSubMessage(subMessages.starting);
          await startOllama();
          setProgress(50);
        } else {
          setProgress(50);
        }

        const hasModel = await checkHasModel();
        
        if (!hasModel) {
          setPhase('pulling');
          setSubMessage(subMessages.pulling);
          await pullDefaultModel();
        }
        
        setPhase('ready');
        setProgress(100);
        setSubMessage(subMessages.ready);
        
        setTimeout(() => {
          setPhase('complete');
          onComplete();
        }, 1500);
        
      } else {
        setPhase('installing');
        setSubMessage(subMessages.installing);
        setProgress(15);
        await installOllamaAuto();
      }

    } catch (error) {
      console.error('[OllamaSetup] Error:', error);
      setTimeout(() => onComplete(), 2000);
    }
  };

  const checkOllamaInstalled = async () => {
    try { 
      return await invoke('check_ollama_installed'); 
    } catch { 
      return false; 
    }
  };

  const checkOllamaRunning = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', { 
        signal: AbortSignal.timeout(3000) 
      });
      return response.ok;
    } catch { 
      return false; 
    }
  };

  const startOllama = async () => {
    try {
      await invoke('start_ollama');
      await waitForOllama();
    } catch (e) { 
      console.warn('[OllamaSetup] start_ollama error:', e); 
    }
  };

  const waitForOllama = async (maxAttempts = 20) => {
    for (let i = 0; i < maxAttempts; i++) {
      const running = await checkOllamaRunning();
      if (running) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  };

  const checkHasModel = async () => {
    try {
      const response = await requestWorker("get_models");
      const models = Array.isArray(response) ? response : response?.models || [];
      return models.length > 0;
    } catch { 
      return false; 
    }
  };

  const pullDefaultModel = async () => {
    const defaultModel = 'llama3.2:3b';
    try {
      await requestWorker("pull", { model: defaultModel });
    } catch (e) { 
      console.warn('[OllamaSetup] pull error:', e); 
    }
  };

  const installOllamaAuto = async () => {
    try { 
      await invoke('install_ollama'); 
    } catch (e) {
      console.error('[OllamaSetup] install error:', e);
      setPhase('error');
    }
  };

  // =============================================
  // AJOUT : INSTALLATION AUTOMATIQUE CLOUDFLARED
  // =============================================
  const installCloudflaredAuto = async () => {
    try {
      const cloudflaredStatus = await requestWorker("tunnel_get_status");
      if (!cloudflaredStatus?.cloudflared_installed) {
        await requestWorker("tunnel_install_cloudflared");
        return true;
      }
      return true;
    } catch (error) {
      console.warn('[OllamaSetup] Cloudflared install error:', error);
      return false;
    }
  };

  useEffect(() => {
    let unlistenInstall = null;
    let unlistenStream = null;

    const setupListeners = async () => {
      unlistenInstall = await listen('ollama-install-status', async (event) => {
        const { status } = event.payload;
        if (status === 'downloading') {
          setProgress(30);
          setSubMessage(language === 'fr' ? 'Téléchargement en cours...' : 'Downloading...');
        } else if (status === 'installing') {
          setProgress(60);
          setSubMessage(language === 'fr' ? 'Installation en cours...' : 'Installing...');
        } else if (status === 'success') {
          setProgress(70);
          setPhase('starting');
          setSubMessage(subMessages.starting);
          await startOllama();
          setProgress(80);
          setPhase('pulling');
          setSubMessage(subMessages.pulling);
          await pullDefaultModel();
          setPhase('ready');
          setProgress(100);
          setSubMessage(subMessages.ready);
          setTimeout(() => {
            setPhase('complete');
            onComplete();
          }, 1500);
        } else if (status === 'error') {
          setTimeout(() => onComplete(), 1000);
        }
      });

      unlistenStream = await setupStreamListener((payload) => {
        if (payload.model && payload.event === 'progress') {
          const prog = payload.progress || 0;
          setProgress(80 + (prog * 0.15));
          setSubMessage(`${language === 'fr' ? 'Téléchargement' : 'Downloading'}: ${prog}%`);
        }
        if (payload.model && payload.event === 'done') { 
          setProgress(95); 
        }
      });
    };

    setupListeners();
    return () => {
      if (unlistenInstall) unlistenInstall();
      if (unlistenStream) unlistenStream();
    };
  }, [onComplete, language]);

  if (phase === 'complete') return null;

  const isLoading = ['init', 'checking', 'installing', 'starting', 'pulling'].includes(phase);
  const isReady = phase === 'ready';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      {/* Fond avec ondes métalliques */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/2 -left-1/2 w-full h-full animate-pulse opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(60,60,60,0.4) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full animate-pulse opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(80,80,80,0.3) 0%, transparent 70%)', animationDelay: '1s' }}
        />
      </div>

      {/* Contenu principal - PB-20 ajouté pour protéger le footer */}
      <div className="relative z-10 w-[420px] text-center pb-20">
        
        {/* Logo Métal */}
        <div className="flex justify-center mb-10">
          <div 
            className={`relative p-8 rounded-[32px] ${isLoading ? 'animate-pulse' : ''}`}
            style={{
              background: isReady 
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)'
                : 'linear-gradient(135deg, rgba(60, 60, 60, 0.8) 0%, rgba(30, 30, 30, 0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: isReady 
                ? '0 0 60px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 0 60px rgba(100,100,100,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div 
              className="absolute inset-0 rounded-[32px] pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(255,100,100,0.1) 40%, rgba(255,200,50,0.1) 50%, rgba(100,255,100,0.1) 60%, rgba(100,200,255,0.1) 70%, transparent 80%)',
                opacity: isLoading ? 1 : 0,
                transition: 'opacity 0.5s',
              }}
            />
            
            {isReady ? (
              <CheckCircle size={56} className="text-emerald-400" />
            ) : (
              <Cpu size={56} className="text-white/80" />
            )}
            
            <div className="absolute top-2 left-3 w-[60%] h-[40%] rounded-full pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
            
            {isReady && (
              <>
                <Sparkles size={16} className="absolute -top-2 -right-2 text-emerald-400 animate-bounce" />
                <Sparkles size={12} className="absolute -bottom-1 -left-1 text-cyan-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </>
            )}
          </div>
        </div>

        {/* Titre Chrome */}
        <h1 
          className="text-3xl font-black mb-3 tracking-wide"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #888888 40%, #ffffff 50%, #666666 60%, #aaaaaa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {messages[phase] || messages.checking}
        </h1>

        <p className="text-white/40 text-sm mb-10 font-medium h-6">
          {subMessage || subMessages[phase]}
        </p>

        {/* Barre de progression Mercury */}
        {isLoading && (
          <div className="w-full max-w-xs mx-auto">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6)',
                  boxShadow: '0 0 15px rgba(255,200,100,0.4)',
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-3 text-white/30 mt-6">
              <Loader2 size={14} className="animate-spin text-gray-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {progress > 0 ? `${Math.round(progress)}%` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Badge succès */}
        {isReady && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {language === 'fr' ? 'Configuration terminée' : 'Setup complete'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Indépendant et Fixé en bas */}
      <div className="fixed bottom-10 left-0 w-full text-center pointer-events-none">
        <p 
          className="text-[9px] font-medium uppercase tracking-[0.3em]"
          style={{
            background: 'linear-gradient(90deg, rgba(255,100,100,0.5), rgba(255,200,50,0.5), rgba(100,255,100,0.5), rgba(100,200,255,0.5))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.5,
          }}
        >
          Horizon AI • {language === 'fr' ? "Propulsé par l'IA locale" : 'Powered by local AI'}
        </p>
      </div>
    </div>
  );
};

export default OllamaSetup;
