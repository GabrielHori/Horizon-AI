import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Download,
  Trash2,
  RefreshCw,
  Search,
  FileText,
  Clock,
  User,
  Info
} from 'lucide-react';
import PermissionService from '../services/permission_service';
import { useTheme } from '../contexts/ThemeContext';

const PermissionManager = ({ language = 'fr', isDarkMode = true }) => {
  const { isDarkMode: themeDarkMode } = useTheme();
  const darkMode = isDarkMode !== undefined ? isDarkMode : themeDarkMode;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPath, setExportPath] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showLogDetail, setShowLogDetail] = useState(null);

  const text = {
    fr: {
      title: "GESTION DES PERMISSIONS",
      subtitle: "Journal d'audit des permissions",
      description: "Toutes les demandes de permission sont enregistrées et auditables.",
      searchPlaceholder: "Rechercher dans les logs...",
      permission: "Permission",
      context: "Contexte",
      status: "Statut",
      timestamp: "Date/Heure",
      action: "Action",
      granted: "Accordée",
      denied: "Refusée",
      noLogs: "Aucun log de permission trouvé",
      export: "Exporter les logs",
      clear: "Effacer les logs",
      refresh: "Actualiser",
      confirmClearTitle: "Effacer tous les logs ?",
      confirmClearMessage: "Cette action est irréversible. Tous les logs de permission seront supprimés.",
      cancel: "Annuler",
      confirm: "Confirmer",
      exportModalTitle: "Exporter les logs de permission",
      exportPathPlaceholder: "Chemin du fichier de destination",
      exportButton: "Exporter",
      logDetailTitle: "Détails du log",
      close: "Fermer",
      userAction: "Action utilisateur",
      permissionType: "Type de permission",
      fileRead: "Lecture de fichiers",
      fileWrite: "Écriture de fichiers",
      commandExecute: "Exécution de commandes",
      networkAccess: "Accès réseau",
      remoteAccess: "Accès distant",
      memoryAccess: "Accès mémoire",
      info: "Les logs de permission permettent de suivre toutes les demandes d'accès sensibles dans l'application."
    },
    en: {
      title: "PERMISSION MANAGEMENT",
      subtitle: "Permission audit log",
      description: "All permission requests are recorded and auditable.",
      searchPlaceholder: "Search logs...",
      permission: "Permission",
      context: "Context",
      status: "Status",
      timestamp: "Timestamp",
      action: "Action",
      granted: "Granted",
      denied: "Denied",
      noLogs: "No permission logs found",
      export: "Export logs",
      clear: "Clear logs",
      refresh: "Refresh",
      confirmClearTitle: "Clear all logs?",
      confirmClearMessage: "This action is irreversible. All permission logs will be deleted.",
      cancel: "Cancel",
      confirm: "Confirm",
      exportModalTitle: "Export permission logs",
      exportPathPlaceholder: "Destination file path",
      exportButton: "Export",
      logDetailTitle: "Log details",
      close: "Close",
      userAction: "User action",
      permissionType: "Permission type",
      fileRead: "File read",
      fileWrite: "File write",
      commandExecute: "Command execute",
      networkAccess: "Network access",
      remoteAccess: "Remote access",
      memoryAccess: "Memory access",
      info: "Permission logs track all sensitive access requests in the application."
    }
  }[language];

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLogs = await PermissionService.getPermissionLogs();
      setLogs(fetchedLogs.map(log => PermissionService.formatPermissionLog(log)));
    } catch (err) {
      console.error('Failed to fetch permission logs:', err);
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    log.formattedPermission.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async () => {
    if (!exportPath.trim()) return;

    try {
      setExporting(true);
      await PermissionService.exportPermissionLogs(exportPath);
      setShowExportModal(false);
      setExportPath('');
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      setClearing(true);
      await PermissionService.clearPermissionLogs();
      await fetchLogs();
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Clear failed:', err);
      setError(err.message || 'Clear failed');
    } finally {
      setClearing(false);
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'FileRead': return <FileText size={16} className="text-blue-400" />;
      case 'FileWrite': return <FileText size={16} className="text-amber-400" />;
      case 'CommandExecute': return <AlertTriangle size={16} className="text-red-400" />;
      case 'NetworkAccess': return <Shield size={16} className="text-purple-400" />;
      case 'RemoteAccess': return <Shield size={16} className="text-indigo-400" />;
      case 'MemoryAccess': return <Lock size={16} className="text-green-400" />;
      default: return <Lock size={16} />;
    }
  };

  return (
    <div className={`p-6 rounded-[24px] border ${darkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Shield className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={24} />
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

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder={text.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${darkMode ? 'bg-black/40 border border-white/20 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
          />
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
        >
          <Download size={16} />
          {text.export}
        </button>

        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={loading || logs.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
        >
          <Trash2 size={16} />
          {text.clear}
        </button>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors disabled:opacity-50`}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {text.refresh}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={`mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} />
            <span className="text-xs font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            <span className="ml-3 text-sm opacity-60">Loading...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 opacity-40">
            <Shield size={24} className="mx-auto mb-2" />
            <p className="text-sm">{text.noLogs}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all hover:shadow-lg ${darkMode ? 'bg-black/20 border-white/5 hover:shadow-white/5' : 'bg-white border-slate-100 hover:shadow-slate-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10">
                      {getPermissionIcon(log.permission)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${log.statusClass}`}>
                          {log.status}
                        </span>
                        <span className="text-xs opacity-60">{log.formattedTimestamp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{log.formattedPermission}</span>
                        <span className={`text-xs ${darkMode ? 'opacity-40' : 'text-slate-500'}`}>
                          {log.context}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLogDetail(showLogDetail === index ? null : index)}
                    className={`p-2 rounded-lg ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                  >
                    {showLogDetail === index ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {showLogDetail === index && (
                  <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-black/30' : 'bg-slate-50'}`}>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold opacity-60">{text.permissionType}:</span>
                        <span className="ml-1">{log.formattedPermission}</span>
                      </div>
                      <div>
                        <span className="font-bold opacity-60">{text.status}:</span>
                        <span className={`ml-1 ${log.statusClass}`}>{log.status}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold opacity-60">{text.context}:</span>
                        <span className="ml-1 break-all">{log.context}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold opacity-60">{text.userAction}:</span>
                        <span className="ml-1 break-all">{log.user_action}</span>
                      </div>
                      <div>
                        <span className="font-bold opacity-60">{text.timestamp}:</span>
                        <span className="ml-1">{log.formattedTimestamp}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[400px] p-8 rounded-[24px] border shadow-2xl ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="opacity-50" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Download size={28} className="text-blue-500" />
            </div>

            <h3 className="text-lg font-black uppercase text-center mb-2">
              {text.exportModalTitle}
            </h3>

            <p className="text-sm text-center opacity-60 mb-6">
              {language === 'fr' ? 'Spécifiez le chemin pour exporter les logs de permission.' : 'Specify the path to export permission logs.'}
            </p>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase mb-2 opacity-60">
                {text.exportPathPlaceholder}
              </label>
              <input
                type="text"
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder={language === 'fr' ? "/chemin/vers/fichier.json" : "/path/to/file.json"}
                className={`w-full p-3 rounded-lg text-sm ${darkMode ? 'bg-black/40 border border-white/20 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || !exportPath.trim()}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white rounded-full mr-2"></span>
                    {text.exportButton}...
                  </>
                ) : (
                  text.exportButton
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`relative w-[400px] p-8 rounded-[24px] border shadow-2xl ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} className="opacity-50" />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-500" />
            </div>

            <h3 className="text-lg font-black uppercase text-center mb-2">
              {text.confirmClearTitle}
            </h3>

            <p className="text-sm text-center opacity-60 mb-8">
              {text.confirmClearMessage}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearing}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white rounded-full mr-2"></span>
                    {text.confirm}...
                  </>
                ) : (
                  text.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionManager;