import React, { useState } from 'react';
import {
  FolderOpen,
  Search,
  Code,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  FileText,
  Package,
  Wrench,
  Info,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  Folder,
  FolderTree
} from 'lucide-react';
import { requestWorker } from '../services/bridge';
import PermissionService from '../services/permission_service';
import { useTheme } from '../contexts/ThemeContext';
import { open } from '@tauri-apps/plugin-dialog';

const RepoAnalyzer = ({ language = 'fr', isDarkMode = true }) => {
  const { isDarkMode: themeDarkMode } = useTheme();
  const darkMode = isDarkMode !== undefined ? isDarkMode : themeDarkMode;

  const [repoPath, setRepoPath] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    structure: true,
    stack: true,
    summary: true,
    techDebt: false
  });
  const [expandedDirs, setExpandedDirs] = useState(new Set()); // V2: Dossiers développés dans l'arborescence
  const [showTreeView, setShowTreeView] = useState(false); // V2: Mode arborescent

  const ensureRepoPermission = async () => {
    const hasPermission = await PermissionService.hasPermission('RepoAnalyze');
    if (hasPermission) {
      return true;
    }
    const granted = await PermissionService.requestPermission(
      'RepoAnalyze',
      language === 'fr' ? 'Analyser un repository' : 'Analyze repository',
      language === 'fr' ? 'Analyse de repository' : 'Repository analysis'
    );
    return granted === true;
  };


  const text = {
    fr: {
      title: "ANALYSE DE REPOSITORY",
      subtitle: "Analyse architecturale en lecture seule",
      description: "Analysez la structure, la stack technique et les dettes techniques d'un repository. Toutes les analyses sont effectuées dans un sandbox sécurisé.",
      selectRepo: "Sélectionner un repository",
      analyze: "Analyser",
      analyzing: "Analyse en cours...",
      repoPath: "Chemin du repository",
      structure: "Structure",
      stack: "Stack technique",
      summary: "Résumé architectural",
      techDebt: "Dettes techniques",
      languages: "Langages",
      frameworks: "Frameworks",
      tools: "Outils",
      packageManagers: "Gestionnaires de paquets",
      totalFiles: "Total fichiers",
      totalSize: "Taille totale",
      directories: "Dossiers",
      filesByType: "Fichiers par type",
      filesByExtension: "Fichiers par extension",
      noTechDebt: "Aucune dette technique détectée",
      analyzedAt: "Analysé le",
      close: "Fermer",
      info: "L'analyse est effectuée dans un sandbox sécurisé. Aucune modification n'est apportée au repository original.",
      sandboxActive: "Sandbox actif",
      sandboxInactive: "Sandbox inactif",
      sandboxInfo: "L'analyse est effectuée dans une copie temporaire sécurisée du repository.",
      directories: "Dossiers",
      showStructure: "Afficher structure arborescente",
      collapseAll: "Tout réduire",
      expandAll: "Tout développer"
    },
    en: {
      title: "REPOSITORY ANALYSIS",
      subtitle: "Read-only architectural analysis",
      description: "Analyze the structure, tech stack, and technical debt of a repository. All analyses are performed in a secure sandbox.",
      selectRepo: "Select a repository",
      analyze: "Analyze",
      analyzing: "Analyzing...",
      repoPath: "Repository path",
      structure: "Structure",
      stack: "Tech stack",
      summary: "Architectural summary",
      techDebt: "Technical debt",
      languages: "Languages",
      frameworks: "Frameworks",
      tools: "Tools",
      packageManagers: "Package managers",
      totalFiles: "Total files",
      totalSize: "Total size",
      directories: "Directories",
      filesByType: "Files by type",
      filesByExtension: "Files by extension",
      noTechDebt: "No technical debt detected",
      analyzedAt: "Analyzed at",
      close: "Close",
      info: "Analysis is performed in a secure sandbox. No modifications are made to the original repository.",
      sandboxActive: "Sandbox active",
      sandboxInactive: "Sandbox inactive",
      sandboxInfo: "Analysis is performed in a secure temporary copy of the repository.",
      directories: "Directories",
      showStructure: "Show tree structure",
      collapseAll: "Collapse all",
      expandAll: "Expand all"
    }
  };

  const t = text[language] || text.en;

  const selectRepository = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === 'fr' ? "Sélectionner un repository" : "Select a repository"
      });
      
      if (selected && !Array.isArray(selected)) {
        setRepoPath(selected);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to select repository:', err);
      setError(err.message);
    }
  };

  const analyzeRepository = async () => {
    if (!repoPath.trim()) {
      setError("Please select a repository first");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const allowed = await ensureRepoPermission();
      if (!allowed) {
        setError(language === 'fr' ? 'Permission RepoAnalyze requise' : 'RepoAnalyze permission required');
        setAnalyzing(false);
        return;
      }
      const response = await requestWorker("analyze_repository", {
        repo_path: repoPath,
        max_depth: 10,
        max_files: 1000
      });

      if (response?.success) {
        setAnalysis(response.analysis);
      } else {
        setError(response?.error || "Failed to analyze repository");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // V2: Toggle dossier dans l'arborescence
  const toggleDirectory = (dirPath) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        newSet.add(dirPath);
      }
      return newSet;
    });
  };

  // V2: Rendre structure arborescente
  const renderTreeStructure = (directories) => {
    if (!directories || directories.length === 0) {
      return (
        <div className={`text-center py-8 ${darkMode ? 'opacity-40' : 'text-slate-500'}`}>
          <Info size={24} className="mx-auto mb-2" />
          <p className="text-xs">{language === 'fr' ? 'Aucun dossier à afficher' : 'No directories to display'}</p>
        </div>
      );
    }

    // Organiser les dossiers en arbre
    const tree = {};
    directories.forEach(dir => {
      const parts = dir.split(/[\\/]/).filter(p => p); // Filtrer les parties vides
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = { children: {}, path: parts.slice(0, index + 1).join('/') };
        }
        current = current[part].children;
      });
    });

    const renderNode = (node, name, path, depth = 0) => {
      const isExpanded = expandedDirs.has(path);
      const hasChildren = Object.keys(node.children || {}).length > 0;
      
      return (
        <div key={path || name} className="select-none">
          <div
            className={`flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
              darkMode ? 'text-white/70' : 'text-slate-700'
            }`}
            style={{ paddingLeft: `${depth * 1.5}rem` }}
            onClick={() => hasChildren && toggleDirectory(path)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={12} className="text-blue-400 flex-shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-blue-400 flex-shrink-0" />
              )
            ) : (
              <div className="w-3 flex-shrink-0" />
            )}
            <Folder size={14} className={`flex-shrink-0 ${hasChildren ? 'text-blue-400' : 'text-gray-400'}`} />
            <span className="text-xs font-mono truncate">{name || '/'}</span>
          </div>
          {hasChildren && isExpanded && (
            <div>
              {Object.entries(node.children).map(([childName, childNode]) =>
                renderNode(childNode, childName, childNode.path, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className={`p-4 rounded-xl max-h-96 overflow-y-auto ${darkMode ? 'bg-black/40' : 'bg-slate-50'}`}>
        {Object.entries(tree).map(([name, node]) => renderNode(node, name, node.path))}
      </div>
    );
  };

  return (
    <div className={`p-4 sm:p-6 md:p-8 lg:p-12 w-full h-full overflow-y-auto custom-scrollbar animate-page-entry transition-colors duration-500 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Barre prismatique arc-en-ciel */}
              <div 
                className="h-1 w-8 sm:w-12 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))'
                }}
              />
              <span className={`font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t.subtitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-tight">
              {t.title} <span className={`${darkMode ? 'opacity-30' : 'opacity-10'} italic font-light`}>Horizon</span>
            </h1>
          </div>
        </div>

        {/* Description */}
        <div className={`p-3 sm:p-4 rounded-2xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-start gap-2 sm:gap-3">
            <Info size={14} className="sm:w-4 sm:h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] sm:text-xs text-blue-500 mb-1">{t.info}</p>
              <p className={`text-[9px] sm:text-[10px] ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                {t.description}
              </p>
            </div>
          </div>
        </div>

        {/* Repository Selection */}
        <div className={`p-4 sm:p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className={`block text-xs font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                {t.repoPath}
              </label>
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder={t.selectRepo}
                className={`w-full px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
                  darkMode
                    ? 'bg-black/40 border border-white/20 text-white placeholder-white/30'
                    : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
            </div>
            <button
              onClick={selectRepository}
              className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase transition-all flex-shrink-0 ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.selectRepo}</span>
              <span className="sm:hidden">Select</span>
            </button>
            <button
              onClick={analyzeRepository}
              disabled={analyzing || !repoPath.trim()}
              className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all disabled:opacity-50 flex-shrink-0 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                  {t.analyze}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-2`}>
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className={`p-4 sm:p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className={`text-lg sm:text-xl font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.summary}
                  </h2>
                  {/* V2: Indicateur sandbox actif */}
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                    darkMode
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    <ShieldCheck size={10} />
                    {t.sandboxActive}
                  </span>
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase ${darkMode ? 'opacity-40' : 'text-slate-500'}`}>
                  {t.analyzedAt}: {new Date(analysis.analyzed_at).toLocaleString()}
                </span>
              </div>
              <div className={`p-3 sm:p-4 rounded-xl font-mono text-[10px] sm:text-xs whitespace-pre-wrap overflow-x-auto ${
                darkMode ? 'bg-black/40 text-gray-300' : 'bg-slate-50 text-slate-900'
              }`}>
                {analysis.summary}
              </div>
            </div>

            {/* Stack Card */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => toggleSection('stack')}
                className={`w-full flex items-center justify-between p-3 sm:p-4 transition-all ${
                  darkMode ? 'bg-black/40 hover:bg-black/60' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {expandedSections.stack ? (
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  ) : (
                    <ChevronRight className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                  <Code className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                  <span className={`font-black text-[10px] sm:text-xs uppercase tracking-wider truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.stack}
                  </span>
                </div>
              </button>

              {expandedSections.stack && (
                <div className={`p-4 sm:p-6 space-y-3 sm:space-y-4 ${darkMode ? 'bg-black/20' : 'bg-white'}`}>
                  {analysis.stack.languages && Object.keys(analysis.stack.languages).length > 0 && (
                    <div>
                      <h3 className={`text-xs sm:text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                        {t.languages}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {Object.entries(analysis.stack.languages).map(([lang, count]) => (
                          <span
                            key={lang}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-bold ${
                              darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {lang}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.stack.frameworks && analysis.stack.frameworks.length > 0 && (
                    <div>
                      <h3 className={`text-xs sm:text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                        {t.frameworks}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {analysis.stack.frameworks.map((fw) => (
                          <span
                            key={fw}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-bold ${
                              darkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {fw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.stack.tools && analysis.stack.tools.length > 0 && (
                    <div>
                      <h3 className={`text-xs sm:text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                        {t.tools}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {analysis.stack.tools.map((tool) => (
                          <span
                            key={tool}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-bold ${
                              darkMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                            }`}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.stack.package_managers && analysis.stack.package_managers.length > 0 && (
                    <div>
                      <h3 className={`text-xs sm:text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                        {t.packageManagers}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {analysis.stack.package_managers.map((pm) => (
                          <span
                            key={pm}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-xs font-bold ${
                              darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Structure Card */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => toggleSection('structure')}
                className={`w-full flex items-center justify-between p-3 sm:p-4 transition-all ${
                  darkMode ? 'bg-black/40 hover:bg-black/60' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {expandedSections.structure ? (
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  ) : (
                    <ChevronRight className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                  <span className={`font-black text-[10px] sm:text-xs uppercase tracking-wider truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.structure}
                  </span>
                </div>
                <div className={`text-[10px] font-bold uppercase ${darkMode ? 'opacity-40' : 'text-slate-500'}`}>
                  {analysis.file_count} {t.totalFiles} • {formatSize(analysis.total_size)}
                </div>
              </button>

              {expandedSections.structure && (
                <div className={`p-6 space-y-4 ${darkMode ? 'bg-black/20' : 'bg-white'}`}>
                  {/* V2: Statistiques visuelles */}
                  <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {analysis.file_count || 0}
                        </div>
                        <div className={`text-[10px] uppercase ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                          {t.totalFiles}
                        </div>
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {formatSize(analysis.total_size || 0)}
                        </div>
                        <div className={`text-[10px] uppercase ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                          {t.totalSize}
                        </div>
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {analysis.structure?.directories?.length || 0}
                        </div>
                        <div className={`text-[10px] uppercase ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                          {t.directories}
                        </div>
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                          {Object.keys(analysis.stack?.languages || {}).length}
                        </div>
                        <div className={`text-[10px] uppercase ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                          {t.languages}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* V2: Bouton toggle vue arborescente */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold uppercase ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                      {t.structure}
                    </h3>
                    <button
                      onClick={() => setShowTreeView(!showTreeView)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                        darkMode
                          ? 'bg-white/10 hover:bg-white/20'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <FolderTree size={14} />
                      {showTreeView ? t.filesByType : t.showStructure}
                    </button>
                  </div>

                  {/* V2: Vue arborescente ou par type */}
                  {showTreeView && analysis.structure?.directories ? (
                    <div>
                      {renderTreeStructure(analysis.structure.directories)}
                    </div>
                  ) : (
                    <>
                      {analysis.structure.files_by_type && Object.keys(analysis.structure.files_by_type).length > 0 && (
                        <div>
                          <h3 className={`text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                            {t.filesByType}
                          </h3>
                          <div className="space-y-2">
                            {Object.entries(analysis.structure.files_by_type).map(([type, files]) => (
                              <div key={type} className={`p-3 rounded-lg ${darkMode ? 'bg-black/40' : 'bg-slate-50'}`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {type}
                                  </span>
                                  <span className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                                    {files.length} {language === 'fr' ? 'fichiers' : 'files'}
                                  </span>
                                </div>
                                {/* V2: Barre de progression visuelle */}
                                <div className={`mt-2 h-1.5 rounded-full ${darkMode ? 'bg-black/60' : 'bg-slate-200'}`}>
                                  <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{
                                      width: `${(files.length / (analysis.file_count || 1)) * 100}%`
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* V2: Extensions avec compteurs */}
                      {analysis.structure.files_by_extension && Object.keys(analysis.structure.files_by_extension).length > 0 && (
                        <div className="mt-4">
                          <h3 className={`text-sm font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                            {t.filesByExtension}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(analysis.structure.files_by_extension)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 15)
                              .map(([ext, count]) => (
                                <div
                                  key={ext}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${
                                    darkMode
                                      ? 'bg-white/10 text-white/70 border border-white/10'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  <FileText size={12} />
                                  <span>{ext || 'no ext'}</span>
                                  <span className={`text-[10px] ${darkMode ? 'opacity-50' : 'text-slate-500'}`}>
                                    {count}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tech Debt Card */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => toggleSection('techDebt')}
                className={`w-full flex items-center justify-between p-4 transition-all ${
                  darkMode ? 'bg-black/40 hover:bg-black/60' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {expandedSections.techDebt ? (
                    <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className={`font-black text-xs uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.techDebt}
                  </span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${
                  analysis.tech_debt.length > 0 ? 'text-amber-400' : darkMode ? 'opacity-40' : 'text-slate-500'
                }`}>
                  {analysis.tech_debt.length} détectées
                </span>
              </button>

              {expandedSections.techDebt && (
                <div className={`p-6 ${darkMode ? 'bg-black/20' : 'bg-white'}`}>
                  {analysis.tech_debt.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-xs">{t.noTechDebt}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {analysis.tech_debt.map((debt, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${
                            darkMode
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                          title={language === 'fr' ? 'Cliquer pour voir les détails' : 'Click to view details'}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                            <span className="text-xs font-mono">{debt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoAnalyzer;
