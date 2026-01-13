/**
 * ChatMessages - Zone d'affichage des messages
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { Cpu } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';
import { ProjectBadge } from './ProjectBadge';

export const ChatMessages = ({
  messages,
  isTyping,
  activeModel,
  language,
  currentPrompt,
  scrollRef,
  handleScroll,
  onRetry,
  onStop,
  onViewPrompt,
  // Props pour le projet
  activeProject,
  selectedRepo
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 2xl:p-20 space-y-6 sm:space-y-8 custom-scrollbar"
    >
      {/* Badge Projet actif (affiché en haut) */}
      {activeProject && (
        <div className="pt-4">
          <ProjectBadge
            activeProject={activeProject}
            selectedRepo={selectedRepo}
            language={language}
          />
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center opacity-20 px-4">
          <Cpu size={48} className="sm:w-16 sm:h-16 mb-4 sm:mb-6 text-gray-500" />
          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-[0.3em] sm:tracking-[0.5em] text-center">
            {language === 'fr' ? 'Système Prêt' : 'System Ready'}
          </h2>
          <p className="text-xs sm:text-sm mt-2 opacity-60 text-center">
            {activeModel || (language === 'fr' ? "Sélectionnez un modèle" : "Select a model")}
          </p>
        </div>
      ) : (
        messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            index={i}
            isDarkMode={isDarkMode}
            language={language}
            onRetry={msg.isError ? onRetry : undefined}
            isLastAssistant={i === messages.length - 1 && msg.role === 'assistant'}
            isTyping={isTyping}
          />
        ))
      )}

      {/* Indicateur de streaming amélioré */}
      <StreamingIndicator
        isTyping={isTyping}
        activeModel={activeModel}
        language={language}
        currentPrompt={currentPrompt}
        onStop={onStop}
        onViewPrompt={onViewPrompt}
      />
    </div>
  );
};
