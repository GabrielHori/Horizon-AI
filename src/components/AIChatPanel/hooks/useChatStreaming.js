/**
 * useChatStreaming - Hook pour gérer le streaming des réponses IA (V2.1 Phase 3 : Détection permissions)
 * Responsabilités:
 * - Écouter les événements de streaming (token, done, error, prompt_preview)
 * - Mettre à jour les messages en temps réel
 * - Gérer l'état de streaming (isTyping)
 * - Gérer le prompt actuel pour affichage
 * - V2.1 Phase 3 : Détecter erreurs de permission dans les événements error
 */
import { useState, useEffect } from 'react';
import { setupStreamListener } from '../../../services/bridge';

export const useChatStreaming = ({
  activeModel,
  language,
  messages,
  updateLastMessage,
  setIsTyping,
  onPermissionError,  // V2.1 Phase 3 : Callback pour erreur permission détectée
  onChatCompleted
}) => {
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState(null);

  // Setup stream listener
  useEffect(() => {
    let unlisten = null;
    let isMounted = true;

    const setupListener = async () => {
      unlisten = await setupStreamListener(payload => {
        if (!isMounted) return;

        // Gérer l'événement prompt_preview
        if (payload.event === "prompt_preview" && payload.prompt_dict) {
          setCurrentPrompt(payload.prompt_dict);
          // Stocker le prompt_id dans le dernier message assistant
          updateLastMessage(prev => {
            if (prev?.role === 'assistant') {
              return {
                ...prev,
                prompt_id: payload.prompt_id
              };
            }
            return prev;
          });
        }

        // Gérer les tokens de streaming
        if (payload.event === "token" && payload.data !== undefined) {
          updateLastMessage(prev => {
            if (prev?.role === 'assistant' && !prev.isError) {
              return {
                ...prev,
                content: prev.content + payload.data,
                model: activeModel,
                chat_id: payload.chat_id || prev.chat_id
              };
            }
            return prev;
          });
        }

        // Fin du streaming
        if (payload.event === "done" && payload.chat_id) {
          setIsTyping(false);
          setStreamStartTime(null);
          updateLastMessage(prev => {
            if (prev?.role === 'assistant') {
              return {
                ...prev,
                chat_id: payload.chat_id
              };
            }
            return prev;
          });
          onChatCompleted?.(payload.chat_id);
        }

        if (payload.event === "cancelled" && payload.chat_id) {
          setIsTyping(false);
          setStreamStartTime(null);
          updateLastMessage(prev => {
            if (prev?.role === 'assistant') {
              return {
                ...prev,
                chat_id: payload.chat_id
              };
            }
            return prev;
          });
          onChatCompleted?.(payload.chat_id);
        }

        // Erreur de streaming
        if (payload.event === "error") {
          setIsTyping(false);
          setStreamStartTime(null);

          const errorMessage = payload.message || payload.error || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred');

          // V2.1 Phase 3 : Détecter erreurs de permission dans le message d'erreur
          if (errorMessage && typeof errorMessage === 'string' &&
            (errorMessage.includes('Permission') || errorMessage.includes('permission'))) {
            // Erreur de permission détectée : notifier le parent
            if (onPermissionError) {
              onPermissionError({
                permission: errorMessage.includes('FileRead') || errorMessage.includes('read') ? 'FileRead' :
                  errorMessage.includes('FileWrite') || errorMessage.includes('write') ? 'FileWrite' :
                    errorMessage.includes('RepoAnalyze') || errorMessage.includes('repo') ? 'RepoAnalyze' :
                      errorMessage.includes('CommandExecute') || errorMessage.includes('command') ? 'CommandExecute' : 'Unknown',
                blockedAction: errorMessage.match(/for:\s*(.+?)(?:$|\n)/i)?.[1]?.trim() ||
                  (language === 'fr' ? 'Action bloquée' : 'Action blocked'),
                isError: true
              });
            }
          }

          // Toujours afficher l'erreur dans le message
          updateLastMessage(prev => {
            if (prev?.role === 'assistant') {
              return {
                ...prev,
                content: errorMessage,
                isError: true,
                chat_id: payload.chat_id || prev.chat_id
              };
            }
            return prev;
          });
          if (payload.chat_id) {
            onChatCompleted?.(payload.chat_id);
          }
        }
      });
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [language, activeModel, updateLastMessage, setIsTyping, onPermissionError, onChatCompleted]);

  // Timer pour détecter les réponses longues
  useEffect(() => {
    // Cette logique peut être gérée dans le composant parent si nécessaire
  }, []);

  const handleStop = () => {
    setIsTyping(false);
    setStreamStartTime(null);

    // 🔧 CORRECTION URGENTE: Stopper réellement le streaming côté backend
    const activeChatId = messages.find(m => m.role === 'assistant' && !m.content.includes('stopped'))?.chat_id;
    if (activeChatId) {
      // Import dynamique pour éviter les dépendances circulaires
      import('../../../services/bridge').then(({ requestWorker }) => {
        requestWorker('cancel_chat', { chat_id: activeChatId }, 2000).catch(err => {
          console.warn('[useChatStreaming] Failed to cancel chat backend:', err);
        });
      });
    }

    // Ajouter un message d'interruption à la réponse actuelle
    updateLastMessage(prev => {
      if (prev?.role === 'assistant' && prev.content) {
        return {
          ...prev,
          content: prev.content + '\n\n⏹️ *' + (language === 'fr' ? 'Génération interrompue' : 'Generation stopped') + '*'
        };
      }
      return prev;
    });
  };

  return {
    streamStartTime,
    setStreamStartTime,
    currentPrompt,
    setCurrentPrompt,
    handleStop
  };
};