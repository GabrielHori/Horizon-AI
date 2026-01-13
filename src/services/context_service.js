import { invoke } from '@tauri-apps/api/core';

/**
 * Context Service - Gestion du contexte local côté frontend
 */
class ContextService {
    /**
     * Lit le contenu d'un fichier
     * @param {string} filePath - Chemin du fichier
     * @returns {Promise<Object>} - Contenu du fichier avec métadonnées
     */
    static async readFile(filePath) {
        try {
            return await invoke('read_file', { filePath });
        } catch (error) {
            console.error('Failed to read file:', error);
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    /**
     * Lit plusieurs fichiers
     * @param {Array<string>} filePaths - Liste de chemins de fichiers
     * @returns {Promise<Array<Object>>} - Liste des contenus de fichiers
     */
    static async readMultipleFiles(filePaths) {
        try {
            return await invoke('read_multiple_files', { filePaths });
        } catch (error) {
            console.error('Failed to read multiple files:', error);
            throw new Error(`Failed to read multiple files: ${error.message}`);
        }
    }

    /**
     * Scanne un répertoire pour lister les fichiers
     * @param {string} directoryPath - Chemin du répertoire
     * @param {boolean} recursive - Si vrai, scan récursif
     * @returns {Promise<Array<string>>} - Liste des chemins de fichiers
     */
    static async scanDirectory(directoryPath, recursive = false) {
        try {
            return await invoke('scan_directory', {
                directoryPath,
                recursive
            });
        } catch (error) {
            console.error('Failed to scan directory:', error);
            throw new Error(`Failed to scan directory: ${error.message}`);
        }
    }

    /**
     * Obtient la configuration actuelle du contexte
     * @returns {Promise<Object>} - Configuration du contexte
     */
    static async getContextConfig() {
        try {
            return await invoke('get_context_config');
        } catch (error) {
            console.error('Failed to get context config:', error);
            throw new Error(`Failed to get context config: ${error.message}`);
        }
    }

    /**
     * Définit le scope de travail (dossier de projet)
     * @param {string} scopePath - Chemin du dossier de projet
     * @returns {Promise<void>}
     */
    static async setContextScope(scopePath) {
        try {
            await invoke('set_context_scope', { scopePath });
        } catch (error) {
            console.error('Failed to set context scope:', error);
            throw new Error(`Failed to set context scope: ${error.message}`);
        }
    }

    /**
     * Obtient une preview d'un fichier (V2: retourne preview + token de confirmation)
     * @param {string} filePath - Chemin du fichier
     * @param {number} maxLines - Nombre maximum de lignes à prévisualiser (défaut: 50)
     * @returns {Promise<Object>} - Preview du fichier avec token de confirmation {preview: {...}, confirmation_token: "..."}
     */
    static async getFilePreview(filePath, maxLines = 50) {
        try {
            const result = await invoke('get_file_preview', {
                filePath,
                maxLines
            });
            // Le résultat contient {preview: {...}, confirmation_token: "..."}
            return result;
        } catch (error) {
            console.error('Failed to get file preview:', error);
            throw new Error(`Failed to get file preview: ${error.message}`);
        }
    }

    /**
     * Lit un fichier complet après confirmation (V2)
     * @param {string} filePath - Chemin du fichier
     * @param {string} confirmationToken - Token de confirmation obtenu via getFilePreview
     * @returns {Promise<Object>} - Contenu complet du fichier
     */
    static async readFileConfirmed(filePath, confirmationToken) {
        try {
            return await invoke('read_file_confirmed', {
                filePath,
                confirmationToken
            });
        } catch (error) {
            console.error('Failed to read file confirmed:', error);
            throw new Error(`Failed to read file confirmed: ${error.message}`);
        }
    }

    /**
     * Met à jour la configuration du contexte
     * @param {Object} config - Nouvelle configuration
     * @returns {Promise<void>}
     */
    static async updateContextConfig(config) {
        try {
            await invoke('update_context_config', { newConfig: config });
        } catch (error) {
            console.error('Failed to update context config:', error);
            throw new Error(`Failed to update context config: ${error.message}`);
        }
    }

    /**
     * Ajoute une extension autorisée
     * @param {string} extension - Extension à ajouter (sans le point)
     * @returns {Promise<void>}
     */
    static async addAllowedExtension(extension) {
        try {
            await invoke('add_allowed_extension', { extension });
        } catch (error) {
            console.error('Failed to add allowed extension:', error);
            throw new Error(`Failed to add allowed extension: ${error.message}`);
        }
    }

    /**
     * Supprime une extension autorisée
     * @param {string} extension - Extension à supprimer (sans le point)
     * @returns {Promise<void>}
     */
    static async removeAllowedExtension(extension) {
        try {
            await invoke('remove_allowed_extension', { extension });
        } catch (error) {
            console.error('Failed to remove allowed extension:', error);
            throw new Error(`Failed to remove allowed extension: ${error.message}`);
        }
    }

    /**
     * Formate un chemin de fichier pour l'affichage
     * @param {string} path - Chemin du fichier
     * @param {string} basePath - Chemin de base (optionnel)
     * @returns {string} - Chemin formaté
     */
    static formatFilePath(path, basePath = null) {
        if (basePath && path.startsWith(basePath)) {
            return path.replace(basePath, '');
        }
        return path;
    }

    /**
     * Extrait le nom de fichier d'un chemin
     * @param {string} path - Chemin complet
     * @returns {string} - Nom du fichier
     */
    static getFileName(path) {
        const parts = path.split(/[\\/]/);
        return parts[parts.length - 1];
    }

    /**
     * Obtient l'extension d'un fichier
     * @param {string} path - Chemin du fichier
     * @returns {string} - Extension du fichier
     */
    static getFileExtension(path) {
        const parts = path.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 1].toLowerCase();
        }
        return '';
    }

    /**
     * Formate la taille d'un fichier pour l'affichage
     * @param {number} size - Taille en octets
     * @returns {string} - Taille formatée
     */
    static formatFileSize(size) {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        } else {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
    }

    /**
     * Vérifie si un fichier est dans la liste des extensions autorisées
     * @param {string} filePath - Chemin du fichier
     * @param {Array<string>} allowedExtensions - Extensions autorisées
     * @returns {boolean} - Vrai si l'extension est autorisée
     */
    static isAllowedExtension(filePath, allowedExtensions) {
        const ext = this.getFileExtension(filePath);
        return allowedExtensions.includes(ext);
    }
}

export default ContextService;