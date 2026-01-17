import { invoke } from '@tauri-apps/api/core';
import { requestWorker } from './bridge';

/**
 * Permission Service - Gestion des permissions côté frontend (V2.1 Phase 3 : Support scope)
 */
class PermissionService {
    /**
     * Demande une permission à l'utilisateur (méthode legacy, utilise scope Global)
     * @param {string} permission - Type de permission ('FileRead', 'FileWrite', etc.)
     * @param {string} context - Contexte de la demande
     * @param {string} reason - Raison de la demande
     * @returns {Promise<boolean>} - True si accordée, false sinon
     */
    static async requestPermission(permission, context, reason) {
        try {
            const result = await invoke('request_permission', {
                permission,
                context,
                reason
            });
            const granted = result?.success ?? result === true;
            if (granted) {
                try {
                    await requestWorker('grant_permission', { permission });
                } catch (error) {
                    console.warn('Failed to sync permission with worker:', error);
                }
            }
            return granted;
        } catch (error) {
            console.error('Failed to request permission:', error);
            return false;
        }
    }

    /**
     * V2.1 Phase 3 : Demande une permission avec scope (temporaire/session/project/global)
     * @param {string} permission - Type de permission ('FileRead', 'FileWrite', etc.)
     * @param {string} context - Contexte de la demande
     * @param {string} scope - Scope: 'temporary' | 'session' | 'project' | 'global'
     * @param {number} [duration_minutes] - Durée en minutes (pour scope 'temporary')
     * @param {string} [project_id] - ID du projet (pour scope 'project')
     * @returns {Promise<boolean>} - True si accordée, false sinon
     */
    static async requestPermissionWithScope(permission, context, scope = 'global', duration_minutes = null, project_id = null) {
        try {
            const result = await invoke('request_permission_with_scope', {
                permission,
                context,
                scope,
                duration_minutes: duration_minutes || undefined,
                project_id: project_id || undefined
            });
            const granted = result?.success ?? result === true;
            if (granted) {
                try {
                    await requestWorker('grant_permission', { permission });
                } catch (error) {
                    console.warn('Failed to sync permission with worker:', error);
                }
            }
            return granted;
        } catch (error) {
            console.error('Failed to request permission with scope:', error);
            return false;
        }
    }

    /**
     * Vérifie si une permission est accordée
     * @param {string} permission - Type de permission
     * @returns {Promise<boolean>} - True si accordée
     */
    static async hasPermission(permission) {
        try {
            const result = await invoke('has_permission', { permission });
            return result?.has_permission ?? result?.hasPermission ?? result === true;
        } catch (error) {
            console.error('Failed to check permission:', error);
            return false;
        }
    }

    /**
     * V2.1 Phase 3 : Vérifie une permission avec contexte (projectId pour isolation par projet)
     * @param {string} permission - Type de permission
     * @param {string} [project_id] - ID du projet (optionnel)
     * @returns {Promise<boolean>} - True si accordée dans le contexte du projet
     */
    static async hasPermissionWithContext(permission, project_id = null) {
        try {
            const result = await invoke('has_permission_with_context', { 
                permission,
                project_id: project_id || undefined
            });
            return result?.has_permission ?? result?.hasPermission ?? result === true;
        } catch (error) {
            console.error('Failed to check permission with context:', error);
            return false;
        }
    }

    /**
     * Récupère les logs d'audit des permissions
     * @returns {Promise<Array>} - Liste des logs d'audit
     */
    static async getPermissionLogs() {
        try {
            return await invoke('get_permission_logs');
        } catch (error) {
            console.error('Failed to get permission logs:', error);
            return [];
        }
    }

    /**
     * Efface les logs d'audit
     * @returns {Promise<void>}
     */
    static async clearPermissionLogs() {
        try {
            await invoke('clear_permission_logs');
        } catch (error) {
            console.error('Failed to clear permission logs:', error);
            throw error;
        }
    }

    /**
     * Exporte les logs d'audit vers un fichier
     * @param {string} path - Chemin du fichier de destination
     * @returns {Promise<void>}
     */
    static async exportPermissionLogs(path) {
        try {
            await invoke('export_permission_logs', { path });
        } catch (error) {
            console.error('Failed to export permission logs:', error);
            throw error;
        }
    }

    /**
     * Récupère l'état du mode parano
     * @returns {Promise<boolean>} - True si mode parano activé
     */
    static async getParanoMode() {
        try {
            const result = await invoke('get_parano_mode');
            if (typeof result === 'boolean') {
                return result;
            }
            return result?.parano_mode ?? result?.paranoMode ?? true;
        } catch (error) {
            console.error('Failed to get parano mode:', error);
            return true; // Par défaut, mode parano activé
        }
    }

    /**
     * Active/désactive le mode parano
     * @param {boolean} enabled - True pour activer le mode parano
     * @returns {Promise<void>}
     */
    static async setParanoMode(enabled) {
        try {
            await invoke('set_parano_mode', { enabled });
        } catch (error) {
            console.error('Failed to set parano mode:', error);
            throw error;
        }
    }

    /**
     * Formate un log de permission pour l'affichage
     * @param {Object} log - Log de permission
     * @returns {Object} - Log formaté
     */
    static formatPermissionLog(log) {
        const permissionNames = {
            FileRead: 'Lecture de fichiers',
            FileWrite: 'Écriture de fichiers',
            CommandExecute: 'Exécution de commandes',
            NetworkAccess: 'Accès réseau',
            RemoteAccess: 'Accès distant',
            MemoryAccess: 'Accès mémoire',
            RepoAnalyze: 'Analyse de repository'  // V2.1 Phase 3 : Nouvelle permission
        };

        const formattedPermission = permissionNames[log.permission] || log.permission;

        return {
            ...log,
            formattedPermission,
            formattedTimestamp: new Date(log.timestamp).toLocaleString(),
            status: log.granted ? 'Accordée' : 'Refusée',
            statusClass: log.granted ? 'text-emerald-500' : 'text-red-500'
        };
    }
}

export default PermissionService;
