import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  MessageSquare, 
  Settings, 
  Cpu,
  LayoutDashboard,
  Zap
} from 'lucide-react';

const OnboardingTour = ({ onComplete, language = 'fr' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('horizon_onboarding_complete');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const steps = [
    {
      icon: <Sparkles size={48} className="text-white" />,
      title: language === 'fr' ? 'Bienvenue sur Horizon AI !' : 'Welcome to Horizon AI!',
      description: language === 'fr' 
        ? 'Votre assistant IA local, 100% privé. Aucune donnée n\'est envoyée sur internet.'
        : 'Your local IA assistant, 100% private. No data is sent to the internet.',
    },
    {
      icon: <LayoutDashboard size={48} className="text-white" />,
      title: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
      description: language === 'fr'
        ? 'Votre page d\'accueil. Posez des questions rapides, installez des modèles IA, et accédez à toutes les fonctionnalités.'
        : 'Your home page. Ask quick questions, install AI models, and access all features.',
    },
    {
      icon: <MessageSquare size={48} className="text-white" />,
      title: language === 'fr' ? 'Assistant IA' : 'AI Assistant',
      description: language === 'fr'
        ? 'Le chat complet avec historique. Vos conversations sont sauvegardées automatiquement.'
        : 'Full chat with history. Your conversations are saved automatically.',
    },
    {
      icon: <Cpu size={48} className="text-white" />,
      title: language === 'fr' ? 'Sélection du modèle' : 'Model Selection',
      description: language === 'fr'
        ? 'Choisissez votre modèle IA en haut de l\'écran. Différents modèles pour différents usages !'
        : 'Choose your AI model at the top. Different models for different uses!',
    },
    {
      icon: <Settings size={48} className="text-white" />,
      title: language === 'fr' ? 'Paramètres' : 'Settings',
      description: language === 'fr'
        ? 'Personnalisez votre expérience : langue, nom d\'utilisateur, et plus encore.'
        : 'Customize your experience: language, username, and more.',
    },
    {
      icon: <Zap size={48} className="text-yellow-400" />,
      title: language === 'fr' ? 'C\'est parti !' : 'Let\'s go!',
      description: language === 'fr'
        ? 'Vous êtes prêt à utiliser Horizon AI. Commencez par poser une question !'
        : 'You\'re ready to use Horizon AI. Start by asking a question!',
    }
  ];

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

  const handleComplete = () => {
    localStorage.setItem('horizon_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('horizon_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center animate-liquid-enter">
      {/* Overlay sombre avec blur intense */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleSkip}
      />
      
      {/* Carte principale stylisée Liquid Metal */}
      <div className="relative z-10 w-[500px] max-w-[90vw] glass-panel rounded-[32px] border border-white/10 shadow-2xl overflow-hidden prism-edge">
        
        {/* Bouton fermer chrome */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Header avec fond Métal Liquide & Prism */}
        <div className="relative h-56 bg-void-200 flex items-center justify-center overflow-hidden">
          {/* Blobs d'arrière-plan animés */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] animate-liquid-drift" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-600 rounded-full blur-[80px] animate-liquid-drift animation-delay-2000" />
          </div>
          
          {/* Icône avec effet miroir / chrome */}
          <div className="relative z-10 p-8 rounded-[32px] bg-metal-200 border border-white/10 backdrop-blur-2xl shadow-2xl animate-float">
            <div className="text-chrome">
                {step.icon}
            </div>
            {/* Lueur sous l'icône */}
            <div className="absolute inset-0 bg-white/5 rounded-[32px] animate-pulse" />
          </div>
        </div>

        {/* Contenu textuel */}
        <div className="p-10 text-center relative">
          <h2 className="text-2xl font-black text-white mb-4 tracking-tight">
            {step.title}
          </h2>
          
          <p className="text-white/50 text-sm leading-relaxed mb-10 px-4 font-medium">
            {step.description}
          </p>

          {/* Indicateurs de progression (Prism) */}
          <div className="flex justify-center gap-2.5 mb-10">
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

          {/* Boutons de navigation - Style Chrome */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isFirstStep 
                  ? 'opacity-0 pointer-events-none' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <ChevronLeft size={16} />
              {language === 'fr' ? 'Retour' : 'Back'}
            </button>

            <button
              onClick={handleNext}
              className="btn-chrome flex items-center gap-3 px-8 py-3.5 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-xl active:scale-95"
            >
              {isLastStep ? (
                <>
                  <Sparkles size={16} className="text-cyan-400" />
                  {language === 'fr' ? 'Lancer' : 'Launch'}
                </>
              ) : (
                <>
                  {language === 'fr' ? 'Suivant' : 'Next'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>

          {/* Skip link discret */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="mt-8 text-white/20 text-[10px] uppercase tracking-[0.2em] hover:text-white/50 transition-colors"
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