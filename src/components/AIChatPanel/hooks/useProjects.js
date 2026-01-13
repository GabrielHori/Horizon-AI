/**
 * useProjects - Hook pour gérer les projets (V2.1 - Backend persisté)
 * Responsabilités:
 * - Lister les projets depuis le backend (ProjectService)
 * - Créer un nouveau projet (persistant, UUID v4)
 * - Sélectionner un projet actif
 * - Supprimer un projet
 * - Gérer le scope du projet (dossier de travail)
 * - Gérer les repos attachés au projet (repos[])
 * - Gérer les clés mémoire du projet (memoryKeys[])
 * 
 * V2.1 : Nouvelle structure projet
 * {
 *   id: string (UUID v4, unique)
 *   name: string (créé explicitement par l'utilisateur)
 *   description?: string
 *   scopePath?: string (dossier de travail, peut être null)
 *   repos: [{ path: string, analysis?: {...}, attachedAt: string }]
 *   memoryKeys: string[]
 *   permissions: { read: boolean, write: boolean, custom?: {...} }
 *   createdAt: string (ISO date)
 *   updatedAt: string (ISO date)
 *   lastAccessedAt: string (ISO date)
 *   conversationCount: number (calculé dynamiquement)
 *   settings?: { defaultModel?, autoLoadRepo?, contextMode? }
 * }
 */
import { useState, useEffect, useCallback } from 'react';
import { requestWorker } from '../../../services/bridge';
import ContextService from '../../../services/context_service';

