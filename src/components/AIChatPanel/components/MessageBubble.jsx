/**
 * MessageBubble - Composant pour afficher un message (user ou assistant)
 * Style: Verre Sombre Flottant (Horizon AI)
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, AlertCircle, Bot, RefreshCw } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

export const MessageBubble = ({
  msg,
  index,
  isDarkMode,
  language,
  onRetry,
  onCopy,
  isLastAssistant,
  isTyping
}) => {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeLanguage = match ? match[1] : '';

      if (!inline && (match || String(children).includes('\n'))) {
        return <CodeBlock language={codeLanguage} lang={language}>{children}</CodeBlock>;
      }

      return (
        <code className="px-2 py-1 rounded-lg bg-gray-500/10 text-gray-300 font-mono text-sm border border-gray-500/20" {...props}>
          {children}
        </code>
      );
    }
  };

  const isUser = msg.role === 'user';
  const isError = msg.isError;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group message-appear`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`relative overflow-hidden rounded-2xl transition-all duration-300
        w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[900px] xl:max-w-[1100px] 2xl:max-w-[1400px]
        ${isUser ? 'ml-0 sm:ml-8 md:ml-12 lg:ml-16 xl:ml-20' : 'mr-0 sm:mr-8 md:mr-12 lg:mr-16 xl:mr-20'}
      `}>
        {/* BLOC MESSAGE USER - Métal chromé */}
        {isUser ? (
          <div
            className="relative p-5 md:p-6"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(60, 60, 60, 0.6) 0%, rgba(40, 40, 40, 0.5) 100%)'
                : 'linear-gradient(135deg, rgba(240, 240, 245, 0.95) 0%, rgba(230, 230, 235, 0.9) 100%)',
              border: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              boxShadow: isDarkMode
                ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.3)'
                : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 30px rgba(0,0,0,0.1)',
            }}
          >
            {/* Bord prismatique droit - Arc-en-ciel */}
            <div
              className="absolute right-0 top-3 bottom-3 w-1 rounded-full"
              style={{
                background: 'linear-gradient(180deg, rgba(255,100,100,0.7), rgba(255,200,50,0.7), rgba(100,255,100,0.7), rgba(100,200,255,0.7))',
                boxShadow: '0 0 10px rgba(255,200,100,0.3)',
              }}
            />

            {/* Image */}
            {msg.image && (
              <img src={msg.image} alt="Upload" className="rounded-xl mb-4 max-h-48 sm:max-h-60 w-full object-cover border border-white/10" />
            )}

            <p className={`font-medium leading-relaxed text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {msg.content}
            </p>
          </div>
        ) : (
          /* BLOC MESSAGE IA - Adapté au thème */
          <div
            className={`relative p-4 sm:p-5 md:p-6 backdrop-blur-xl ${isError ? 'border-red-500/30' : ''}`}
            style={{
              background: isError
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)'
                : isDarkMode
                  ? 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(5, 5, 5, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(245, 245, 250, 0.95) 0%, rgba(235, 235, 240, 0.9) 100%)',
              border: isError
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : isDarkMode
                  ? '1px solid rgba(255, 255, 255, 0.04)'
                  : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              boxShadow: isDarkMode
                ? '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
                : '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Bord prismatique gauche */}
            {!isError && (
              <div
                className="absolute left-0 top-3 bottom-3 w-1 rounded-full animate-prism-glow"
                style={{
                  background: 'linear-gradient(180deg, rgba(34, 211, 238, 0.5), rgba(139, 92, 246, 0.7), rgba(236, 72, 153, 0.5))',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
                }}
              />
            )}

            {/* Header avec modèle */}
            {msg.model && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot size={8} className="sm:w-[10px] sm:h-[10px] text-indigo-400" />
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/30 truncate">{msg.model}</span>
              </div>
            )}

            {/* Contenu */}
            {isError ? (
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={14} className="sm:w-4 sm:h-4 text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-red-400 text-xs sm:text-sm mb-1">{language === 'fr' ? 'Erreur' : 'Error'}</p>
                  <p className="text-xs sm:text-sm text-red-300/80 break-words">{msg.content || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')}</p>
                </div>
              </div>
            ) : (
              <div className={`prose prose-sm max-w-none font-medium leading-relaxed ${isDarkMode ? 'prose-invert text-white/80' : 'text-gray-700'}`}>
                <ReactMarkdown components={markdownComponents}>
                  {msg.content || ''}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions flottantes */}
            {msg.content && !isTyping && (
              <div className={`absolute -bottom-2 right-2 sm:right-4 flex items-center gap-1 transition-all duration-300 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <button
                  onClick={handleCopy}
                  className="p-1.5 sm:p-2 rounded-xl text-xs font-bold transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.9))',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  }}
                  title={language === 'fr' ? 'Copier' : 'Copy'}
                >
                  {copied ? <Check size={10} className="sm:w-3 sm:h-3 text-emerald-400" /> : <Copy size={10} className="sm:w-3 sm:h-3 text-white/50" />}
                </button>

                {isError && onRetry && (
                  <button
                    onClick={onRetry}
                    className="p-1.5 sm:p-2 rounded-xl text-xs font-bold transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.9))',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    title={language === 'fr' ? 'Réessayer' : 'Retry'}
                  >
                    <RefreshCw size={10} className="sm:w-3 sm:h-3 text-white/50" />
                  </button>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
