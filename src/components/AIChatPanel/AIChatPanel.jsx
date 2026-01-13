/**
 * AIChatPanel - Composant orchestrateur principal
 * 
 * Responsabilités:
 * - Orchestrer les hooks de logique
 * - Coordonner les sous-composants UI
 * - Gérer les interactions entre les différentes parties
 * 
 * Style: Dark, Premium, Glass (Horizon AI)
 * Aucun changement visuel ou UX par rapport à la version originale
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { translations } from '../../constants/translations';
import { PromptViewer } from '../PromptViewer';

// Hooks de logique
import { useChatMessages } from './hooks/useChatMessages';
import { useChatStreaming } from './hooks/useChatStreaming';
import { useConversations } from './hooks/useConversations';
import { useChatInput } from './hooks/useChatInput';
import { useRepository } from './hooks/useRepository';
import { useProjects } from './hooks/useProjects';

// Services
import { requestWorker } from '../../services/bridge';
import PermissionService from '../../services/permission_service';

// Sous-composants UI
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { DeleteModal } from './components/DeleteModal';

// V2.1 Phase 3 : Composants sécurité
import { SecurityNotification } from '../SecurityNotification';
import { PermissionRequestModal } from '../PermissionRequestModal';
import { PermissionBar } from '../PermissionBar';

const AIChatPanel = ({ selectedModel, setSelectedModel, chatId, setSelectedChatId, language = 'fr' }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.chat || translations.en.chat;

  // Modèle et chat ID actifs
  const activeModel = selectedModel;
  const activeChatId = chatId;

  // État local
  const [isTyping, setIsTyping] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);

  // V2.1 Phase 3 : État sécurité
  const [blockedAction, setBlockedAction] = useState(null);
  const [missingPermission, setMissingPermission] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [requestedPermission, setRequestedPermission] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);  // Message en attente après confirmation permission
  const [activePermissions, setActivePermissions] = useState({});  // État permissions actives (FileRead, FileWrite, etc.)

  // Hook: Gestion des projets (DOIT être appelé AVANT useConversations pour avoir activeProjectId)
  const {
    projects,
    activeProjectId,
    activeProject,
    loading: projectsLoading,
    fetchProjects,
    createProject,
    createProjectFromDialog,
    selectProject,
    updateProjectRepo,
    deleteProject
  } = useProjects(language);

  // Hook: Gestion des messages
  const {
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
  } = useChatMessages(activeChatId);

  // Hook: Gestion des conversations (V2.1 : Filtrer par projet actif)
  // activeProjectId doit être défini avant (via useProjects ci-dessus)
  const {
    conversations,
    isHistoryOpen,
    setIsHistoryOpen,
    fetchConversations,
    deleteConversation
  } = useConversations(activeModel, activeProjectId);  // V2.1 : Passer activeProjectId

  // V2.1 Phase 3 : Callback détection demande permission (DOIT être défini AVANT useChatStreaming)
  const handlePermissionRequestDetected = useCallback((permissionRequest) => {
    if (permissionRequest.isError) {
      // Erreur de permission : afficher notification blocage
      setBlockedAction(permissionRequest.blockedAction || (language === 'fr' ? 'Action bloquée' : 'Action blocked'));
      setMissingPermission(permissionRequest.permission);
    } else {
      // Demande de permission dans message : afficher modal confirmation
      setRequestedPermission(permissionRequest);
      setShowPermissionModal(true);
      // Conserver le message original pour après confirmation
      if (permissionRequest.originalMessage) {
        setPendingMessage(permissionRequest.originalMessage);
      }
    }
  }, [language]);

  // Hook: Gestion du streaming
  const {
    streamStartTime,
    setStreamStartTime,
    currentPrompt: streamingPrompt,
    setCurrentPrompt: setStreamingPrompt,
    handleStop
  } = useChatStreaming({
    activeModel,
    language,
    messages,
    updateLastMessage,
    setIsTyping,
    onPermissionError: handlePermissionRequestDetected  // V2.1 Phase 3 : Callback erreur permission
  });

  // Synchroniser le prompt du streaming
  useEffect(() => {
    if (streamingPrompt) {
      setCurrentPrompt(streamingPrompt);
    }
  }, [streamingPrompt]);

  // Hook: Gestion du repository (lié au projet actif)
  const {
    selectedRepo,
    analyzingRepo,
    repoAnalysis,
    handleSelectRepo,
    handleRemoveRepo,
    handleLoadRepoByPath  // V2.1 Sprint 2.2 : Pour rechargement automatique repos
  } = useRepository(language, (repoPath, analysis) => {
    // Mettre à jour le repo du projet actif
    if (activeProjectId) {
      updateProjectRepo(repoPath, analysis);
    }

    // Afficher un message de confirmation dans le chat
    addMessage({
      role: 'system',
      content: language === 'fr'
        ? `✅ Repository analysé: ${repoPath.split(/[/\\]/).pop()}\n${analysis.summary}`
        : `✅ Repository analyzed: ${repoPath.split(/[/\\]/).pop()}\n${analysis.summary}`,
      isSystem: true
    });
  });

  // V2.1 Sprint 2.2 : Synchroniser le repo avec le projet actif (repos[] au lieu de repoPath)
  useEffect(() => {
    // V2.1 : Le projet a maintenant repos[] (tableau) au lieu de repoPath (string)
    // Ne synchroniser que si autoLoadRepo = true et que le projet a des repos
    if (activeProject?.settings?.autoLoadRepo && activeProject?.repos && activeProject.repos.length > 0) {
      const firstRepo = activeProject.repos[0];
      // Recharger automatiquement le repo si différent ou absent
      if (!selectedRepo || selectedRepo !== firstRepo.path) {
        handleLoadRepoByPath(firstRepo.path, firstRepo.analysis || null).catch(err => {
          console.error('[V2.1] Failed to auto-load repo:', err);
        });
      } else if (selectedRepo === firstRepo.path && firstRepo.analysis && (!repoAnalysis || JSON.stringify(repoAnalysis) !== JSON.stringify(firstRepo.analysis))) {
        // Si le repo est déjà sélectionné mais qu'on n'a pas l'analyse (ou qu'elle est obsolète)
        // et qu'elle est en cache dans le projet, la charger
        handleLoadRepoByPath(firstRepo.path, firstRepo.analysis).catch(err => {
          console.error('[V2.1] Failed to reload repo analysis:', err);
        });
      }
    } else if (activeProject && (!activeProject.repos || activeProject.repos.length === 0) && selectedRepo) {
      // Si le projet n'a plus de repos ou autoLoadRepo = false, retirer le repo actuel
      // (seulement si pas en train d'analyser pour éviter interruption)
      if (!analyzingRepo) {
        handleRemoveRepo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, activeProject?.repos, activeProject?.settings?.autoLoadRepo, selectedRepo, analyzingRepo]); // Dépendances contrôlées

  // V2.1 Phase 3 : Charger l'état des permissions actives (recharger quand projet change)
  useEffect(() => {
    const loadActivePermissions = async () => {
      try {
        // Charger les permissions actives pour FileRead, FileWrite, RepoAnalyze
        // V2.1 Phase 3 : Vérifier avec le contexte projet actif (isolation par projet)
        const permissions = ['FileRead', 'FileWrite', 'RepoAnalyze'];
        const activePerms = {};

        for (const perm of permissions) {
          // V2.1 Phase 3 : Vérifier avec contexte projet si projet actif
          const hasPerm = activeProjectId
            ? await PermissionService.hasPermissionWithContext(perm, activeProjectId)
            : await PermissionService.hasPermission(perm);
          activePerms[perm] = hasPerm;
        }

        setActivePermissions(activePerms);
      } catch (error) {
        console.error('Failed to load active permissions:', error);
      }
    };

    loadActivePermissions();
  }, [activeProjectId]); // Recharger quand le projet actif change

  // Hook: Gestion de l'input
  const chatInput = useChatInput({
    activeModel,
    activeChatId,
    activeProjectId,  // V2.1 : Passer l'ID du projet actif
    language,
    isTyping,
    setIsTyping,
    selectedRepo,
    repoAnalysis,
    onMessageSent: ({ userMessage, image, assistantModel }) => {
      addMessages([
        { role: 'user', content: userMessage, image },
        { role: 'assistant', content: '', model: assistantModel, prompt_id: null }
      ]);
      resetAutoScroll();
    },
    onChatIdChanged: (newChatId) => {
      setSelectedChatId?.(newChatId);
      fetchConversations();
    },
    onPermissionRequestDetected: handlePermissionRequestDetected  // V2.1 Phase 3 : Callback détection permission
  });

  const {
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
  } = chatInput;

  // V2.1 Phase 3 : Callback demande permission depuis PermissionBar ou SecurityNotification
  // (Défini APRÈS useChatInput pour avoir accès à sendPendingMessage, setInput, inputRef)
  const handleRequestPermission = useCallback((permission) => {
    if (!permission) return;

    // Trouver la description de la permission
    const permissionDescriptions = {
      FileRead: language === 'fr' ? 'Accès en lecture aux fichiers' : 'Read access to files',
      FileWrite: language === 'fr' ? 'Accès en écriture aux fichiers' : 'Write access to files',
      RepoAnalyze: language === 'fr' ? 'Analyse de repository' : 'Repository analysis',
      CommandExecute: language === 'fr' ? 'Exécution de commandes système' : 'System command execution'
    };

    setRequestedPermission({
      permission,
      description: permissionDescriptions[permission] || permission
    });
    setShowPermissionModal(true);
  }, [language]);

  // V2.1 Phase 3 : Callback confirmation permission (depuis PermissionRequestModal)
  // (Défini APRÈS useChatInput pour avoir accès à sendPendingMessage, setInput, inputRef)
  const handleConfirmPermission = useCallback(async (permissionData) => {
    if (!permissionData) return;

    try {
      const { permission, scope, duration, projectId } = permissionData;

      // V2.1 Phase 3 : Utiliser la nouvelle API avec scope
      const granted = await PermissionService.requestPermissionWithScope(
        permission,
        `${permission} permission requested (scope: ${scope})`,
        scope,
        duration || null,
        projectId || activeProjectId || null
      );

      if (granted) {
        // Mettre à jour l'état local des permissions
        setActivePermissions(prev => ({
          ...prev,
          [permission]: true
        }));

        // Fermer le modal
        setShowPermissionModal(false);
        setRequestedPermission(null);

        // Si message en attente, l'envoyer maintenant via sendPendingMessage
        if (pendingMessage && sendPendingMessage) {
          sendPendingMessage(pendingMessage);
          setPendingMessage(null);
        } else if (pendingMessage) {
          // Fallback: Réinsérer manuellement dans l'input
          setInput(pendingMessage);
          setPendingMessage(null);
          // Déclencher l'envoi après un court délai
          setTimeout(() => {
            inputRef.current?.form?.requestSubmit();
          }, 100);
        }

        // Réinitialiser les notifications de blocage
        setBlockedAction(null);
        setMissingPermission(null);
      } else {
        // Permission refusée
        setShowPermissionModal(false);
        setRequestedPermission(null);
        setPendingMessage(null);
        // Afficher une notification d'erreur
        addMessage({
          role: 'system',
          content: language === 'fr'
            ? `❌ Permission ${permission} refusée`
            : `❌ Permission ${permission} denied`,
          isSystem: true
        });
      }
    } catch (error) {
      console.error('Failed to grant permission:', error);
      setShowPermissionModal(false);
      setRequestedPermission(null);
      setPendingMessage(null);
    }
  }, [language, pendingMessage, addMessage, activeProjectId, sendPendingMessage, setInput, inputRef]);

  // Reset au changement de modèle
  useEffect(() => {
    if (activeModel) {
      setSelectedChatId?.(null);
      clearMessages();
      fetchConversations();
    }
  }, [activeModel, setSelectedChatId, clearMessages, fetchConversations]);

  // Recharger les projets au montage
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Callback: Créer un nouveau projet
  const handleCreateProject = async () => {
    try {
      await createProjectFromDialog();
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Callback: Sélectionner un projet
  const handleSelectProject = async (projectId) => {
    try {
      // Arrêter le streaming en cours si présent
      if (isTyping) {
        handleStopStreaming();
      }

      // Sauvegarder le repo actuel avant changement
      const currentRepo = selectedRepo;

      // Sélectionner le projet (change le scope du contexte)
      // selectProject récupère le projet depuis le backend, met à jour activeProject ET projects
      await selectProject(projectId);

      // Recharger les projets pour obtenir conversationCount et toutes les données à jour
      await fetchProjects();

      // Récupérer le nouveau projet actif (activeProject est mis à jour par selectProject dans useProjects)
      // Attendre un tick pour que React synchronise l'état
      await new Promise(resolve => setTimeout(resolve, 50));
      const newProject = activeProject;

      // V2.1 Sprint 2.2 : Recharger automatiquement le contexte du projet
      // 1. Scope du projet (déjà fait via selectProject dans useProjects)
      // 2. Repos attachés (si autoLoadRepo = true) - géré par le useEffect plus bas
      // 3. Mémoire projet (memoryKeys[]) - chargée automatiquement par dispatcher lors du chat
      // 4. Permissions du projet - appliquées côté Rust (PermissionManager)

      // Réinitialiser le chat actif pour éviter les conflits de contexte
      setSelectedChatId?.(null);
      clearMessages();

      // Recharger les conversations (filtrées par le nouveau projet)
      fetchConversations();
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  };

  // Callback: Supprimer un projet
  const handleDeleteProject = async (projectId) => {
    try {
      // Si c'est le projet actif, réinitialiser
      if (activeProjectId === projectId) {
        // Retirer le repo si présent
        if (selectedRepo) {
          handleRemoveRepo();
        }

        setSelectedChatId?.(null);
        clearMessages();
      }

      await deleteProject(projectId);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Callback: Retirer le repo (mise à jour du projet)
  const handleRemoveRepoWithProject = () => {
    handleRemoveRepo();

    // Mettre à jour le projet pour retirer le repo
    if (activeProjectId) {
      updateProjectRepo(null);
    }
  };

  // Callback: Nouvelle conversation
  const handleNewChat = () => {
    setSelectedChatId(null);
    clearMessages();
  };

  // Callback: Sélectionner une conversation (V2.1 Sprint 2.2 : Rechargement contexte)
  const handleSelectChat = async (chatId) => {
    try {
      setSelectedChatId(chatId);

      // V2.1 Sprint 2.2 : Récupérer le projectId de la conversation depuis le backend
      // (pour être sûr d'avoir les données à jour)
      const metadataResult = await requestWorker("get_conversation_metadata", { chat_id: chatId });

      if (metadataResult?.success && metadataResult.metadata?.projectId) {
        const conversationProjectId = metadataResult.metadata.projectId;

        // Si la conversation a un projet, recharger le contexte du projet
        const project = projects.find(p => p.id === conversationProjectId);

        if (project && project.id !== activeProjectId) {
          // Si le projet est différent du projet actif, le sélectionner
          // Cela rechargera automatiquement le contexte (scope, repos, mémoire)
          await handleSelectProject(project.id);
        } else if (project && project.id === activeProjectId) {
          // Si le projet est déjà actif, recharger le contexte complet si nécessaire
          // (scope déjà correct, mais recharger repos/mémoire si autoLoadRepo = true)
          if (project.settings?.autoLoadRepo) {
            // Recharger repos si nécessaire
            if (project.repos && project.repos.length > 0) {
              const firstRepo = project.repos[0];
              if (!selectedRepo || selectedRepo !== firstRepo.path) {
                await handleLoadRepoByPath(firstRepo.path, firstRepo.analysis || null);
              }
            } else if (selectedRepo) {
              // Si pas de repos dans le projet mais qu'un repo est chargé, le retirer
              handleRemoveRepo();
            }

            // V2.1 Sprint 2.2 : La mémoire projet (memoryKeys[]) sera chargée automatiquement
            // lors de l'envoi de message via le système existant de memory_keys dans la commande "chat"
            // Les memoryKeys sont passées au prompt builder dans dispatcher.py
          }
        } else {
          // Projet non trouvé localement, le charger depuis le backend
          const projectResult = await requestWorker("projects_get", { project_id: conversationProjectId });
          if (projectResult?.success && projectResult.project) {
            await handleSelectProject(conversationProjectId);
          }
        }
      } else {
        // Conversation sans projet → créer/lier projet "Orphelin" automatique (V2.1 Sprint 2.2)
        try {
          // Récupérer ou créer le projet "Orphelin"
          const orphanResult = await requestWorker("projects_get_or_create_orphan", {
            language: language || "fr"
          });

          if (orphanResult?.success && orphanResult.project) {
            const orphanProject = orphanResult.project;

            // Recharger la liste des projets pour avoir le projet "Orphelin" à jour
            await fetchProjects();

            // Lier la conversation au projet "Orphelin"
            const updateResult = await requestWorker("update_conversation_project", {
              chat_id: chatId,
              project_id: orphanProject.id
            });

            if (updateResult?.success) {
              // Si le projet orphelin est différent du projet actif, le sélectionner
              // Cela rechargera automatiquement le contexte (scope, repos, mémoire)
              if (orphanProject.id !== activeProjectId) {
                await handleSelectProject(orphanProject.id);
              } else {
                // Si déjà actif, juste recharger les conversations pour voir la conversation liée
                fetchConversations();
              }
            }
          } else {
            console.warn('[V2.1] Failed to get/create orphan project:', orphanResult?.error);
          }
        } catch (orphanError) {
          console.error('[V2.1] Failed to create/link orphan project:', orphanError);
          // En cas d'erreur, continuer sans projet (comportement dégradé)
        }
      }
    } catch (error) {
      console.error('Failed to select chat:', error);
      // En cas d'erreur, continuer quand même (ne pas bloquer l'utilisateur)
      setSelectedChatId(chatId);
    }
  };

  // Callback: Supprimer une conversation
  const handleDeleteChat = (conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  // Callback: Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;

    const idToDelete = conversationToDelete.id;
    const wasCurrentChat = chatId === idToDelete;

    setShowDeleteModal(false);
    setConversationToDelete(null);

    await deleteConversation(idToDelete);

    if (wasCurrentChat) {
      setSelectedChatId(null);
      clearMessages();
    }
  };

  // Callback: Arrêter le streaming
  const handleStopStreaming = () => {
    handleStop();
  };

  // Callback: Afficher le prompt viewer
  const handleViewPrompt = () => {
    setShowPromptViewer(true);
  };

  // Callback: Réessayer le dernier message
  const handleRetryMessage = async () => {
    if (!lastUserMessage || isTyping || !activeModel) return;

    // Supprimer le dernier message d'erreur
    removeLastMessages(messages.at(-1)?.isError ? 2 : 1);

    // Réenvoyer le message
    setInput(lastUserMessage);
    setTimeout(() => {
      inputRef.current?.form?.requestSubmit();
    }, 100);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent">
      {/* Sidebar d'historique et projets */}
      <ChatSidebar
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        conversations={conversations}
        activeChatId={activeChatId}
        activeModel={activeModel}
        language={language}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        projects={projects}
        activeProjectId={activeProjectId}
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        t={t}
      />

      {/* Zone principale: Messages + Input */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* V2.1 Phase 3 : Barre de permissions contextuelle (visible si projet actif) */}
        {activeProject && (
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 pt-4 pb-2">
            <PermissionBar
              activeProject={activeProject}
              activePermissions={activePermissions}
              onRequestPermission={handleRequestPermission}
              language={language}
            />
          </div>
        )}

        {/* V2.1 Phase 3 : Notification de blocage (affichée en haut, avant messages) */}
        {blockedAction && missingPermission && (
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 pt-2 pb-4">
            <SecurityNotification
              blockedAction={blockedAction}
              missingPermission={missingPermission}
              onRequestPermission={() => handleRequestPermission(missingPermission)}
              onDismiss={() => {
                setBlockedAction(null);
                setMissingPermission(null);
              }}
              language={language}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            activeModel={activeModel}
            language={language}
            currentPrompt={currentPrompt}
            scrollRef={scrollRef}
            handleScroll={handleScroll}
            onRetry={handleRetryMessage}
            onStop={handleStopStreaming}
            onViewPrompt={handleViewPrompt}
            activeProject={activeProject}
            selectedRepo={selectedRepo}
          />
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          previewUrl={previewUrl}
          isTyping={isTyping}
          activeModel={activeModel}
          language={language}
          selectedRepo={selectedRepo}
          analyzingRepo={analyzingRepo}
          repoAnalysis={repoAnalysis}
          fileInputRef={fileInputRef}
          inputRef={inputRef}
          onImageSelect={handleImageSelect}
          onRemoveImage={removeImagePreview}
          onSelectRepo={handleSelectRepo}
          onRemoveRepo={handleRemoveRepoWithProject}
          onSubmit={handleSendMessage}
          t={t}
        />
      </div>

      {/* Modal de suppression */}
      <DeleteModal
        show={showDeleteModal}
        language={language}
        onClose={() => {
          setShowDeleteModal(false);
          setConversationToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Prompt Viewer */}
      {showPromptViewer && currentPrompt && (
        <PromptViewer
          promptData={currentPrompt}
          onClose={() => setShowPromptViewer(false)}
          language={language}
        />
      )}

      {/* V2.1 Phase 3 : Modal demande permission */}
      {showPermissionModal && requestedPermission && (
        <PermissionRequestModal
          permission={requestedPermission.permission}
          description={requestedPermission.description}
          activeProject={activeProject}
          defaultScope={activeProject ? 'project' : 'temporary'}
          defaultDuration={60}
          onConfirm={handleConfirmPermission}
          onCancel={() => {
            setShowPermissionModal(false);
            setRequestedPermission(null);
            setPendingMessage(null);
          }}
          language={language}
        />
      )}
    </div>
  );
};

export default AIChatPanel;