export const useProjects = (language = 'fr') => {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // Charger les projets depuis le backend (V2.1)
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Appeler le backend pour lister tous les projets persistants
      const result = await requestWorker("projects_list");
      
      if (result?.success && result.projects) {
        const loadedProjects = result.projects;
        setProjects(loadedProjects);
        
        // Si pas de projet actif, utiliser le premier (ou le plus récemment accédé)
        if (!activeProjectId && loadedProjects.length > 0) {
          const firstProject = loadedProjects[0]; // Déjà trié par lastAccessedAt
          setActiveProjectId(firstProject.id);
          setActiveProject(firstProject);
          
          // Définir le scope du contexte si le projet a un scopePath
          if (firstProject.scopePath) {
            await ContextService.setContextScope(firstProject.scopePath);
          }
        } else if (activeProjectId) {
          // Mettre à jour le projet actif depuis les données chargées
          const found = loadedProjects.find(p => p.id === activeProjectId);
          if (found) {
            setActiveProject(found);
          } else if (loadedProjects.length > 0) {
            // Si le projet actif n'existe plus, utiliser le premier
            const firstProject = loadedProjects[0];
            setActiveProjectId(firstProject.id);
            setActiveProject(firstProject);
            if (firstProject.scopePath) {
              await ContextService.setContextScope(firstProject.scopePath);
            }
          } else {
            setActiveProjectId(null);
            setActiveProject(null);
          }
        }
      } else {
        // Aucun projet sauvegardé
        setProjects([]);
        if (activeProjectId) {
          // Si on avait un projet actif mais qu'il n'existe plus, le retirer
          setActiveProjectId(null);
          setActiveProject(null);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []); // Charger sans dépendances pour éviter les boucles infinies

  // Charger les projets au montage
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger uniquement au montage

  // Créer un nouveau projet (V2.1 : via backend, UUID v4)
  const createProject = useCallback(async (scopePath, projectName = null, description = null) => {
    try {
      setLoading(true);
      
      // 1. Définir le scope du contexte si fourni
      if (scopePath) {
        await ContextService.setContextScope(scopePath);
      }
      
      // 2. Générer un nom si non fourni
      const name = projectName || (scopePath 
        ? scopePath.split(/[/\\]/).pop() || (language === 'fr' ? 'Nouveau projet' : 'New project')
        : (language === 'fr' ? 'Nouveau projet' : 'New project'));
      
      // 3. Créer le projet via le backend (UUID généré côté backend)
      const result = await requestWorker("projects_create", {
        name,
        description,
        scopePath: scopePath || null,
        permissions: {
          read: true,
          write: false
        }
      });
      
      if (result?.success && result.project) {
        const newProject = result.project;
        
        // 4. Mettre à jour l'état local
        setProjects(prev => [...prev, newProject]);
        
        // 5. Définir comme projet actif
        setActiveProjectId(newProject.id);
        setActiveProject(newProject);
        
        return newProject;
      } else {
        throw new Error(result?.error || 'Failed to create project');
      }
      
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Sélectionner un projet actif (V2.1 : rechargement automatique contexte)
  const selectProject = useCallback(async (projectId) => {
    try {
      setLoading(true);
      
      // 1. Récupérer le projet depuis le backend (mise à jour lastAccessedAt)
      const result = await requestWorker("projects_get", { project_id: projectId });
      
      if (!result?.success || !result.project) {
        console.error('Project not found:', projectId);
        return;
      }
      
      const project = result.project;
      
      // 2. Définir le scope du contexte si le projet a un scopePath
      if (project.scopePath) {
        await ContextService.setContextScope(project.scopePath);
      }
      
      // 3. Mettre à jour le projet actif
      setActiveProjectId(projectId);
      setActiveProject(project);
      
      // 4. Mettre à jour la liste des projets ET activeProject
      setProjects(prev => {
        const filtered = prev.filter(p => p.id !== projectId);
        const updated = [project, ...filtered]; // Mettre le projet sélectionné en premier
        return updated;
      });
      
      // Mettre à jour activeProject avec le projet complet depuis le backend
      setActiveProject(project);
      
      // V2.1 Sprint 2.2 : Le scope est déjà défini (étape 2)
      // Les repos et la mémoire seront rechargés dans AIChatPanel.handleSelectProject
      // pour éviter les dépendances circulaires ici
      
    } catch (error) {
      console.error('Failed to select project:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour le repo attaché au projet actif (V2.1 : repos[] au lieu de repoPath)
  const updateProjectRepo = useCallback(async (repoPath, repoAnalysis = null) => {
    if (!activeProjectId) return;
    
    try {
      // Si repoPath est null, retirer tous les repos (ou le dernier)
      if (!repoPath) {
        // Retirer tous les repos du projet
        const result = await requestWorker("projects_update", {
          project_id: activeProjectId,
          updates: { repos: [] }
        });
        
        if (result?.success && result.project) {
          setActiveProject(result.project);
          setProjects(prev => prev.map(p => 
            p.id === activeProjectId ? result.project : p
          ));
        }
      } else {
        // Ajouter ou mettre à jour le repo dans le projet
        const result = await requestWorker("projects_add_repo", {
          project_id: activeProjectId,
          repo_path: repoPath,
          analysis: repoAnalysis || null
        });
        
        if (result?.success && result.project) {
          setActiveProject(result.project);
          setProjects(prev => prev.map(p => 
            p.id === activeProjectId ? result.project : p
          ));
        }
      }
    } catch (error) {
      console.error('Failed to update project repo:', error);
    }
  }, [activeProjectId]);

  // Supprimer un projet (V2.1 : via backend, nettoie mémoire + conversations)
  const deleteProject = useCallback(async (projectId) => {
    try {
      setLoading(true);
      
      // Supprimer via le backend (nettoie automatiquement mémoire + conversations)
      const result = await requestWorker("projects_delete", { project_id: projectId });
      
      if (result?.success) {
        // Retirer le projet de la liste locale
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
          // Si c'est le projet actif, utiliser le premier projet restant ou null
        if (activeProjectId === projectId) {
          setProjects(prev => {
            const updatedProjects = prev.filter(p => p.id !== projectId);
            if (updatedProjects.length > 0) {
              const firstProject = updatedProjects[0];
              setActiveProjectId(firstProject.id);
              setActiveProject(firstProject);
              if (firstProject.scopePath) {
                ContextService.setContextScope(firstProject.scopePath).catch(err => 
                  console.error('Failed to set context scope:', err)
                );
              }
            } else {
              setActiveProjectId(null);
              setActiveProject(null);
            }
            return updatedProjects;
          });
        } else {
          // Mettre à jour la liste même si ce n'est pas le projet actif
          setProjects(prev => prev.filter(p => p.id !== projectId));
        }
        
        return true;
      } else {
        throw new Error(result?.error || 'Failed to delete project');
      }
      
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  // Créer un projet depuis un dossier sélectionné (dialog)
  const createProjectFromDialog = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === 'fr' 
          ? "Sélectionner un dossier de projet" 
          : "Select a project folder"
      });

      if (selected && !Array.isArray(selected)) {
        return await createProject(selected);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create project from dialog:', error);
      throw error;
    }
  }, [language, createProject]);

  return {
    projects,
    activeProjectId,
    activeProject,
    loading,
    fetchProjects,
    createProject,
    createProjectFromDialog,
    selectProject,
    updateProjectRepo,
    deleteProject
  };
};
