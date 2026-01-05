import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  MessageSquare,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  Trash2,
  X,
  StopCircle,
  RefreshCw,
  AlertCircle,
  Clock,
  Bot
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';
import { requestWorker, setupStreamListener } from '../services/bridge';
import { translations } from '../constants/translations';

// ========================================
// COMPOSANT POUR AFFICHER LE CODE AVEC BOUTON COPIER
// ========================================
const CodeBlock = ({ language, children, lang = 'fr' }) => {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-xl border-b border-zinc-700">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">{lang === 'fr' ? 'Copié!' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>{lang === 'fr' ? 'Copier' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>
      
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 12px 12px',
          padding: '16px',
          fontSize: '13px',
        }}
        showLineNumbers={code.split('\n').length > 3}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// ========================================
// COMPOSANT MESSAGE AVEC ACTIONS
// ========================================
const MessageBubble = ({ 
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
        <code className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-sm" {...props}>
          {children}
        </code>
      );
    }
  };

  const isUser = msg.role === 'user';
  const isError = msg.isError;
  const isEmpty = !msg.content && !isTyping;

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`relative max-w-[85%] md:max-w-[70%] p-6 md:p-8 rounded-[28px] border leading-relaxed shadow-2xl
        ${isUser
          ? 'bg-indigo-600 text-white border-indigo-400'
          : isError 
            ? (isDarkMode ? 'bg-red-900/30 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800')
            : (isDarkMode ? 'bg-zinc-900/50 border-white/5 text-gray-200' : 'bg-white border-slate-100 text-slate-800')}
      `}>
        {/* Indicateur de modèle pour les réponses IA */}
        {!isUser && msg.model && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
            <Bot size={12} className="text-indigo-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">{msg.model}</span>
          </div>
        )}
        
        {/* Image */}
        {msg.image && (
          <img src={msg.image} alt="Upload" className="rounded-2xl mb-6 max-h-80 w-full object-cover" />
        )}
        
        {/* Contenu */}
        {isError ? (
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">{language === 'fr' ? 'Erreur' : 'Error'}</p>
              <p className="text-sm opacity-80">{msg.content || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')}</p>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none font-medium">
            <ReactMarkdown components={markdownComponents}>
              {msg.content || (isLastAssistant && isTyping ? '' : '')}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Actions (copier, réessayer) - seulement pour les messages de l'assistant */}
        {!isUser && msg.content && !isTyping && (
          <div className={`absolute -bottom-3 right-4 flex items-center gap-1 transition-all duration-200 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title={language === 'fr' ? 'Copier' : 'Copy'}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            
            {isError && onRetry && (
              <button
                onClick={onRetry}
                className={`p-2 rounded-lg text-xs font-bold transition-all ${
                  isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={language === 'fr' ? 'Réessayer' : 'Retry'}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// COMPOSANT PRINCIPAL AICHATPANEL
// ========================================
const AIChatPanel = ({ selectedModel, chatId, setSelectedChatId, language = 'fr' }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.chat || translations.en.chat;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  
  // ✅ NOUVEAU: États pour les améliorations UX
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // ✅ AMÉLIORATION: Détection du scroll utilisateur pour auto-scroll intelligent
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Si l'utilisateur est à moins de 100px du bas, on auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // ✅ AMÉLIORATION: Auto-scroll intelligent
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }, [messages, shouldAutoScroll]);

  /* RESET AU CHANGEMENT DE MODÈLE */
  useEffect(() => {
    if (selectedModel) {
      setSelectedChatId(null);
      setMessages([]);
      fetchConversations();
    }
  }, [selectedModel]);

  /* FETCH CONVERSATIONS */
  const fetchConversations = async () => {
    try {
      const res = await requestWorker("list_conversations");
      const all = Array.isArray(res) ? res : [];
      const filtered = selectedModel 
        ? all.filter(c => c.model === selectedModel || !c.model)
        : all;
      setConversations(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedModel]);

  /* LOAD MESSAGES */
  useEffect(() => {
    const load = async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }
      const msgs = await requestWorker("get_conversation_messages", { chat_id: chatId });
      setMessages(Array.isArray(msgs) ? msgs : []);
    };
    load();
  }, [chatId]);

  /* STREAM */
  useEffect(() => {
    let unlisten = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await setupStreamListener(payload => {
        if (!isMounted) return;
        
        if (payload.event === "token" && payload.data !== undefined) {
          setMessages(prev => {
            const copy = [...prev];
            const lastMsg = copy.at(-1);
            if (lastMsg?.role === 'assistant' && !lastMsg.isError) {
              copy[copy.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + payload.data,
                model: selectedModel // ✅ Ajouter le modèle
              };
            }
            return copy;
          });
        }
        
        if (payload.event === "done" && payload.chat_id) {
          setIsTyping(false);
          setStreamStartTime(null);
          fetchConversations();
        }
        
        if (payload.event === "error") {
          setIsTyping(false);
          setStreamStartTime(null);
          // ✅ AMÉLIORATION: Afficher l'erreur dans le chat
          setMessages(prev => {
            const copy = [...prev];
            const lastMsg = copy.at(-1);
            if (lastMsg?.role === 'assistant') {
              copy[copy.length - 1] = {
                ...lastMsg,
                content: payload.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'),
                isError: true
              };
            }
            return copy;
          });
        }
      });
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [language, selectedModel]);

  // ✅ AMÉLIORATION: Timer pour détecter les réponses longues
  useEffect(() => {
    if (isTyping && !streamStartTime) {
      setStreamStartTime(Date.now());
    }
  }, [isTyping, streamStartTime]);

  /* SEND MESSAGE */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !selectedModel) return;

    const userMessage = input.trim();
    setLastUserMessage(userMessage);
    
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, image: previewUrl },
      { role: 'assistant', content: '', model: selectedModel }
    ]);

    setInput('');
    setPreviewUrl(null);
    setIsTyping(true);
    setShouldAutoScroll(true); // Réactiver l'auto-scroll quand on envoie un message

    try {
      const res = await requestWorker("chat", {
        model: selectedModel,
        prompt: userMessage,
        chat_id: chatId || null,
        language: language || "en"
      });

      if (res?.chat_id && !chatId) {
        setSelectedChatId(res.chat_id);
      }
    } catch (error) {
      setIsTyping(false);
      // Afficher l'erreur dans le chat
      setMessages(prev => {
        const copy = [...prev];
        const lastMsg = copy.at(-1);
        if (lastMsg?.role === 'assistant') {
          copy[copy.length - 1] = {
            ...lastMsg,
            content: language === 'fr' 
              ? 'Erreur de connexion. Vérifiez qu\'Ollama est lancé.'
              : 'Connection error. Check if Ollama is running.',
            isError: true
          };
        }
        return copy;
      });
    }
  };

  // ✅ AMÉLIORATION: Fonction pour réessayer le dernier message
  const handleRetry = async () => {
    if (!lastUserMessage || isTyping || !selectedModel) return;
    
    // Supprimer le dernier message d'erreur
    setMessages(prev => {
      const copy = [...prev];
      if (copy.at(-1)?.isError) {
        copy.pop();
      }
      if (copy.at(-1)?.role === 'user') {
        copy.pop();
      }
      return copy;
    });

    // Réenvoyer
    setInput(lastUserMessage);
    setTimeout(() => {
      inputRef.current?.form?.requestSubmit();
    }, 100);
  };

  // ✅ V1: Marquer comme interrompu (le streaming continue en arrière-plan mais l'UI est libérée)
  const handleStop = () => {
    setIsTyping(false);
    setStreamStartTime(null);
    // Ajouter un message d'interruption à la réponse actuelle
    setMessages(prev => {
      const copy = [...prev];
      const lastMsg = copy.at(-1);
      if (lastMsg?.role === 'assistant' && lastMsg.content) {
        copy[copy.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + '\n\n⏹️ *' + (language === 'fr' ? 'Génération interrompue' : 'Generation stopped') + '*'
        };
      }
      return copy;
    });
  };

  /* DELETE CONVERSATION */
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    const idToDelete = conversationToDelete.id;
    const wasCurrentChat = chatId === idToDelete;
    
    setShowDeleteModal(false);
    setConversationToDelete(null);
    
    try {
      await requestWorker("delete_conversation", { chat_id: idToDelete });
      if (wasCurrentChat) {
        setSelectedChatId(null);
        setMessages([]);
      }
      setTimeout(() => fetchConversations(), 100);
    } catch (e) {
      console.error("Delete conversation error:", e);
      fetchConversations();
    }
  };

  // Focus sur l'input après envoi
  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent">

      {/* SIDEBAR WRAPPER */}
      <div className={`relative h-full transition-all duration-500 ease-in-out ${isHistoryOpen ? 'w-80' : 'w-12'}`}>
        <div className={`absolute inset-0 w-80 h-full p-6 flex flex-col border-r backdrop-blur-md transition-transform duration-500
          ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white/40 border-slate-200'}
        `}>
          <div className="mb-8 px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">
              {t.database}
            </span>
            <p className="text-[9px] opacity-40 uppercase font-black mt-1 italic">
              {selectedModel || (language === 'fr' ? "Hors ligne" : "Offline")}
            </p>
          </div>

          <button
            onClick={() => { setSelectedChatId(null); setMessages([]); }}
            className="w-full py-4 mb-6 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> {t.new_session}
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="text-center py-8 opacity-40">
                <MessageSquare size={24} className="mx-auto mb-2" />
                <p className="text-[9px] font-bold uppercase">{language === 'fr' ? 'Aucune conversation' : 'No conversations'}</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group relative w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase flex flex-col gap-1 border transition-all cursor-pointer
                    ${chatId === conv.id
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-500'
                      : 'border-transparent text-slate-400 hover:bg-white/5'}
                  `}
                  onClick={() => setSelectedChatId(conv.id)}
                >
                  <div className="flex items-center gap-3 truncate pr-8">
                    <MessageSquare size={14} />
                    <span className="truncate">{conv.title || "Session"}</span>
                  </div>
                  {conv.model && (
                    <span className="text-[8px] opacity-50 ml-7 truncate">{conv.model}</span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConversationToDelete(conv);
                      setShowDeleteModal(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* NEON TOGGLE BAR */}
        <button
          onClick={() => setIsHistoryOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-50 group"
        >
          <div className="relative w-[6px] h-24 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(139,92,246,1)] group-hover:scale-y-105">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.9)] transition-all group-hover:scale-110">
              {isHistoryOpen ? <ChevronLeft size={12} className="text-indigo-400" /> : <ChevronRight size={12} className="text-indigo-400" />}
            </div>
          </div>
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Cpu size={64} className="mb-6 text-indigo-500" />
              <h2 className="text-2xl font-black uppercase italic tracking-[0.5em]">
                {language === 'fr' ? 'Système Prêt' : 'System Ready'}
              </h2>
              <p className="text-sm mt-2 opacity-60">{selectedModel || (language === 'fr' ? "Sélectionnez un modèle" : "Select a model")}</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                index={i}
                isDarkMode={isDarkMode}
                language={language}
                onRetry={msg.isError ? handleRetry : undefined}
                isLastAssistant={i === messages.length - 1 && msg.role === 'assistant'}
                isTyping={isTyping}
              />
            ))
          )}

          {/* ✅ AMÉLIORATION: Indicateur de streaming amélioré */}
          {isTyping && (
            <div className={`flex items-center gap-4 ml-4 p-4 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 size={18} className="animate-spin text-indigo-500" />
                  <div className="absolute inset-0 animate-ping">
                    <Loader2 size={18} className="text-indigo-500 opacity-30" />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    {language === 'fr' ? 'L\'IA écrit...' : 'AI is typing...'}
                  </span>
                  <span className="text-[9px] opacity-50">{selectedModel}</span>
                </div>
              </div>
              
              {/* ✅ AMÉLIORATION: Bouton Stop */}
              <button
                onClick={handleStop}
                className="ml-auto p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                title={language === 'fr' ? 'Arrêter' : 'Stop'}
              >
                <StopCircle size={16} />
              </button>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="px-6 md:px-12 pb-10">
          {/* ✅ AMÉLIORATION: Preview d'image */}
          {previewUrl && (
            <div className="max-w-4xl mx-auto mb-3 relative inline-block">
              <img src={previewUrl} alt="Preview" className="h-20 rounded-xl border border-indigo-500/30" />
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <form
            onSubmit={handleSendMessage}
            className={`max-w-4xl mx-auto flex items-center gap-2 p-2 rounded-[30px] border backdrop-blur-2xl transition-all
              ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white border-slate-200 shadow-xl'}
              ${isTyping ? 'opacity-60' : ''}
            `}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={isTyping}
              className="p-4 text-slate-300 hover:text-indigo-500 transition-colors disabled:opacity-30"
            >
              <ImageIcon size={20} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files[0] && setPreviewUrl(URL.createObjectURL(e.target.files[0]))}
            />

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTyping 
                ? (language === 'fr' ? 'Patientez...' : 'Please wait...') 
                : t.input_placeholder}
              disabled={isTyping}
              className="flex-1 bg-transparent px-4 py-4 text-xs font-bold outline-none disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={isTyping || !input.trim() || !selectedModel}
              className="bg-indigo-600 text-white px-8 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              {isTyping ? <Loader2 size={16} className="animate-spin" /> : t.execute}
            </button>
          </form>
          
          {/* ✅ AMÉLIORATION: Message d'aide si pas de modèle */}
          {!selectedModel && (
            <p className="text-center text-xs opacity-40 mt-3">
              {language === 'fr' ? '↑ Sélectionnez un modèle pour commencer' : '↑ Select a model to start'}
            </p>
          )}
        </div>
      </div>

      {/* MODAL DELETE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[400px] p-8 rounded-[28px] border shadow-2xl ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => { setShowDeleteModal(false); setConversationToDelete(null); }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="opacity-50" />
            </button>
            
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <Trash2 size={28} className="text-red-500" />
            </div>
            
            <h3 className="text-lg font-black uppercase text-center mb-2">
              {language === 'fr' ? 'Supprimer la conversation ?' : 'Delete conversation?'}
            </h3>
            
            <p className="text-sm text-center opacity-60 mb-8">
              "{conversationToDelete?.title || (language === 'fr' ? 'Cette conversation' : 'This conversation')}" {language === 'fr' ? 'sera définitivement supprimée.' : 'will be permanently deleted.'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setConversationToDelete(null); }}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConversation}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
              >
                {language === 'fr' ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatPanel;
