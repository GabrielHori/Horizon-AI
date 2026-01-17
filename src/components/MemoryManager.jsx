import React, { useState, useEffect } from 'react';
import {
  Brain,
  User,
  Folder,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Lock,
  Unlock,
  AlertCircle,
  Info,
  RefreshCw,
  Key,
  Eye,
  CheckCircle
} from 'lucide-react';
import { requestWorker } from '../services/bridge';
import { useTheme } from '../contexts/ThemeContext';
import PermissionService from '../services/permission_service';

const MemoryManager = ({ language = 'fr', isDarkMode = true }) => {
  const { isDarkMode: themeDarkMode } = useTheme();
  const darkMode = isDarkMode !== undefined ? isDarkMode : themeDarkMode;

  const [activeTab, setActiveTab] = useState('user'); // 'user', 'project', 'session'
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newMetadata, setNewMetadata] = useState('');
  const [projectId, setProjectId] = useState('');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoPassword, setCryptoPassword] = useState('');
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // V2: Modal confirmation suppression
  const [deletingKey, setDeletingKey] = useState(null); // V2: Clé à supprimer
  const [viewingEntry, setViewingEntry] = useState(null); // V2: Entrée à visualiser
  const [entryFullValue, setEntryFullValue] = useState(null); // V2: Valeur complète de l'entrée visualisée
  const [showClearSessionModal, setShowClearSessionModal] = useState(false);
  const [isClearingSession, setIsClearingSession] = useState(false);

  const text = {
    fr: {
      title: "GESTION DE LA MÉMOIRE",
      subtitle: "Mémoire locale intelligente",
      description: "Gérez vos mémoires utilisateur, projet et session. Toutes les données sont stockées localement.",
      user: "Utilisateur",
      project: "Projet",
      session: "Session",
      key: "Clé",
      value: "Valeur",
      metadata: "Métadonnées",
      created: "Créé",
      updated: "Modifié",
      actions: "Actions",
      add: "Ajouter",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Enregistrer",
      cancel: "Annuler",
      search: "Rechercher...",
      noEntries: "Aucune entrée de mémoire",
      addEntry: "Ajouter une entrée",
      editEntry: "Modifier l'entrée",
      deleteConfirm: "Supprimer cette entrée ?",
      deleteConfirmMessage: "Cette action est irréversible.",
      clearSession: "Vider la session",
      clearSessionConfirm: "Vider toute la mémoire de session ?",
      cryptoTitle: "Configuration du chiffrement",
      cryptoDescription: "Définissez un mot de passe pour chiffrer vos mémoires.",
      cryptoPasswordPlaceholder: "Mot de passe",
      cryptoSet: "Définir le mot de passe",
      cryptoEnabled: "Chiffrement activé",
      cryptoDisabled: "Chiffrement désactivé",
      projectIdPlaceholder: "ID du projet (optionnel)",
      metadataPlaceholder: "Métadonnées JSON (optionnel)",
      error: "Erreur",
      success: "Succès",
      loading: "Chargement...",
      info: "Les mémoires sont stockées localement. La mémoire de session est temporaire et sera perdue au redémarrage.",
      view: "Voir",
      viewEntry: "Visualiser l'entrée",
      deleteEntryConfirm: "Supprimer cette entrée ?",
      deleteEntryMessage: "Cette action est irréversible. L'entrée sera définitivement supprimée.",
      encrypted: "Chiffré",
      notEncrypted: "Non chiffré",
      close: "Fermer",
      memoryType: "Type de mémoire"
    },
    en: {
      title: "MEMORY MANAGEMENT",
      subtitle: "Intelligent local memory",
      description: "Manage your user, project, and session memories. All data is stored locally.",
      user: "User",
      project: "Project",
      session: "Session",
      key: "Key",
      value: "Value",
      metadata: "Metadata",
      created: "Created",
      updated: "Updated",
      actions: "Actions",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      search: "Search...",
      noEntries: "No memory entries",
      addEntry: "Add entry",
      editEntry: "Edit entry",
      deleteConfirm: "Delete this entry?",
      deleteConfirmMessage: "This action is irreversible.",
      clearSession: "Clear session",
      clearSessionConfirm: "Clear all session memory?",
      cryptoTitle: "Encryption configuration",
      cryptoDescription: "Set a password to encrypt your memories.",
      cryptoPasswordPlaceholder: "Password",
      cryptoSet: "Set password",
      cryptoEnabled: "Encryption enabled",
      cryptoDisabled: "Encryption disabled",
      projectIdPlaceholder: "Project ID (optional)",
      metadataPlaceholder: "JSON metadata (optional)",
      error: "Error",
      success: "Success",
      loading: "Loading...",
      info: "Memories are stored locally. Session memory is temporary and will be lost on restart.",
      view: "View",
      viewEntry: "View entry",
      deleteEntryConfirm: "Delete this entry?",
      deleteEntryMessage: "This action is irreversible. The entry will be permanently deleted.",
      encrypted: "Encrypted",
      notEncrypted: "Not encrypted",
      close: "Close",
      memoryType: "Memory type"
    }
  };

  const t = text[language] || text.en;

  const ensureMemoryPermission = async (actionLabel) => {
    const hasPermission = await PermissionService.hasPermission('MemoryAccess');
    if (hasPermission) {
      return true;
    }
    const result = await PermissionService.requestPermission(
      'MemoryAccess',
      actionLabel,
      language === 'fr' ? 'Accès mémoire' : 'Memory access'
    );
    return result === true;
  };

  // Charger les entrées
  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const allowed = await ensureMemoryPermission(`${t.memoryType}: ${activeTab}`);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission mémoire requise' : 'Memory permission required');
        setLoading(false);
        return;
      }
      const response = await requestWorker("memory_list", {
        memory_type: activeTab,
        project_id: activeTab === 'project' ? projectId : undefined
      });

      if (response?.success) {
        setEntries(response.entries || []);
      } else {
        setError(response?.error || "Failed to load entries");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder une entrée
  const saveEntry = async (key, value, metadata = null) => {
    try {
      const allowed = await ensureMemoryPermission(`${t.addEntry}: ${key}`);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission mémoire requise' : 'Memory permission required');
        return false;
      }
      let parsedMetadata = null;
      if (metadata && metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          parsedMetadata = { note: metadata };
        }
      }

      const response = await requestWorker("memory_save", {
        memory_type: activeTab,
        key,
        value,
        project_id: activeTab === 'project' ? projectId : undefined,
        metadata: parsedMetadata
      });

      if (response?.success) {
        await loadEntries();
        setShowAddModal(false);
        setEditingKey(null);
        setNewKey('');
        setNewValue('');
        setNewMetadata('');
        return true;
      } else {
        setError(response?.error || "Failed to save entry");
        return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // V2: Demander confirmation suppression (modal personnalisée)
  const requestDeleteEntry = (key) => {
    setDeletingKey(key);
    setShowDeleteModal(true);
  };

  // V2: Supprimer une entrée après confirmation
  const deleteEntry = async () => {
    if (!deletingKey) return;

    try {
      const allowed = await ensureMemoryPermission(`${t.deleteEntryConfirm}: ${deletingKey}`);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission mémoire requise' : 'Memory permission required');
        setShowDeleteModal(false);
        setDeletingKey(null);
        return;
      }
      const response = await requestWorker("memory_delete", {
        memory_type: activeTab,
        key: deletingKey,
        project_id: activeTab === 'project' ? projectId : undefined
      });

      if (response?.success) {
        await loadEntries();
        setShowDeleteModal(false);
        setDeletingKey(null);
      } else {
        setError(response?.error || "Failed to delete entry");
        setShowDeleteModal(false);
        setDeletingKey(null);
      }
    } catch (err) {
      setError(err.message);
      setShowDeleteModal(false);
      setDeletingKey(null);
    }
  };

  // V2: Visualiser une entrée complète
  const viewEntry = async (key) => {
    try {
      const value = await loadEntryValue(key);
      if (value !== null) {
        setViewingEntry({ key, value });
      } else {
        setError(language === 'fr' ? 'Impossible de charger la valeur' : 'Failed to load value');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Vider la session

  // Vider la session
  const clearSession = async () => {
    setIsClearingSession(true);
    try {
      const allowed = await ensureMemoryPermission(t.clearSession);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission memoire requise' : 'Memory permission required');
        return;
      }
      const response = await requestWorker("memory_clear_session");
      if (response?.success) {
        await loadEntries();
      } else {
        setError(response?.error || "Failed to clear session");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsClearingSession(false);
      setShowClearSessionModal(false);
    }
  };

  // Configurer le chiffrement
  const handleSetCryptoPassword = async () => {
    if (!cryptoPassword.trim()) {
      setError("Password is required");
      return;
    }

    try {
      const allowed = await ensureMemoryPermission(t.cryptoTitle);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission mémoire requise' : 'Memory permission required');
        return;
      }
      const response = await requestWorker("memory_set_crypto_password", {
        password: cryptoPassword
      });

      if (response?.success) {
        setCryptoEnabled(true);
        setShowCryptoModal(false);
        setCryptoPassword('');
      } else {
        setError(response?.error || "Failed to set password");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Charger la valeur complète d'une entrée
  const loadEntryValue = async (key) => {
    try {
      const allowed = await ensureMemoryPermission(`${t.viewEntry}: ${key}`);
      if (!allowed) {
        setError(language === 'fr' ? 'Permission mémoire requise' : 'Memory permission required');
        return null;
      }
      const response = await requestWorker("memory_get", {
        memory_type: activeTab,
        key,
        project_id: activeTab === 'project' ? projectId : undefined
      });

      if (response?.success) {
        return response.value;
      }
    } catch (err) {
      console.error("Failed to load entry value:", err);
    }
    return null;
  };

  // Ouvrir l'édition
  const startEdit = async (key) => {
    const value = await loadEntryValue(key);
    if (value !== null) {
      setEditingKey(key);
      setEditValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    }
  };

  // Sauvegarder l'édition
  const saveEdit = async () => {
    if (!editingKey) return;
    await saveEntry(editingKey, editValue);
  };

  // Filtrer les entrées
  const filteredEntries = entries.filter(entry =>
    entry.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Charger au changement d'onglet
  useEffect(() => {
    loadEntries();
  }, [activeTab, projectId]);

  return (
    <div className={`p-4 sm:p-6 md:p-8 lg:p-12 w-full h-full overflow-y-auto custom-scrollbar animate-page-entry transition-colors duration-500 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
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

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowCryptoModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${darkMode
                  ? 'bg-white/10 hover:bg-white/20 border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              {cryptoEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {cryptoEnabled ? t.cryptoEnabled : t.cryptoDisabled}
            </button>
            <button
              onClick={loadEntries}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50 ${darkMode
                  ? 'bg-white/10 hover:bg-white/20 border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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

        {/* Tabs */}
        <div className={`flex gap-1 sm:gap-2 border-b overflow-x-auto ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
          {[
            { id: 'user', icon: User, label: t.user },
            { id: 'project', icon: Folder, label: t.project },
            { id: 'session', icon: Clock, label: t.session }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 sm:px-6 py-2 sm:py-3 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                  ? darkMode
                    ? 'text-white'
                    : 'text-slate-900'
                  : darkMode
                    ? 'text-white/30 hover:text-white/70'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
            >
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8))',
                    boxShadow: '0 0 10px rgba(255,200,100,0.4)'
                  }}
                />
              )}
              <tab.icon className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project ID input for project tab */}
        {activeTab === 'project' && (
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder={t.projectIdPlaceholder}
              className={`w-full px-4 py-2 rounded-lg text-sm ${darkMode
                  ? 'bg-black/40 border border-white/20 text-white placeholder-white/30'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
        )}

        {/* Search and Actions */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap`}>
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${darkMode
                  ? 'bg-black/40 border border-white/20 text-white placeholder-white/30'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${darkMode
                ? 'bg-white/10 hover:bg-white/20 border border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
              }`}
          >
            <Plus className="w-4 h-4" />
            {t.add}
          </button>
          {activeTab === 'session' && (
            <button
              onClick={() => setShowClearSessionModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${darkMode
                  ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600'
                }`}
            >
              <Trash2 className="w-4 h-4" />
              {t.clearSession}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className={`p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-2`}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Entries list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>{t.loading}</p>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className={`text-xs ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>{t.noEntries}</p>
              </div>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.key}
                className={`p-4 rounded-2xl border transition-all ${darkMode
                    ? 'bg-[#0A0A0A] border-white/5 hover:border-white/10'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-black text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {entry.key}
                      </span>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase ${darkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {Object.keys(entry.metadata).length} metadata
                        </span>
                      )}
                      {/* V2: Indicateur chiffré/non chiffré (si disponible dans la réponse API) */}
                      {entry.encrypted !== undefined && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase flex items-center gap-1 ${entry.encrypted
                            ? darkMode
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-green-100 text-green-700 border border-green-200'
                            : darkMode
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                          {entry.encrypted ? <Lock size={10} /> : <Unlock size={10} />}
                          {entry.encrypted ? t.encrypted : t.notEncrypted}
                        </span>
                      )}
                    </div>
                    {editingKey === entry.key ? (
                      <div className="space-y-3">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg font-mono text-xs ${darkMode
                              ? 'bg-black/40 border border-white/20 text-white'
                              : 'bg-white border border-slate-200 text-slate-900'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                          rows={6}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase"
                          >
                            <Save className="w-4 h-4" />
                            {t.save}
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                                ? 'bg-white/10 hover:bg-white/20 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                              }`}
                          >
                            <X className="w-4 h-4" />
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-[10px] ${darkMode ? 'opacity-40' : 'text-slate-500'} space-x-4`}>
                        {entry.created_at && (
                          <span>{t.created}: {new Date(entry.created_at).toLocaleString()}</span>
                        )}
                        {entry.updated_at && (
                          <span>{t.updated}: {new Date(entry.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {editingKey !== entry.key && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => viewEntry(entry.key)}
                        className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                          }`}
                        title={t.view}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(entry.key)}
                        className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        title={t.edit}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDeleteEntry(entry.key)}
                        className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
                          }`}
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
            <h2 className="text-xl font-black uppercase tracking-wider mb-4">{t.addEntry}</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {t.key}
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg text-sm ${darkMode
                      ? 'bg-black/40 border border-white/20 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {t.value}
                </label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg font-mono text-xs ${darkMode
                      ? 'bg-black/40 border border-white/20 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                  rows={4}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {t.metadata}
                </label>
                <input
                  type="text"
                  value={newMetadata}
                  onChange={(e) => setNewMetadata(e.target.value)}
                  placeholder={t.metadataPlaceholder}
                  className={`w-full px-4 py-2 rounded-lg text-sm ${darkMode
                      ? 'bg-black/40 border border-white/20 text-white placeholder-white/30'
                      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => saveEntry(newKey, newValue, newMetadata)}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewKey('');
                    setNewValue('');
                    setNewMetadata('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-wider">{t.cryptoTitle}</h2>
            </div>
            <p className={`text-xs mb-4 ${darkMode ? 'opacity-60' : 'text-slate-600'}`}>
              {t.cryptoDescription}
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {t.cryptoPasswordPlaceholder}
                </label>
                <input
                  type="password"
                  value={cryptoPassword}
                  onChange={(e) => setCryptoPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg text-sm ${darkMode
                      ? 'bg-black/40 border border-white/20 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSetCryptoPassword}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase"
                >
                  {t.cryptoSet}
                </button>
                <button
                  onClick={() => {
                    setShowCryptoModal(false);
                    setCryptoPassword('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* V2: Modal confirmation suppression */}
      {showDeleteModal && deletingKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-black uppercase tracking-wider">{t.deleteConfirm}</h2>
            </div>
            <div className={`p-4 rounded-xl mb-6 ${darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                {t.deleteConfirmMessage}
              </p>
              <div className={`text-xs font-mono p-2 rounded-lg ${darkMode ? 'bg-black/30 text-white/60' : 'bg-white text-slate-600'}`}>
                <div className="font-bold mb-1">{t.key}:</div>
                <div>{deletingKey}</div>
                <div className="font-bold mt-2 mb-1">{t.memoryType}:</div>
                <div>{activeTab}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingKey(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
              >
                {t.cancel}
              </button>
              <button
                onClick={deleteEntry}
                className={`flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase`}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal confirmation vider la session */}
      {showClearSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-black uppercase tracking-wider">{t.clearSession}</h2>
            </div>
            <div className={`p-4 rounded-xl mb-6 ${darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                {t.clearSessionConfirm}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearSessionModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {t.cancel}
              </button>
              <button
                onClick={clearSession}
                disabled={isClearingSession}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase disabled:opacity-60"
              >
                {isClearingSession ? t.loading : t.clearSession}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* V2: Modal visualisation entrée complète */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[80vh] p-6 rounded-2xl border flex flex-col ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-black uppercase tracking-wider">{t.viewEntry}</h2>
              </div>
              <button
                onClick={() => {
                  setViewingEntry(null);
                  setEntryFullValue(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} className="opacity-50" />
              </button>
            </div>

            <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-black/40 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`font-black text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {t.key}:
                </span>
                <span className={`text-sm font-mono ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {viewingEntry.key}
                </span>
              </div>
            </div>

            <div className={`flex-1 overflow-auto rounded-xl border ${darkMode ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="p-4">
                <label className={`block text-xs font-bold uppercase mb-2 ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>
                  {t.value}:
                </label>
                <pre className={`p-4 rounded-lg font-mono text-xs overflow-x-auto ${darkMode ? 'bg-black/40 text-white' : 'bg-slate-50 text-slate-900'}`}>
                  {typeof viewingEntry.value === 'string'
                    ? viewingEntry.value
                    : JSON.stringify(viewingEntry.value, null, 2)
                  }
                </pre>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => {
                  setViewingEntry(null);
                  setEntryFullValue(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold uppercase ${darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryManager;
