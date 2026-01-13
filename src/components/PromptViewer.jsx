import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, X, Settings, Brain, Folder, User, Bot, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Composant pour afficher le prompt final envoyé au modèle
 * 
 * Affiche le prompt de manière structurée avec sections pliables/dépliables
 * pour permettre à l'utilisateur de voir exactement ce qui est envoyé au modèle.
 * Design adapté au style "Chrome Metal" de l'application.
 */
export function PromptViewer({ promptData, onClose, language = 'fr' }) {
  const { isDarkMode } = useTheme();
  const darkMode = isDarkMode;

  const [expanded, setExpanded] = useState({
    system: true,
    memory: false,
    context: false,
    history: false,
  });
  const [showFullContent, setShowFullContent] = useState({});

  if (!promptData) return null;

  const toggleSection = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleFullContent = (componentIndex) => {
    setShowFullContent(prev => ({
      ...prev,
      [componentIndex]: !prev[componentIndex]
    }));
  };

  const getComponentIcon = (type) => {
    switch (type) {
      case 'system':
        return <Settings className="w-4 h-4" />;
      case 'memory':
        return <Brain className="w-4 h-4" />;
      case 'context':
        return <Folder className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getComponentColor = (type) => {
    switch (type) {
      case 'system':
        return 'text-blue-400';
      case 'memory':
        return 'text-purple-400';
      case 'context':
        return 'text-green-400';
      case 'user':
        return 'text-amber-400';
      case 'assistant':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatContent = (content, maxLength = 500) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const text = {
    fr: {
      title: "Prompt envoyé au modèle",
      version: "Version",
      characters: "caractères",
      metadata: "metadata",
      showAll: "Afficher tout",
      showLess: "Afficher moins",
      promptId: "Prompt ID",
      close: "Fermer"
    },
    en: {
      title: "Prompt sent to model",
      version: "Version",
      characters: "characters",
      metadata: "metadata",
      showAll: "Show all",
      showLess: "Show less",
      promptId: "Prompt ID",
      close: "Close"
    }
  };

  const t = text[language] || text.en;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl border shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
        darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Barre prismatique arc-en-ciel */}
              <div 
                className="h-1 w-12 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))'
                }}
              />
              <span className={`font-black text-[10px] uppercase tracking-[0.4em] ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {t.version} {promptData.version}
              </span>
            </div>
            <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {t.title}
            </h2>
            <p className={`text-xs mt-1 ${
              darkMode ? 'opacity-60' : 'text-slate-600'
            }`}>
              {new Date(promptData.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              darkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar ${
          darkMode ? 'bg-black/20' : 'bg-slate-50'
        }`}>
          {promptData.components?.map((component, idx) => {
            const isExpanded = expanded[component.type] !== undefined 
              ? expanded[component.type] 
              : true;
            const showFull = showFullContent[idx] || false;
            const content = showFull 
              ? component.content 
              : formatContent(component.content, 500);

            return (
              <div
                key={idx}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  darkMode 
                    ? 'bg-[#0A0A0A] border-white/5 hover:border-white/10' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(component.type)}
                  className={`w-full flex items-center justify-between p-4 transition-all ${
                    darkMode 
                      ? 'bg-black/40 hover:bg-black/60' 
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    )}
                    <div className={`${getComponentColor(component.type)}`}>
                      {getComponentIcon(component.type)}
                    </div>
                    <span className={`font-black text-xs uppercase tracking-wider ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {component.type}
                    </span>
                    {component.metadata && Object.keys(component.metadata).length > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase ${
                        darkMode 
                          ? 'bg-white/10 text-white/60' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {Object.keys(component.metadata).length} {t.metadata}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${
                    darkMode ? 'opacity-40' : 'text-slate-500'
                  }`}>
                    {component.content?.length || 0} {t.characters}
                  </span>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className={`p-4 ${
                    darkMode ? 'bg-black/20' : 'bg-white'
                  }`}>
                    {/* Metadata */}
                    {component.metadata && Object.keys(component.metadata).length > 0 && (
                      <div className={`mb-3 p-3 rounded-xl text-xs ${
                        darkMode 
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                          : 'bg-blue-50 border border-blue-200 text-blue-700'
                      }`}>
                        <strong className="font-black uppercase text-[10px] tracking-wider">Metadata:</strong>
                        <pre className="mt-1 font-mono text-[10px]">
                          {JSON.stringify(component.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative">
                      <pre className={`whitespace-pre-wrap text-xs font-mono p-4 rounded-xl border overflow-x-auto ${
                        darkMode
                          ? 'bg-black/40 border-white/10 text-gray-300'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}>
                        {content}
                      </pre>
                      
                      {/* Toggle full content */}
                      {component.content && component.content.length > 500 && (
                        <button
                          onClick={() => toggleFullContent(idx)}
                          className={`mt-3 flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                            darkMode
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          {showFull ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              {t.showLess}
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              {t.showAll} ({component.content.length} {t.characters})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${
          darkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              darkMode ? 'opacity-40' : 'text-slate-500'
            }`}>
              {t.promptId}: {promptData.prompt_id}
            </p>
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
