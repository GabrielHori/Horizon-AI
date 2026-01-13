/**
 * useConversations - Hook pour gérer les conversations (V2.1)
 * Responsabilités:
 * - Lister les conversations
 * - Supprimer une conversation
 * - Filtrer par modèle actif
 * - Filtrer par projet actif (V2.1 : Sprint 2.2)
 * - Gérer l'état de l'historique (ouvert/fermé)
 */
import { useState, useEffect, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';

export const useConversations = (activeModel, activeProjectId = null) => {
  const [conversations, setConversations] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Fetch conversations (V2.1 : Filtrer par projet ET modèle)
  const fetchConversations = useCallback(async () => {
    try {
      const res = await requestWorker("list_conversations");
      const all = Array.isArray(res) ? res : [];
      
      // Filtrer par modèle (comportement existant)
      let filtered = activeModel
        ? all.filter(c => c.model === activeModel || !c.model)
        : all;
      
      // V2.1 Sprint 2.2 : Filtrer par projet actif si fourni
      if (activeProjectId) {
        filtered = filtered.filter(c => c.projectId === activeProjectId);
      } else {
        // Si aucun projet actif, afficher les conversations sans projet (orphelines)
        filtered = filtered.filter(c => !c.projectId);
      }
      
      setConversations(filtered);
    } catch (e) {
      console.error(e);
    }
  }, [activeModel, activeProjectId]);

  // Charger les conversations au changement de modèle
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Supprimer une conversation
  const deleteConversation = useCallback(async (chatId) => {
    try {
      await requestWorker("delete_conversation", { chat_id: chatId });
      await fetchConversations();
      return true;
    } catch (e) {
      console.error("Delete conversation error:", e);
      await fetchConversations();
      return false;
    }
  }, [fetchConversations]);

  return {
    conversations,
    isHistoryOpen,
    setIsHistoryOpen,
    fetchConversations,
    deleteConversation
  };
};
