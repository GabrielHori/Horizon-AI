import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Eye,
  Settings,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  AlertTriangle,
  Info,
  RefreshCw,
  FolderOpen,
  File,
  List,
  Grid,
  ArrowLeft,
  CheckCircle,
  Lock,
  Download
} from 'lucide-react';
import ContextService from '../services/context_service';
import PermissionService from '../services/permission_service';
import { useTheme } from '../contexts/ThemeContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ContextPanel = ({ language = 'fr', isDarkMode = true }) => {
  const { isDarkMode: themeDarkMode } = useTheme();
  const darkMode = isDarkMode !== undefined ? isDarkMode : themeDarkMode;

  // State management
  const [scopePath, setScopePath] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewData, setPreviewData] = useState(null); // V2: preview + token
  const [confirmationToken, setConfirmationToken] = useState(null); // V2: token de confirmation
  const [fullContent, setFullContent] = useState(null); // V2: contenu complet après confirmation
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFullContent, setLoadingFullContent] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // V2: modal de confirmation
  const [newExtension, setNewExtension] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchTerm, setSearchTerm] = useState('');

  const text = {
    fr: {
      title: "CONTEXTE LOCAL",
      subtitle: "Gestion des fichiers de projet",
      description: "Sélectionnez un dossier de projet pour accéder à son contenu de manière sécurisée.",
      scopePlaceholder: "Chemin du dossier de projet...",
      setScope: "Définir le dossier",
      scanFiles: "Scanner les fichiers",
      noScope: "Aucun dossier de projet sélectionné",
      noFiles: "Aucun fichier trouvé",
      file: "Fichier",
      size: "Taille",
      extension: "Extension",
      preview: "Preview",
      settings: "Paramètres",
      allowedExtensions: "Extensions autorisées",
      maxFileSize: "Taille max par fichier",
      currentScope: "Dossier actuel",
      addExtension: "Ajouter une extension",
      remove: "Supprimer",
      refresh: "Actualiser",
      close: "Fermer",
      save: "Sauvegarder",
      cancel: "Annuler",
      error: "Erreur",
      success: "Succès",
      fileContent: "Contenu du fichier",
      lines: "lignes",
      back: "Retour",
      viewMode: "Mode d'affichage",
      searchPlaceholder: "Rechercher des fichiers...",
      info: "Le module de contexte local permet d'accéder aux fichiers de votre projet de manière sécurisée. Toutes les opérations sont journalisées et nécessitent des permissions explicites.",
      readFullFile: "Lire le fichier complet",
      confirmReadTitle: "Confirmation de lecture",
      confirmReadMessage: "Vous êtes sur le point de lire le fichier complet. Cette action nécessite une permission explicite.",
      confirm: "Confirmer",
      cancel: "Annuler",
      permissionRequired: "Permission requise",
      tokenInfo: "Token de confirmation (expire dans 5 minutes)"
    },
    en: {
      title: "LOCAL CONTEXT",
      subtitle: "Project files management",
      description: "Select a project folder to access its content securely.",
      scopePlaceholder: "Project folder path...",
      setScope: "Set folder",
      scanFiles: "Scan files",
      noScope: "No project folder selected",
      noFiles: "No files found",
      file: "File",
      size: "Size",
      extension: "Extension",
      preview: "Preview",
      settings: "Settings",
      allowedExtensions: "Allowed extensions",
      maxFileSize: "Max file size",
      currentScope: "Current folder",
      addExtension: "Add extension",
      remove: "Remove",
      refresh: "Refresh",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      error: "Error",
      success: "Success",
      fileContent: "File content",
      lines: "lines",
      back: "Back",
      viewMode: "View mode",
      searchPlaceholder: "Search files...",
      info: "The local context module allows secure access to your project files. All operations are logged and require explicit permissions.",
      readFullFile: "Read full file",
      confirmReadTitle: "Read confirmation",
      confirmReadMessage: "You are about to read the complete file. This action requires explicit permission.",
      confirm: "Confirm",
      cancel: "Cancel",
      permissionRequired: "Permission required",
      tokenInfo: "Confirmation token (expires in 5 minutes)"
    }
  }[language];

  // Load initial configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await ContextService.getContextConfig();
      setConfig(config);
      setScopePath(config.currentScope || '');
      setError(null);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetScope = async () => {
    if (!scopePath.trim()) {
      setError(language === 'fr' ? 'Veuillez spécifier un chemin' : 'Please specify a path');
      return;
    }

    try {
      setLoading(true);
      await ContextService.setContextScope(scopePath);
      await loadConfig();
      setError(null);
    } catch (err) {
      console.error('Failed to set scope:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanFiles = async () => {
    if (!config?.currentScope) {
      setError(language === 'fr' ? 'Aucun dossier de projet défini' : 'No project folder defined');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const scannedFiles = await ContextService.scanDirectory(config.currentScope, false);
      setFiles(scannedFiles);
    } catch (err) {
      console.error('Failed to scan files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // V2: Workflow preview → confirmation → lecture complète
  const handleFileSelect = async (filePath) => {
    try {
      setLoading(true);
      setError(null);
      setFullContent(null); // Réinitialiser le contenu complet

      // 1. Toujours commencer par preview (pas de permission requise)
      const result = await ContextService.getFilePreview(filePath, 50);
      
      // Le résultat contient {preview: {...}, confirmation_token: "..."}
      setSelectedFile(filePath);
      setPreviewData(result);
      setPreview(result.preview); // Pour compatibilité
      setConfirmationToken(result.confirmation_token);
    } catch (err) {
      console.error('Failed to preview file:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // V2: Demander la lecture complète après confirmation
  const handleRequestFullContent = async () => {
    if (!selectedFile || !confirmationToken) {
      setError(language === 'fr' ? 'Token de confirmation manquant' : 'Missing confirmation token');
      return;
    }

    // Vérifier la permission
    const hasPermission = await PermissionService.hasPermission('FileRead');
    if (!hasPermission) {
      // Demander la permission via UI
      setShowConfirmModal(true);
      return;
    }

    // Si permission déjà accordée, lire directement
    await readFullFile();
  };

  // V2: Lire le fichier complet après confirmation
  const readFullFile = async () => {
    if (!selectedFile || !confirmationToken) return;

    try {
      setLoadingFullContent(true);
      setError(null);

      // 2. Lire le fichier complet avec token de confirmation + permission
      const fullContent = await ContextService.readFileConfirmed(selectedFile, confirmationToken);
      setFullContent(fullContent);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to read full file:', err);
      setError(err.message);
      setShowConfirmModal(false);
    } finally {
      setLoadingFullContent(false);
    }
  };

  // V2: Confirmer la lecture avec permission
  const handleConfirmRead = async () => {
    try {
      // Demander la permission si nécessaire
      const hasPermission = await PermissionService.hasPermission('FileRead');
      if (!hasPermission) {
        const granted = await PermissionService.requestPermission(
          'FileRead',
          `Reading file: ${selectedFile}`,
          'Full file content access'
        );
        if (!granted) {
          setError(language === 'fr' ? 'Permission refusée' : 'Permission denied');
          setShowConfirmModal(false);
          return;
        }
      }

      // Lire le fichier complet
      await readFullFile();
    } catch (err) {
      console.error('Failed to confirm read:', err);
      setError(err.message);
      setShowConfirmModal(false);
    }
  };

  const handleAddExtension = async () => {
    if (!newExtension.trim()) return;

    try {
      setLoading(true);
      await ContextService.addAllowedExtension(newExtension.trim());
      await loadConfig();
      setNewExtension('');
      setError(null);
    } catch (err) {
      console.error('Failed to add extension:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtension = async (extension) => {
    try {
      setLoading(true);
      await ContextService.removeAllowedExtension(extension);
      await loadConfig();
      setError(null);
    } catch (err) {
      console.error('Failed to remove extension:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file =>
    file.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (filePath) => {
    const ext = ContextService.getFileExtension(filePath);
    switch (ext) {
      case 'py': return <FileText size={16} className="text-blue-400" />;
      case 'js': return <FileText size={16} className="text-yellow-400" />;
      case 'ts': return <FileText size={16} className="text-blue-500" />;
      case 'md': return <FileText size={16} className="text-gray-400" />;
      case 'json': return <FileText size={16} className="text-amber-400" />;
      case 'toml': return <FileText size={16} className="text-red-400" />;
      case 'yaml': return <FileText size={16} className="text-purple-400" />;
      case 'yml': return <FileText size={16} className="text-purple-400" />;
      case 'txt': return <FileText size={16} className="text-green-400" />;
      default: return <File size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className={`p-6 rounded-[24px] border ${darkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Folder className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">{text.title}</h2>
            <p className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>{text.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-500 mb-1">{text.info}</p>
            <p className={`text-[10px] ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
              {text.description}
            </p>
          </div>
        </div>
      </div>

      {/* Scope Selection */}
      <div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-black/20 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}>
        <div className="flex items-center gap-3 mb-3">
          <FolderOpen size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
          <span className="text-xs font-bold">{text.currentScope}:</span>
          <span className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
            {config?.currentScope || (language === 'fr' ? 'Aucun' : 'None')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={text.scopePlaceholder}
              value={scopePath}
              onChange={(e) => setScopePath(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${darkMode ? 'bg-black/40 border border-white/20 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
            />
          </div>

          <button
            onClick={handleSetScope}
            disabled={loading || !scopePath.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 border-white rounded-full mr-2"></span>
                {text.setScope}...
              </>
            ) : (
              text.setScope
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} />
            <span className="text-xs font-bold">{text.error}: {error}</span>
          </div>
        </div>
      )}

      {/* Files List or Selected File */}
      {selectedFile ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{text.fileContent}</h3>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                setPreviewData(null);
                setFullContent(null);
                setConfirmationToken(null);
              }}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
            >
              <ArrowLeft size={14} />
              {text.back}
            </button>
          </div>

          {/* V2: Informations fichier améliorées */}
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {getFileIcon(selectedFile)}
              <span className="text-sm font-medium">{ContextService.getFileName(selectedFile)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'}`}>
                {ContextService.getFileExtension(selectedFile).toUpperCase()}
              </span>
              <span className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-500'}`}>
                {ContextService.formatFileSize(preview?.size || previewData?.preview?.size || 0)}
              </span>
              <span className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-500'}`}>
                {preview?.line_count || previewData?.preview?.line_count || 0} {text.lines}
              </span>
              {confirmationToken && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  <Lock size={10} className="inline mr-1" />
                  {text.tokenInfo}
                </span>
              )}
            </div>

            {/* V2: Preview avec syntaxe highlighting */}
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-black/30 border-white/5' : 'bg-white border-slate-100'}`}>
              <div className="mb-2">
                <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-white/40' : 'text-slate-500'}`}>
                  {fullContent ? text.fileContent : 'Preview (50 premières lignes)'}
                </span>
              </div>
              
              {loadingFullContent ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className={`w-5 h-5 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`ml-2 text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Chargement du fichier complet...' : 'Loading full file...'}
                  </span>
                </div>
              ) : fullContent ? (
                <div className="relative">
                  <SyntaxHighlighter
                    language={ContextService.getFileExtension(selectedFile) || 'text'}
                    style={darkMode ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      fontSize: '0.75rem',
                      lineHeight: '1.5'
                    }}
                    showLineNumbers
                  >
                    {fullContent.content || ''}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="relative">
                  <SyntaxHighlighter
                    language={ContextService.getFileExtension(selectedFile) || 'text'}
                    style={darkMode ? oneDark : oneLight}
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      fontSize: '0.75rem',
                      lineHeight: '1.5'
                    }}
                    showLineNumbers
                  >
                    {preview?.preview || previewData?.preview?.preview || (language === 'fr' ? 'Chargement...' : 'Loading...')}
                  </SyntaxHighlighter>
                  {(preview?.line_count || previewData?.preview?.line_count || 0) > 50 && (
                    <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-blue-500" />
                          <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                            {language === 'fr' 
                              ? `${preview?.line_count || previewData?.preview?.line_count || 0} lignes au total. Preview des 50 premières.`
                              : `${preview?.line_count || previewData?.preview?.line_count || 0} total lines. Preview of first 50.`
                            }
                          </span>
                        </div>
                        <button
                          onClick={handleRequestFullContent}
                          disabled={!confirmationToken}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                            darkMode
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          <Download size={14} />
                          {text.readFullFile}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleScanFiles}
                disabled={loading || !config?.currentScope}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {text.scanFiles}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
              >
                <Settings size={16} />
                {text.settings}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                className={`p-2 rounded-lg ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                title={text.viewMode}
              >
                {viewMode === 'list' ? <Grid size={16} /> : <List size={16} />}
              </button>

              <div className="relative">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder={text.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-9 pr-4 py-2 rounded-lg text-sm w-48 ${darkMode ? 'bg-black/40 border border-white/20 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
                />
              </div>
            </div>
          </div>

          {/* Files Display */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
              <span className="ml-3 text-sm opacity-60">Loading...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 opacity-40">
              <File size={24} className="mx-auto mb-2" />
              <p className="text-sm">{config?.currentScope ? text.noFiles : text.noScope}</p>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {filteredFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border transition-all hover:shadow-lg cursor-pointer ${darkMode ? 'bg-black/20 border-white/5 hover:shadow-white/5' : 'bg-white border-slate-100 hover:shadow-slate-100'}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{ContextService.getFileName(file)}</div>
                            <div className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-500'} truncate`}>
                              {ContextService.formatFilePath(file, config?.currentScope)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-500'}`}>
                            {ContextService.getFileExtension(file).toUpperCase()}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFileSelect(file); }}
                            className={`p-1.5 rounded-lg ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                            title={text.preview}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer ${darkMode ? 'bg-black/20 border-white/5 hover:shadow-white/5' : 'bg-white border-slate-100 hover:shadow-slate-100'}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10">
                          {getFileIcon(file)}
                        </div>
                        <div className="text-xs font-medium text-center truncate w-full">
                          {ContextService.getFileName(file)}
                        </div>
                        <div className={`text-[10px] ${darkMode ? 'opacity-60' : 'text-slate-500'}`}>
                          {ContextService.getFileExtension(file).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[500px] max-w-[90vw] p-8 rounded-[24px] border shadow-2xl ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="opacity-50" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Settings size={28} className="text-blue-500" />
            </div>

            <h3 className="text-lg font-black uppercase text-center mb-6">
              {text.settings}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase mb-2 opacity-60">
                  {text.maxFileSize}
                </label>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-black/30' : 'bg-slate-100'}`}>
                  <p className="text-sm">
                    {config?.maxFileSize ? ContextService.formatFileSize(config.maxFileSize) : '1 MB'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-2 opacity-60">
                  {text.allowedExtensions}
                </label>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-black/30' : 'bg-slate-100'}`}>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {config?.allowedExtensions?.map((ext, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}
                      >
                        .{ext}
                        <button
                          onClick={() => handleRemoveExtension(ext)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                          title={text.remove}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="pdf, csv, etc."
                      value={newExtension}
                      onChange={(e) => setNewExtension(e.target.value)}
                      className={`flex-1 p-2 rounded-lg text-sm ${darkMode ? 'bg-black/40 border border-white/20 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
                    />
                    <button
                      onClick={handleAddExtension}
                      disabled={!newExtension.trim() || loading}
                      className={`p-2 rounded-lg ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {text.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V2: Modal de confirmation pour lecture complète */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[500px] max-w-[90vw] p-8 rounded-[24px] border shadow-2xl ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="opacity-50" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Lock size={28} className="text-blue-500" />
            </div>

            <h3 className="text-lg font-black uppercase text-center mb-4">
              {text.confirmReadTitle}
            </h3>

            <div className={`p-4 rounded-xl mb-6 ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`text-xs mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {text.confirmReadMessage}
                  </p>
                  <div className={`text-[10px] font-mono p-2 rounded-lg ${darkMode ? 'bg-black/30 text-white/60' : 'bg-white text-slate-600'}`}>
                    <div className="font-bold mb-1">{text.permissionRequired}:</div>
                    <div>FileRead - {selectedFile}</div>
                    {confirmationToken && (
                      <>
                        <div className="font-bold mt-2 mb-1">{text.tokenInfo}:</div>
                        <div className="opacity-60">{confirmationToken.substring(0, 32)}...</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loadingFullContent}
                className={`flex-1 py-3 rounded-xl border ${darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'} text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50`}
              >
                {text.cancel}
              </button>
              <button
                onClick={handleConfirmRead}
                disabled={loadingFullContent || !confirmationToken}
                className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {loadingFullContent ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    {language === 'fr' ? 'Chargement...' : 'Loading...'}
                  </div>
                ) : (
                  <>
                    <CheckCircle size={14} className="inline mr-2" />
                    {text.confirm}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextPanel;