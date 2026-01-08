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
// COMPOSANT MESSAGE - Style "Verre Sombre Flottant"
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
      <div className={`relative max-w-[85%] md:max-w-[70%] overflow-hidden rounded-2xl transition-all duration-300
        ${isUser ? 'ml-12' : 'mr-12'}
      `}>
        {/* ===== BLOC MESSAGE USER - Métal chromé ===== */}
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
              <img src={msg.image} alt="Upload" className="rounded-xl mb-4 max-h-60 w-full object-cover border border-white/10" />
            )}
            
            <p className={`font-medium leading-relaxed text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {msg.content}
            </p>
          </div>
        ) : (
          /* ===== BLOC MESSAGE IA - Adapté au thème ===== */
          <div 
            className={`relative p-5 md:p-6 backdrop-blur-xl ${isError ? 'border-red-500/30' : ''}`}
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
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                  <Bot size={10} className="text-indigo-400" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">{msg.model}</span>
              </div>
            )}
            
            {/* Contenu */}
            {isError ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-red-400 text-sm mb-1">{language === 'fr' ? 'Erreur' : 'Error'}</p>
                  <p className="text-sm text-red-300/80">{msg.content || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')}</p>
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
              <div className={`absolute -bottom-2 right-4 flex items-center gap-1 transition-all duration-300 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl text-xs font-bold transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.9))',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  }}
                  title={language === 'fr' ? 'Copier' : 'Copy'}
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-white/50" />}
                </button>
                
                {isError && onRetry && (
                  <button
                    onClick={onRetry}
                    className="p-2 rounded-xl text-xs font-bold transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9), rgba(10, 10, 10, 0.9))',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    title={language === 'fr' ? 'Réessayer' : 'Retry'}
                  >
                    <RefreshCw size={12} className="text-white/50" />
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
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t.database}
            </span>
            <p className="text-[9px] opacity-40 uppercase font-black mt-1 italic">
              {selectedModel || (language === 'fr' ? "Hors ligne" : "Offline")}
            </p>
          </div>

          <button
            onClick={() => { setSelectedChatId(null); setMessages([]); }}
            className={`w-full py-4 mb-6 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all ${isDarkMode ? 'btn-metal-dark' : 'btn-metal-light text-gray-700'}`}
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
                      ? (isDarkMode ? 'bg-gray-700/30 border-gray-500/40 text-gray-300' : 'bg-gray-200/50 border-gray-400/40 text-gray-700')
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

        {/* TOGGLE BAR - Arc-en-ciel prismatique */}
        <button
          onClick={() => setIsHistoryOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-50 group"
        >
          <div 
            className="relative w-[6px] h-24 rounded-full transition-all duration-300 group-hover:scale-y-105"
            style={{
              background: 'linear-gradient(180deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))',
              boxShadow: '0 0 12px rgba(255,200,100,0.5)',
            }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center transition-all group-hover:scale-110"
              style={{ boxShadow: '0 0 10px rgba(255,200,100,0.4)' }}
            >
              {isHistoryOpen ? <ChevronLeft size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
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
              <Cpu size={64} className="mb-6 text-gray-500" />
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
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                  <div className="absolute inset-0 animate-ping">
                    <Loader2 size={18} className="text-gray-400 opacity-30" />
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

        {/* INPUT - Style Mercury (Mercure Liquide) */}
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
                onClick={() => setPreviewUrl(null)}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white hover:scale-110 transition-transform shadow-lg"
              >
                <X size={10} />
              </button>
            </div>
          )}
          
          {/* Barre d'input Mercury */}
          <form
            onSubmit={handleSendMessage}
            className={`relative max-w-4xl mx-auto overflow-hidden rounded-[28px] transition-all duration-500
              ${isTyping ? 'opacity-70' : ''}
            `}
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
            
            <div className="flex items-center gap-2 p-2">
              {/* Bouton Image - Style métal */}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isTyping}
                className="relative p-4 rounded-2xl text-white/30 hover:text-gray-300 transition-all duration-300 disabled:opacity-20 overflow-hidden group"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/[0.03]" />
                <ImageIcon size={20} className="relative z-10" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files[0] && setPreviewUrl(URL.createObjectURL(e.target.files[0]))}
              />

              {/* Input principal */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isTyping 
                  ? (language === 'fr' ? 'Patientez...' : 'Please wait...') 
                  : t.input_placeholder}
                disabled={isTyping}
                className={`flex-1 bg-transparent px-4 py-4 text-sm font-medium outline-none disabled:cursor-not-allowed ${isDarkMode ? 'text-white/90 placeholder:text-white/20' : 'text-gray-800 placeholder:text-gray-400'}`}
              />

              {/* Bouton Envoyer - Chrome brillant */}
              <button
                type="submit"
                disabled={isTyping || !input.trim() || !selectedModel}
                className="relative px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
                style={{
                  background: isTyping || !input.trim() || !selectedModel
                    ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.5) 0%, rgba(20, 20, 20, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)',
                  boxShadow: isTyping || !input.trim() || !selectedModel
                    ? 'none'
                    : '0 0 30px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  color: isTyping || !input.trim() || !selectedModel ? 'rgba(255,255,255,0.3)' : 'white',
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
                  {isTyping ? <Loader2 size={16} className="animate-spin" /> : t.execute}
                </span>
              </button>
            </div>
          </form>
          
          {/* Message d'aide si pas de modèle */}
          {!selectedModel && (
            <p className="text-center text-[10px] text-white/30 mt-4 font-medium tracking-wide">
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
