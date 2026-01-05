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
  MousePointer,
  Zap
} from 'lucide-react';

/**
 * OnboardingTour - Guide interactif au premier lancement
 * 
 * Affiche une série de slides expliquant les fonctionnalités
 * S'affiche uniquement au premier lancement (stocké dans localStorage)
 */
const OnboardingTour = ({ onComplete, language = 'fr' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Vérifier si c'est le premier lancement
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('horizon_onboarding_complete');
    if (!hasSeenTour) {
      // Délai pour laisser l'app se charger
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  // Contenu du tour
  const steps = [
    {
      icon: <Sparkles size={48} className="text-indigo-400" />,
      title: language === 'fr' ? 'Bienvenue sur Horizon AI !' : 'Welcome to Horizon AI!',
      description: language === 'fr' 
        ? 'Votre assistant IA local, 100% privé. Aucune donnée n\'est envoyée sur internet.'
        : 'Your local AI assistant, 100% private. No data is sent to the internet.',
      highlight: null
    },
    {
      icon: <LayoutDashboard size={48} className="text-indigo-400" />,
      title: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
      description: language === 'fr'
        ? 'Votre page d\'accueil. Posez des questions rapides, installez des modèles IA, et accédez à toutes les fonctionnalités.'
        : 'Your home page. Ask quick questions, install AI models, and access all features.',
      highlight: 'dashboard'
    },
    {
      icon: <MessageSquare size={48} className="text-indigo-400" />,
      title: language === 'fr' ? 'Assistant IA' : 'AI Assistant',
      description: language === 'fr'
        ? 'Le chat complet avec historique. Vos conversations sont sauvegardées automatiquement.'
        : 'Full chat with history. Your conversations are saved automatically.',
      highlight: 'chat'
    },
    {
      icon: <Cpu size={48} className="text-indigo-400" />,
      title: language === 'fr' ? 'Sélection du modèle' : 'Model Selection',
      description: language === 'fr'
        ? 'Choisissez votre modèle IA en haut de l\'écran. Différents modèles pour différents usages !'
        : 'Choose your AI model at the top. Different models for different uses!',
      highlight: 'model'
    },
    {
      icon: <Settings size={48} className="text-indigo-400" />,
      title: language === 'fr' ? 'Paramètres' : 'Settings',
      description: language === 'fr'
        ? 'Personnalisez votre expérience : langue, nom d\'utilisateur, et plus encore.'
        : 'Customize your experience: language, username, and more.',
      highlight: 'settings'
    },
    {
      icon: <Zap size={48} className="text-yellow-400" />,
      title: language === 'fr' ? 'C\'est parti !' : 'Let\'s go!',
      description: language === 'fr'
        ? 'Vous êtes prêt à utiliser Horizon AI. Commencez par poser une question !'
        : 'You\'re ready to use Horizon AI. Start by asking a question!',
      highlight: null
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Overlay sombre */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Carte principale */}
      <div className="relative z-10 w-[500px] max-w-[90vw] bg-gradient-to-br from-slate-900 to-slate-950 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Bouton fermer */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Header avec animation */}
        <div className="relative h-48 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center overflow-hidden">
          {/* Cercles décoratifs */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          {/* Icône centrale */}
          <div className="relative z-10 p-6 rounded-[28px] bg-white/5 border border-white/10 backdrop-blur-xl animate-bounce-slow">
            {step.icon}
          </div>
        </div>

        {/* Contenu */}
        <div className="p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-4">
            {step.title}
          </h2>
          
          <p className="text-white/60 text-sm leading-relaxed mb-8 px-4">
            {step.description}
          </p>

          {/* Indicateurs de progression */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-8 bg-indigo-500' 
                    : index < currentStep 
                      ? 'bg-indigo-500/50' 
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Boutons de navigation */}
          <div className="flex items-center justify-between gap-4">
            {/* Bouton Précédent */}
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                isFirstStep 
                  ? 'opacity-0 pointer-events-none' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ChevronLeft size={18} />
              {language === 'fr' ? 'Précédent' : 'Previous'}
            </button>

            {/* Bouton Suivant / Terminer */}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              {isLastStep ? (
                <>
                  <Sparkles size={18} />
                  {language === 'fr' ? 'Commencer' : 'Start'}
                </>
              ) : (
                <>
                  {language === 'fr' ? 'Suivant' : 'Next'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Lien passer */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="mt-4 text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              {language === 'fr' ? 'Passer le tutoriel' : 'Skip tutorial'}
            </button>
          )}
        </div>
      </div>

      {/* Style pour animation lente */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OnboardingTour;
