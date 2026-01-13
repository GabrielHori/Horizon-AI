/**
 * StreamingIndicator - Indicateur de streaming amélioré
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { Loader2, StopCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export const StreamingIndicator = ({
  isTyping,
  activeModel,
  language,
  currentPrompt,
  onStop,
  onViewPrompt
}) => {
  const { isDarkMode } = useTheme();
  
  if (!isTyping) return null;

  return (
    <div className={`flex items-center gap-4 ml-4 p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Loader2 size={18} className="animate-spin text-gray-400" />
          <div className="absolute inset-0 animate-ping">
            <Loader2 size={18} className="text-gray-400 opacity-30" />
          </div>
        </div>
        <div>
          <span className="text-xs font-bold block">
            {language === 'fr' ? 'L\'IA écrit...' : 'AI is typing...'}
          </span>
          <span className="text-[9px] opacity-50">{activeModel}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Bouton pour voir le prompt (ouverture manuelle) */}
        {currentPrompt && (
          <button
            onClick={onViewPrompt}
            className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
            title={language === 'fr' ? 'Voir le prompt' : 'View prompt'}
          >
            📋
          </button>
        )}

        {/* Bouton Stop */}
        <button
          onClick={onStop}
          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
          title={language === 'fr' ? 'Arrêter' : 'Stop'}
        >
          <StopCircle size={16} />
        </button>
      </div>
    </div>
  );
};
