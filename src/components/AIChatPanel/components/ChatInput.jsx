/**
 * ChatInput - Barre d'input Mercury (Mercure Liquide)
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { ImageIcon, GitBranch, Loader2, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { RepositoryBadge } from './RepositoryBadge';
import { translations } from '../../../constants/translations';
import AnimatedInteractiveButton from '../../AnimatedInteractiveButton';

export const ChatInput = ({
  input,
  setInput,
  previewUrl,
  isTyping,
  activeModel,
  language,
  selectedRepo,
  analyzingRepo,
  repoAnalysis,
  fileInputRef,
  inputRef,
  onImageSelect,
  onRemoveImage,
  onSelectRepo,
  onRemoveRepo,
  onSubmit,
  t
}) => {
  const { isDarkMode } = useTheme();
  const chatTranslations = translations[language]?.chat || translations.en.chat;

  return (
    <div className="px-6 md:px-12 pb-10">
      {/* Preview d'image */}
      {previewUrl && (
        <div className="max-w-4xl mx-auto mb-4 relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-24 rounded-xl border border-gray-500/30 shadow-lg shadow-black/20"
          />
          <button
            onClick={onRemoveImage}
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white hover:scale-110 transition-transform shadow-lg"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Badge Repository sélectionné */}
      <RepositoryBadge
        selectedRepo={selectedRepo}
        analyzingRepo={analyzingRepo}
        repoAnalysis={repoAnalysis}
        language={language}
        onRemove={onRemoveRepo}
      />

      {/* Barre d'input Mercury */}
      <form
        onSubmit={onSubmit}
        className={`relative max-w-4xl mx-auto overflow-hidden rounded-[28px] transition-all duration-500 ${isTyping ? 'opacity-70' : ''}`}
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 250, 0.98) 100%)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.06)'
            : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: input.length > 0
            ? (isDarkMode
              ? '0 0 40px rgba(150, 150, 150, 0.15), 0 10px 50px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 0 40px rgba(0, 0, 0, 0.1), 0 10px 50px -10px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.9)')
            : (isDarkMode
              ? '0 10px 50px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 10px 50px -10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.9)'),
        }}
      >
        {/* Bordure prismatique supérieure */}
        <div
          className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-500 ${input.length > 0 ? 'opacity-100' : 'opacity-30'}`}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.5) 20%, rgba(99, 102, 241, 0.7) 50%, rgba(236, 72, 153, 0.5) 80%, transparent 100%)',
          }}
        />

        {/* Reflet chrome animé au survol */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none">
          <div
            className="absolute top-0 -left-full w-full h-full opacity-0 hover:opacity-100 transition-opacity"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
              transform: 'skewX(-20deg)',
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2">
          {/* Bouton Image - Style métal */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping}
            className="relative p-3 sm:p-4 rounded-2xl text-white/30 hover:text-gray-300 transition-all duration-300 disabled:opacity-20 overflow-hidden group flex-shrink-0"
            title={language === 'fr' ? 'Ajouter une image' : 'Add image'}
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/[0.03]" />
            <ImageIcon size={18} className="sm:w-5 sm:h-5 relative z-10" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={onImageSelect}
          />

          {/* Bouton Repository - Style métal minimaliste */}
          <button
            type="button"
            onClick={onSelectRepo}
            disabled={isTyping || analyzingRepo}
            className={`relative p-3 sm:p-4 rounded-2xl transition-all duration-300 disabled:opacity-20 overflow-hidden group flex-shrink-0 ${selectedRepo
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-white/30 hover:text-gray-300'
              }`}
            title={selectedRepo
              ? (language === 'fr' ? `Repository: ${selectedRepo.split(/[/\\]/).pop()}` : `Repository: ${selectedRepo.split(/[/\\]/).pop()}`)
              : (language === 'fr' ? 'Ajouter un repository' : 'Add repository')
            }
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/[0.03]" />
            {analyzingRepo ? (
              <Loader2 size={18} className="sm:w-5 sm:h-5 relative z-10 animate-spin" />
            ) : (
              <GitBranch size={18} className="sm:w-5 sm:h-5 relative z-10" />
            )}
            {selectedRepo && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 border border-white/20" />
            )}
          </button>

          {/* Input principal */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTyping
              ? (language === 'fr' ? 'Patientez...' : 'Please wait...')
              : (!activeModel
                ? (language === 'fr' ? 'Sélectionnez un modèle...' : 'Select a model...')
                : chatTranslations.input_placeholder)}
            disabled={isTyping || !activeModel}
            className="flex-1 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium outline-none disabled:cursor-not-allowed text-white/90 placeholder:text-white/20"
          />

          {/* Bouton Envoyer - Chrome brillant avec animation */}
          <AnimatedInteractiveButton
            type="submit"
            disabled={isTyping || !input.trim() || !activeModel}
            intensity="medium"
            enableSound={true}
            soundOn="click"
            className="relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-[20px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: isTyping || !input.trim() || !activeModel
                ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.5) 0%, rgba(20, 20, 20, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)',
              boxShadow: isTyping || !input.trim() || !activeModel
                ? 'none'
                : '0 0 30px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              color: isTyping || !input.trim() || !activeModel ? 'rgba(255,255,255,0.3)' : 'white',
            }}
          >
            {/* Reflet chrome sur le bouton */}
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
              }}
            />
            <span className="relative z-10">
              {isTyping ? <Loader2 size={16} className="animate-spin" /> : chatTranslations.execute}
            </span>
          </AnimatedInteractiveButton>
        </div>
      </form>

      {/* Message d'aide si pas de modèle */}
      {!activeModel && (
        <p className="text-center text-[10px] text-white/30 mt-4 font-medium tracking-wide">
          {language === 'fr' ? '↑ Sélectionnez un modèle pour commencer' : '↑ Select a model to start'}
        </p>
      )}
    </div>
  );
};
