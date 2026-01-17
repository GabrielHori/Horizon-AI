/**
 * ChatSidebar - Sidebar d'historique des conversations et projets
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Trash2, Folder, FolderPlus } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { translations } from '../../../constants/translations';

// Sprint 1: Format date relative (Today, Yesterday, short date)
const toTimestampSeconds = (value) => {
  if (!value) return null;
  if (typeof value === 'number') {
    return value > 1e12 ? Math.floor(value / 1000) : value;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }
  return null;
};

const formatDate = (value) => {
  const ts = toTimestampSeconds(value);
  if (!ts) return '';
  const now = Date.now() / 1000;
  const diff = now - ts;

  if (diff < 86400) return 'Today';
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  }

  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
};

const formatDateTitle = (value) => {
  const ts = toTimestampSeconds(value);
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString();
};

export const ChatSidebar = ({
  isHistoryOpen,
  setIsHistoryOpen,
  conversations,
  activeChatId,
  activeModel,
  activeStyleLabel,
  language,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  projects = [],
  activeProjectId = null,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  t
}) => {
  const { isDarkMode } = useTheme();
  const chatTranslations = translations[language]?.chat || translations.en.chat;
  const styleLabel = translations[language]?.labels?.style || translations.en.labels?.style || 'Style';
  const hasActiveStyle = Boolean(activeModel && activeStyleLabel);

  return (
    <div
      className={`
        relative h-full flex-shrink-0
        transition-[width] duration-500 ease-in-out
        ${isHistoryOpen ? 'w-48 md:w-56' : 'w-12'}
      `}
    >
      {/* Overlay mobile */}
      {isHistoryOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Sidebar content */}
      <div
        className={`
          h-full w-full flex flex-col border-r backdrop-blur-md
          transition-all duration-500
          ${isHistoryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white/40 border-slate-200'}
          p-2 sm:p-3
        `}
      >
        {/* Header */}
        <div className="mb-4 px-2">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {chatTranslations.database}
          </span>
          <p className="text-[8px] opacity-40 uppercase font-black mt-0.5 italic truncate">
            {hasActiveStyle ? `${styleLabel}: ${activeStyleLabel}` : (language === 'fr' ? 'Hors ligne' : 'Offline')}
          </p>
        </div>

        {/* Section Projets */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className={`text-[8px] font-black uppercase tracking-wider opacity-60 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {language === 'fr' ? 'PROJETS' : 'PROJECTS'}
            </span>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
                title={language === 'fr' ? 'Nouveau projet' : 'New project'}
              >
                <FolderPlus size={10} />
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-3 opacity-40">
              <Folder size={14} className="mx-auto mb-1" />
              <p className="text-[8px] font-bold uppercase">
                {language === 'fr' ? 'Aucun projet' : 'No projects'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 mb-3">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject?.(project.id)}
                  className={`
                    group relative px-2.5 py-2 rounded-lg text-[8px] font-black uppercase
                    cursor-pointer transition-all border
                    ${activeProjectId === project.id
                      ? isDarkMode
                        ? 'bg-gray-700/30 border-gray-500/40 text-gray-300'
                        : 'bg-gray-200/50 border-gray-400/40 text-gray-700'
                      : 'border-transparent text-slate-400 hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-center gap-1.5 pr-5">
                    <Folder size={10} className="flex-shrink-0" />
                    <span className="truncate flex-1">{project.name}</span>
                  </div>

                  {(project.repos?.length > 0 || project.conversationCount > 0) && (
                    <div className="flex items-center gap-1.5 ml-3.5 mt-0.5">
                      {project.repos?.length > 0 && (
                        <span className="text-[7px] px-1 py-0.5 rounded opacity-60 bg-blue-500/20 text-blue-400">
                          {project.repos.length} {language === 'fr' ? 'repo(s)' : 'repo(s)'}
                        </span>
                      )}
                      {project.conversationCount > 0 && (
                        <span className="text-[7px] px-1 py-0.5 rounded opacity-60 bg-purple-500/20 text-purple-400">
                          {project.conversationCount} {language === 'fr' ? 'conv.' : 'conv.'}
                        </span>
                      )}
                    </div>
                  )}

                  {onDeleteProject && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100
                        bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={8} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className={`h-px mb-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'}`} />

        {/* Section Conversations */}
        <div className="mb-3">
          <div className="mb-2 px-2">
            <span className={`text-[8px] font-black uppercase tracking-wider opacity-60 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {language === 'fr' ? 'CONVERSATIONS' : 'CONVERSATIONS'}
            </span>
          </div>

          <button
            onClick={onNewChat}
            className={`w-full py-2.5 mb-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all
              ${isDarkMode ? 'btn-metal-dark text-white' : 'btn-metal-light text-gray-700'}
            `}
          >
            <Plus size={12} strokeWidth={3} />
            {chatTranslations.new_session}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-6 opacity-40">
              <MessageSquare size={18} className="mx-auto mb-1.5" />
              <p className="text-[8px] font-bold uppercase">
                {language === 'fr' ? 'Aucune conversation' : 'No conversations'}
              </p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => onSelectChat(conv.id)}
                className={`
                  group relative px-3 py-2.5 rounded-xl text-[9px] font-black uppercase
                  cursor-pointer transition-all border
                  ${activeChatId === conv.id
                    ? isDarkMode
                      ? 'bg-gray-700/30 border-gray-500/40 text-gray-300'
                      : 'bg-gray-200/50 border-gray-400/40 text-gray-700'
                    : 'border-transparent text-slate-400 hover:bg-white/5'}
                `}
              >
                <div className="flex items-center gap-2 pr-6">
                  <MessageSquare size={12} className="flex-shrink-0" />
                  <span className="truncate flex-1">{conv.title || 'Session'}</span>
                </div>

                <div className="ml-5 mt-1.5 flex flex-wrap items-center gap-1.5">
                  {conv.message_count > 0 && (
                    <span className="text-[6px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase">
                      {conv.message_count} msg
                    </span>
                  )}

                  {(conv.updated_at || conv.created_at) && (
                    <span
                      className="text-[6px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black uppercase"
                      title={formatDateTitle(conv.updated_at || conv.created_at)}
                    >
                      {formatDate(conv.updated_at || conv.created_at)}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(conv);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100
                    bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Prism bar with toggle button (desktop) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-50 hidden sm:flex sm:items-center sm:justify-center">
        <div className="relative w-[4px] h-20 rounded-full">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))',
              boxShadow: '0 0 10px rgba(255,200,100,0.5)',
            }}
          />

          <button
            onClick={() => setIsHistoryOpen(v => !v)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-[14px] border transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center z-10"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(245, 245, 245, 0.95) 0%, rgba(229, 229, 229, 0.95) 100%)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)',
              boxShadow: isDarkMode
                ? '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 4px 15px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
            title={language === 'fr' ? "Reduire/Agrandir l'historique" : 'Toggle history'}
          >
            {isHistoryOpen ? (
              <ChevronLeft size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Toggle mobile */}
      {!isHistoryOpen && (
        <button
          onClick={() => setIsHistoryOpen(v => !v)}
          className="sm:hidden fixed bottom-4 right-4 z-50 p-3 rounded-[18px] border shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(245, 245, 245, 0.95) 0%, rgba(229, 229, 229, 0.95) 100%)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isDarkMode
              ? '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <MessageSquare size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
        </button>
      )}
    </div>
  );
};
