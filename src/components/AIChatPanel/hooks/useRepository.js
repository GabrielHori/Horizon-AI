/**
 * useRepository - Hook pour gérer le repository sélectionné
 * Responsabilités:
 * - Sélectionner un repository
 * - Analyser automatiquement le repository
 * - Gérer l'état d'analyse
 * - Retirer le repository
 */
import { useState, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { requestWorker } from '../../../services/bridge';

export const useRepository = (language, onRepositoryAnalyzed) => {
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [repoAnalysis, setRepoAnalysis] = useState(null);
  
  // Référence pour stocker l'analyse actuelle pour comparaison (éviter re-render)
  const currentAnalysisRef = useRef(null);

  // Sélectionner un repository
  const handleSelectRepo = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === 'fr' ? "Sélectionner un repository" : "Select a repository"
      });

      if (selected && !Array.isArray(selected)) {
        setSelectedRepo(selected);
        // Analyser automatiquement le repository
        setAnalyzingRepo(true);
        try {
          const response = await requestWorker("analyze_repository", {
            repo_path: selected,
            max_depth: 5,
            max_files: 500
          });

          if (response?.success && response?.analysis) {
            setRepoAnalysis(response.analysis);
            currentAnalysisRef.current = response.analysis;
            // Notifier le parent pour afficher un message
            onRepositoryAnalyzed?.(selected, response.analysis);
          } else {
            console.error("Failed to analyze repository:", response?.error);
            currentAnalysisRef.current = null;
          }
        } catch (err) {
          console.error("Error analyzing repository:", err);
        } finally {
          setAnalyzingRepo(false);
        }
      }
    } catch (err) {
      console.error('Failed to select repository:', err);
    }
  };

  // Retirer le repository
  const handleRemoveRepo = () => {
    setSelectedRepo(null);
    setRepoAnalysis(null);
    currentAnalysisRef.current = null;
  };

  // V2.1 Sprint 2.2 : Forcer le rechargement d'un repo par path (sans dialog)
  const handleLoadRepoByPath = async (repoPath, newRepoAnalysis = null) => {
    try {
      // Si le repo est déjà chargé avec le même path, vérifier si analyse nécessaire
      if (selectedRepo === repoPath) {
        // Comparer avec l'analyse actuelle (utiliser ref si disponible, sinon état)
        const currentAnalysis = currentAnalysisRef.current || repoAnalysis;
        const currentAnalysisStr = currentAnalysis ? JSON.stringify(currentAnalysis) : null;
        const newAnalysisStr = newRepoAnalysis ? JSON.stringify(newRepoAnalysis) : null;
        
        // Si analyse fournie et différente de celle actuelle, mettre à jour
        if (newRepoAnalysis && currentAnalysisStr !== newAnalysisStr) {
          setRepoAnalysis(newRepoAnalysis);
          currentAnalysisRef.current = newRepoAnalysis;
          onRepositoryAnalyzed?.(repoPath, newRepoAnalysis);
        }
        // Sinon, déjà chargé correctement
        return;
      }

      setSelectedRepo(repoPath);
      
      // Si l'analyse est fournie (depuis le cache du projet), l'utiliser directement
      if (newRepoAnalysis) {
        setRepoAnalysis(newRepoAnalysis);
        currentAnalysisRef.current = newRepoAnalysis;
        onRepositoryAnalyzed?.(repoPath, newRepoAnalysis);
      } else {
        // Sinon, analyser automatiquement le repository
        setAnalyzingRepo(true);
        try {
          const response = await requestWorker("analyze_repository", {
            repo_path: repoPath,
            max_depth: 5,
            max_files: 500
          });

          if (response?.success && response?.analysis) {
            setRepoAnalysis(response.analysis);
            currentAnalysisRef.current = response.analysis;
            onRepositoryAnalyzed?.(repoPath, response.analysis);
          } else {
            console.error("Failed to analyze repository:", response?.error);
            setRepoAnalysis(null);
            currentAnalysisRef.current = null;
          }
        } catch (err) {
          console.error("Error analyzing repository:", err);
          setRepoAnalysis(null);
          currentAnalysisRef.current = null;
        } finally {
          setAnalyzingRepo(false);
        }
      }
    } catch (err) {
      console.error('Failed to load repository by path:', err);
      setAnalyzingRepo(false);
    }
  };

  return {
    selectedRepo,
    analyzingRepo,
    repoAnalysis,
    handleSelectRepo,
    handleRemoveRepo,
    handleLoadRepoByPath  // V2.1 Sprint 2.2 : Nouvelle fonction
  };
};
