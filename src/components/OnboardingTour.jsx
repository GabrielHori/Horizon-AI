import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Cpu,
  LayoutDashboard,
  ShieldCheck,
  Database,
  Zap
} from 'lucide-react';

const OnboardingTour = ({ onComplete, language = 'fr', setActiveTab }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardSize, setCardSize] = useState({ width: 360, height: 420 });
  const cardRef = useRef(null);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('horizon_onboarding_complete');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 800);
    }
  }, []);

  const steps = useMemo(() => ([
    {
      id: 'welcome',
      icon: <Sparkles size={40} className="text-white" />,
      title: language === 'fr' ? 'Bienvenue sur Horizon AI' : 'Welcome to Horizon AI',
      description: language === 'fr'
        ? "Votre assistant local, simple et prive. Rien n'est partage sans vous."
        : 'Your local assistant, simple and private. Nothing is shared without you.',
      target: null
    },
    {
      id: 'intent',
      icon: <LayoutDashboard size={40} className="text-white" />,
      title: language === 'fr' ? 'Commencez par une intention' : 'Start with an intent',
      description: language === 'fr'
        ? 'Choisissez une action simple pour demarrer.'
        : 'Pick a simple action to begin.',
      target: '[data-onboarding="intent-ask"]',
      ensureTab: 'dashboard'
    },
    {
      id: 'library',
      icon: <Database size={40} className="text-white" />,
      title: language === 'fr' ? 'Telechargez un modele' : 'Download a model',
      description: language === 'fr'
        ? 'Ouvrez la bibliotheque pour installer un modele IA.'
        : 'Open the library to install an AI model.',
      target: '[data-onboarding="library-link"]'
    },
    {
      id: 'style',
      icon: <Cpu size={40} className="text-white" />,
      title: language === 'fr' ? 'Choisissez un style IA' : 'Pick an AI style',
      description: language === 'fr'
        ? 'Rapide, clair ou creatif. Horizon s adapte a vous.'
        : 'Fast, clear, or creative. Horizon adapts to you.',
      target: '[data-onboarding="style-picker"]'
    },
    {
      id: 'chat',
      icon: <MessageSquare size={40} className="text-white" />,
      title: language === 'fr' ? 'Ecrivez votre demande' : 'Write your request',
      description: language === 'fr'
        ? 'Expliquez ce que vous voulez. Le reste est guide.'
        : 'Describe what you want. The rest is guided.',
      target: '[data-onboarding="chat-input"]',
      ensureTab: 'chat'
    },
    {
      id: 'security',
      icon: <ShieldCheck size={40} className="text-white" />,
      title: language === 'fr' ? 'Securite claire' : 'Clear security',
      description: language === 'fr'
        ? 'Les actions sensibles demandent toujours votre accord.'
        : 'Sensitive actions always ask for your approval.',
      target: '[data-onboarding="security-card"]',
      ensureTab: 'dashboard'
    },
    {
      id: 'advanced',
      icon: <Zap size={40} className="text-yellow-400" />,
      title: language === 'fr' ? 'Centre avance (optionnel)' : 'Advanced center (optional)',
      description: language === 'fr'
        ? 'Les options expertes restent cachees ici, si besoin.'
        : 'Expert options live here only if you need them.',
      target: '[data-onboarding="advanced-link"]',
      ensureTab: 'dashboard'
    }
  ]), [language]);

  useEffect(() => {
    if (!isVisible) return;
    const step = steps[currentStep];
    if (step?.ensureTab && setActiveTab) {
      setActiveTab(step.ensureTab);
    }
  }, [currentStep, steps, setActiveTab, isVisible]);

  const updateTargetRect = useCallback(() => {
    const viewportW = window.innerWidth || 1200;
    const viewportH = window.innerHeight || 800;
    setViewport((prev) =>
      prev.width === viewportW && prev.height === viewportH
        ? prev
        : { width: viewportW, height: viewportH }
    );

    const step = steps[currentStep];
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const raf = requestAnimationFrame(updateTargetRect);
    const handle = () => updateTargetRect();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [updateTargetRect, isVisible, currentStep]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const raf = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setCardSize((prev) => {
        const deltaW = Math.abs(prev.width - rect.width);
        const deltaH = Math.abs(prev.height - rect.height);
        if (deltaW < 2 && deltaH < 2) return prev;
        return { width: rect.width, height: rect.height };
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isVisible, currentStep, viewport.width, viewport.height]);

  const handleComplete = () => {
    localStorage.setItem('horizon_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => handleComplete();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const hasTarget = Boolean(targetRect);
  const viewportW = viewport.width || window.innerWidth || 1200;
  const viewportH = viewport.height || window.innerHeight || 800;
  const isCompact = viewportW < 640 || viewportH < 600;
  const highlightPadding = 10;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const getCardStyle = () => {
    const margin = 16;
    const maxWidth = 360;
    const availableW = Math.max(0, viewportW - margin * 2);
    const availableH = Math.max(0, viewportH - margin * 2);
    const cardWidth = Math.min(maxWidth, availableW || maxWidth, cardSize.width || maxWidth);
    const maxHeight = Math.max(320, availableH);
    return {
      left: margin,
      bottom: margin,
      width: cardWidth,
      maxHeight,
      transform: 'none'
    };
  };

  const showHighlight = hasTarget && !isCompact;
  const holeRect = showHighlight
    ? {
        left: clamp(targetRect.left - highlightPadding, 0, viewportW),
        top: clamp(targetRect.top - highlightPadding, 0, viewportH),
        width: clamp(
          targetRect.width + highlightPadding * 2,
          0,
          viewportW
        ),
        height: clamp(
          targetRect.height + highlightPadding * 2,
          0,
          viewportH
        )
      }
    : null;
  const blurMaskStyle = holeRect
    ? {
        WebkitMaskImage:
          'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
        WebkitMaskPosition: `0 0, ${holeRect.left}px ${holeRect.top}px`,
        WebkitMaskSize: `100% 100%, ${holeRect.width}px ${holeRect.height}px`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskComposite: 'xor',
        maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
        maskPosition: `0 0, ${holeRect.left}px ${holeRect.top}px`,
        maskSize: `100% 100%, ${holeRect.width}px ${holeRect.height}px`,
        maskRepeat: 'no-repeat',
        maskComposite: 'exclude'
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleSkip}
      />
      <div
        className="absolute inset-0 backdrop-blur-md bg-black/10 pointer-events-none"
        style={blurMaskStyle}
      />

      {showHighlight && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            top: Math.max(0, targetRect.top - highlightPadding),
            left: Math.max(0, targetRect.left - highlightPadding),
            width: Math.max(0, targetRect.width + highlightPadding * 2),
            height: Math.max(0, targetRect.height + highlightPadding * 2),
            borderRadius: 24,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.35), 0 0 40px rgba(99,102,241,0.35)'
          }}
        />
      )}

      <div
        ref={cardRef}
        className="absolute z-20 glass-panel rounded-[28px] border border-white/10 shadow-2xl overflow-hidden prism-edge flex flex-col"
        style={getCardStyle()}
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-20 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative h-40 bg-void-200 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/2 left-1/4 w-36 h-36 bg-indigo-500 rounded-full blur-[70px] animate-liquid-drift" />
            <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-purple-600 rounded-full blur-[70px] animate-liquid-drift animation-delay-2000" />
          </div>

          <div className="relative z-10 p-6 rounded-[26px] bg-metal-200 border border-white/10 backdrop-blur-2xl shadow-2xl animate-float">
            <div className="text-chrome">{step.icon}</div>
            <div className="absolute inset-0 bg-white/5 rounded-[26px] animate-pulse" />
          </div>
        </div>

        <div className="p-8 text-center relative flex-1 overflow-y-auto">
          <h2 className="text-xl font-black text-white mb-3 tracking-tight">
            {step.title}
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-6 px-3 font-medium">
            {step.description}
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === currentStep
                    ? 'w-10 bg-gradient-to-r from-cyan-400 via-indigo-500 to-magenta-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : index < currentStep
                      ? 'w-2 bg-indigo-500/40'
                      : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                isFirstStep
                  ? 'opacity-0 pointer-events-none'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <ChevronLeft size={14} />
              {language === 'fr' ? 'Retour' : 'Back'}
            </button>

            <button
              onClick={handleNext}
              className="btn-chrome flex items-center gap-2 px-6 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
            >
              {isLastStep ? (
                <>
                  <Sparkles size={14} className="text-cyan-400" />
                  {language === 'fr' ? 'Lancer' : 'Launch'}
                </>
              ) : (
                <>
                  {language === 'fr' ? 'Suivant' : 'Next'}
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>

          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="mt-5 text-white/20 text-[10px] uppercase tracking-[0.2em] hover:text-white/50 transition-colors"
            >
              {language === 'fr' ? 'Passer' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
