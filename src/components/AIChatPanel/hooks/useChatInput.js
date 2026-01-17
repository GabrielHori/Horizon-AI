/**
 * useChatInput - Hook pour gérer l'input utilisateur (V2.1 Phase 3 : Détection permissions)
 * Responsabilités:
 * - Gérer l'état de l'input
 * - Gérer la prévisualisation d'image
 * - Gérer l'envoi de messages
 * - Focus automatique
 * - V2.1 Phase 3 : Détecter demandes de permission dans les messages
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';
import { detectPermissionRequest } from '../../../services/permission_detector';

export const useChatInput = ({
  activeModel,
  activeChatId,
  activeProjectId,  // V2.1 : ID du projet actif
  language,
  isTyping,
  setIsTyping,
  selectedRepo,
  repoAnalysis,
  useWeb,
  webAvailable,
  onMessageSent,
  onChatIdChanged,
  onPermissionRequestDetected  // V2.1 Phase 3 : Callback pour demande permission détectée
}) => {
  const [input, setInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Focus sur l'input après envoi
  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  // Gérer l'upload d'image
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Supprimer l'image preview
  const removeImagePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // V2.1 Phase 3 : Helpers pour extraire informations depuis erreurs de permission
  const extractPermissionFromError = useCallback((errorMessage) => {
    if (!errorMessage) return 'Unknown';
    const lower = errorMessage.toLowerCase();
    if (lower.includes('fileread') || lower.includes('read')) return 'FileRead';
    if (lower.includes('filewrite') || lower.includes('write')) return 'FileWrite';
    if (lower.includes('repoanalyze') || lower.includes('repo')) return 'RepoAnalyze';
    if (lower.includes('commandexecute') || lower.includes('command')) return 'CommandExecute';
    return 'Unknown';
  }, []);

  const getPermissionDescriptionFromError = useCallback((errorMessage, lang) => {
    const permission = extractPermissionFromError(errorMessage);
    const descriptions = {
      fr: {
        FileRead: 'Lecture de fichiers',
        FileWrite: 'Écriture de fichiers',
        RepoAnalyze: 'Analyse de repository',
        CommandExecute: 'Exécution de commandes',
        Unknown: 'Permission inconnue'
      },
      en: {
        FileRead: 'Reading files',
        FileWrite: 'Writing files',
        RepoAnalyze: 'Repository analysis',
        CommandExecute: 'Command execution',
        Unknown: 'Unknown permission'
      }
    };
    return descriptions[lang]?.[permission] || permission;
  }, [extractPermissionFromError]);

  const extractActionFromError = useCallback((errorMessage) => {
    if (!errorMessage) return language === 'fr' ? 'Action bloquée' : 'Action blocked';
    // Extraire l'action depuis le message d'erreur
    // Format typique : "Permission FileRead is required for: {action}"
    const match = errorMessage.match(/for:\s*(.+?)(?:$|\n)/i);
    return match ? match[1].trim() : (language === 'fr' ? 'Action bloquée' : 'Action blocked');
  }, [language]);

  // Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !activeModel) return;

    const userMessage = input.trim();
    
    // V2.1 Phase 3 : Détecter demande de permission dans le message
    const permissionRequest = detectPermissionRequest(userMessage, language);
    
    if (permissionRequest.detected && onPermissionRequestDetected) {
      // Demande de permission détectée : afficher modal de confirmation
      // Ne pas envoyer le message immédiatement, attendre confirmation utilisateur
      onPermissionRequestDetected({
        permission: permissionRequest.permission,
        description: permissionRequest.description,
        originalMessage: userMessage  // Conserver le message original pour après confirmation
      });
      return; // Arrêter ici, ne pas envoyer le message
    }

    setLastUserMessage(userMessage);

    // Réinitialiser l'input et la preview AVANT d'appeler onMessageSent
    const imageToSend = previewUrl;
    setInput('');
    removeImagePreview();
    setIsTyping(true);

    // Ajouter les messages (user + assistant vide)
    onMessageSent({
      userMessage,
      image: imageToSend,
      assistantModel: activeModel
    });

    try {
      // Préparer le contexte du repository si sélectionné et analysé
      const repoContext = selectedRepo && repoAnalysis ? {
        summary: repoAnalysis.summary || "",
        stack: repoAnalysis.stack || {},
        structure: {
          total_files: repoAnalysis.file_count || 0,
          languages: Object.keys(repoAnalysis.stack?.languages || {})
        }
      } : null;

      const res = await requestWorker("chat", {
        model: activeModel,
        prompt: userMessage,
        chat_id: activeChatId || null,
        project_id: activeProjectId || null,  // V2.1 : Lier la conversation au projet
        language: language || "en",
        repo_context: repoContext,
        ...(useWeb && webAvailable ? { web_query: userMessage, web_max_results: 5 } : {})
      });

      if (res?.chat_id && !activeChatId) {
        onChatIdChanged?.(res.chat_id);
      }
    } catch (error) {
      setIsTyping(false);
      // V2.1 Phase 3 : Détecter erreurs de permission dans la réponse
      const errorMessage = error.message || error.toString();
      if (errorMessage && (errorMessage.includes('Permission') || errorMessage.includes('permission'))) {
        // Erreur de permission : notifier le parent pour afficher SecurityNotification
        onPermissionRequestDetected?.({
          permission: extractPermissionFromError(errorMessage),
          description: getPermissionDescriptionFromError(errorMessage, language),
          isError: true,
          blockedAction: extractActionFromError(errorMessage)
        });
      }
      // L'erreur sera également gérée par le hook de streaming
      console.error('Send message error:', error);
    }
  };

  // Réessayer le dernier message
  const handleRetry = useCallback(() => {
    if (!lastUserMessage || isTyping || !activeModel) return;
    setInput(lastUserMessage);
    setTimeout(() => {
      inputRef.current?.form?.requestSubmit();
    }, 100);
  }, [lastUserMessage, isTyping, activeModel]);

  // V2.1 Phase 3 : Fonction pour envoyer un message en attente (après confirmation permission)
  const sendPendingMessage = useCallback((message) => {
    if (!message || !message.trim()) return;
    setInput(message);
    // Déclencher l'envoi après un court délai pour que l'input soit mis à jour
    setTimeout(() => {
      if (inputRef.current?.form) {
        inputRef.current.form.requestSubmit();
      }
    }, 100);
  }, []);

  return {
    input,
    setInput,
    previewUrl,
    lastUserMessage,
    fileInputRef,
    inputRef,
    handleImageSelect,
    removeImagePreview,
    handleSendMessage,
    handleRetry,
    sendPendingMessage  // V2.1 Phase 3 : Fonction pour envoyer message en attente
  };
};
