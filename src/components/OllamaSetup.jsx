import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Loader2, Cpu, CheckCircle, Sparkles } from 'lucide-react';
import { requestWorker, setupStreamListener } from '../services/bridge';

/**
 * OllamaSetup - Écran de premier lancement TRANSPARENT
 * 
 * PHILOSOPHIE:
 * - L'utilisateur ne doit JAMAIS savoir ce qu'est Ollama
 * - Tout doit se faire automatiquement
 * - Les messages sont simples et non-techniques
 * - L'installation est silencieuse et progressive
 */
const OllamaSetup = ({ onComplete, language = 'fr' }) => {
  // États du processus global
  const [phase, setPhase] = useState('init'); 
  // Phases: init → checking → installing → starting → pulling → ready → complete
  
  const [progress, setProgress] = useState(0);
  const [subMessage, setSubMessage] = useState('');
  const hasStartedRef = useRef(false);

  // Messages simples pour l'utilisateur (SANS jargon technique)
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
      // PHASE 1: Vérification
      setPhase('checking');
      setProgress(10);
      setSubMessage(subMessages.checking);

      const isInstalled = await checkOllamaInstalled();
      
      if (isInstalled) {
        // Ollama est déjà installé - vérifier s'il tourne
        setProgress(30);
        const isRunning = await checkOllamaRunning();
        
        if (!isRunning) {
          // Démarrer Ollama silencieusement
          setPhase('starting');
          setSubMessage(subMessages.starting);
          await startOllama();
          setProgress(50);
        } else {
          setProgress(50);
        }

        // Vérifier si un modèle existe
        const hasModel = await checkHasModel();
        
        if (!hasModel) {
          // Télécharger un modèle par défaut
          setPhase('pulling');
          setSubMessage(subMessages.pulling);
          await pullDefaultModel();
        }
        
        // TERMINÉ !
        setPhase('ready');
        setProgress(100);
        setSubMessage(subMessages.ready);
        
        setTimeout(() => {
          setPhase('complete');
          onComplete();
        }, 1500);
        
      } else {
        // Ollama n'est pas installé - INSTALLER AUTOMATIQUEMENT
        setPhase('installing');
        setSubMessage(subMessages.installing);
        setProgress(15);
        
        await installOllamaAuto();
        // Le reste du flow se fait via les events d'installation
      }

    } catch (error) {
      console.error('[OllamaSetup] Error:', error);
      // En cas d'erreur, on laisse continuer quand même
      setTimeout(() => onComplete(), 2000);
    }
  };

  // =============================================
  // FONCTIONS UTILITAIRES
  // =============================================

  const checkOllamaInstalled = async () => {
    try {
      return await invoke('check_ollama_installed');
    } catch {
      return false;
    }
  };

  const checkOllamaRunning = async () => {
    try {
      // Tester si Ollama répond
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
      // Attendre que le service soit prêt
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
    // Modèle par défaut léger et performant
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
  // ÉCOUTER LES ÉVÉNEMENTS D'INSTALLATION
  // =============================================
  useEffect(() => {
    let unlistenInstall = null;
    let unlistenStream = null;

    const setupListeners = async () => {
      // Événements d'installation Ollama (côté Rust)
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
          
          // Démarrer Ollama après installation
          await startOllama();
          setProgress(80);
          
          // Télécharger le modèle par défaut
          setPhase('pulling');
          setSubMessage(subMessages.pulling);
          await pullDefaultModel();
          
          // TERMINÉ
          setPhase('ready');
          setProgress(100);
          setSubMessage(subMessages.ready);
          
          setTimeout(() => {
            setPhase('complete');
            onComplete();
          }, 1500);
        } else if (status === 'error') {
          // Laisser continuer quand même (mode dégradé)
          console.warn('[OllamaSetup] Installation failed, continuing anyway');
          setTimeout(() => onComplete(), 1000);
        }
      });

      // Événements de téléchargement de modèle (côté Python)
      unlistenStream = await setupStreamListener((payload) => {
        if (payload.model && payload.event === 'progress') {
          const prog = payload.progress || 0;
          // Mapper le progress du pull entre 80% et 95%
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

  // =============================================
  // RENDER - UI MINIMALISTE ET ÉLÉGANTE
  // =============================================

  // Si déjà complété, ne rien afficher
  if (phase === 'complete') return null;

  const isLoading = ['init', 'checking', 'installing', 'starting', 'pulling'].includes(phase);
  const isReady = phase === 'ready';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Effet de fond animé */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-indigo-500/10 to-transparent animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-purple-500/10 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Contenu centré */}
      <div className="relative z-10 w-[420px] text-center">
        
        {/* Logo avec animation */}
        <div className="flex justify-center mb-10">
          <div className={`relative p-8 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/40 ${isLoading ? 'animate-pulse' : ''}`}>
            {isReady ? (
              <CheckCircle size={56} className="text-white" />
            ) : (
              <Cpu size={56} className="text-white" />
            )}
            
            {/* Particules autour du logo */}
            {isReady && (
              <>
                <Sparkles size={16} className="absolute -top-2 -right-2 text-yellow-400 animate-bounce" />
                <Sparkles size={12} className="absolute -bottom-1 -left-1 text-indigo-300 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </>
            )}
          </div>
        </div>

        {/* Message principal */}
        <h1 className="text-3xl font-black text-white mb-3 tracking-wide">
          {messages[phase] || messages.checking}
        </h1>

        {/* Sous-message */}
        <p className="text-white/50 text-sm mb-10 font-medium h-6">
          {subMessage || subMessages[phase]}
        </p>

        {/* Barre de progression (visible sauf si prêt) */}
        {isLoading && (
          <div className="w-full max-w-xs mx-auto">
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Indicateur de chargement discret */}
            <div className="flex items-center justify-center gap-3 text-white/30">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {progress > 0 ? `${Math.round(progress)}%` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Message de succès */}
        {isReady && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'fr' ? 'Configuration terminée' : 'Setup complete'}
              </span>
            </div>
          </div>
        )}

        {/* Footer discret */}
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/15 text-[9px] font-medium">
          Horizon AI • {language === 'fr' ? 'Propulsé par l\'IA locale' : 'Powered by local AI'}
        </p>
      </div>
    </div>
  );
};

export default OllamaSetup;
