/**
 * useChatMessages - Hook pour gérer les messages du chat
 * Responsabilités:
 * - Charger les messages d'une conversation
 * - Ajouter des messages (user, assistant)
 * - Gérer l'état des messages
 * - Auto-scroll intelligent
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';

export const useChatMessages = (activeChatId) => {
  const [messages, setMessages] = useState([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollRef = useRef(null);

  // Détection du scroll utilisateur pour auto-scroll intelligent
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Si l'utilisateur est à moins de 100px du bas, on auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // Auto-scroll intelligent
  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, shouldAutoScroll]);

  // Charger les messages d'une conversation
  useEffect(() => {
    const load = async () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      const msgs = await requestWorker("get_conversation_messages", { chat_id: activeChatId });
      setMessages(Array.isArray(msgs) ? msgs : []);
    };
    load();
  }, [activeChatId]);

  // Fonctions utilitaires
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
    setShouldAutoScroll(true); // Réactiver l'auto-scroll
  }, []);

  const addMessages = useCallback((newMessages) => {
    setMessages(prev => [...prev, ...newMessages]);
    setShouldAutoScroll(true);
  }, []);

  const updateLastMessage = useCallback((updater) => {
    setMessages(prev => {
      const copy = [...prev];
      const lastMsg = copy.at(-1);
      if (lastMsg) {
        copy[copy.length - 1] = typeof updater === 'function' ? updater(lastMsg) : { ...lastMsg, ...updater };
      }
      return copy;
    });
  }, []);

  const removeLastMessages = useCallback((count = 1) => {
    setMessages(prev => prev.slice(0, -count));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const resetAutoScroll = useCallback(() => {
    setShouldAutoScroll(true);
  }, []);

  return {
    messages,
    setMessages,
    shouldAutoScroll,
    scrollRef,
    handleScroll,
    addMessage,
    addMessages,
    updateLastMessage,
    removeLastMessages,
    clearMessages,
    resetAutoScroll
  };
};
