import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * Service pour gérer les fenêtres de chat multiples
 */
export class WindowService {
  /**
   * Crée une nouvelle fenêtre de chat détachée
   * @param {Object} options - Options pour la fenêtre
   * @param {string} options.chatId - ID du chat (optionnel)
   * @param {string} options.model - Nom du modèle (optionnel)
   * @returns {Promise<Object>} Informations sur la fenêtre créée
   */
  static async createChatWindow({ chatId = null, model = null } = {}) {
    try {
      const windowInfo = await invoke('create_chat_window', {
        chatId,
        model,
      });
      return windowInfo;
    } catch (error) {
      console.error('Failed to create chat window:', error);
      throw error;
    }
  }

  /**
   * Liste toutes les fenêtres de chat ouvertes
   * @returns {Promise<Array>} Liste des fenêtres
   */
  static async listChatWindows() {
    try {
      const windows = await invoke('list_chat_windows');
      return windows;
    } catch (error) {
      console.error('Failed to list chat windows:', error);
      return [];
    }
  }

  /**
   * Ferme une fenêtre de chat spécifique
   * @param {string} windowId - ID de la fenêtre à fermer
   */
  static async closeChatWindow(windowId) {
    try {
      await invoke('close_chat_window', { windowId });
    } catch (error) {
      console.error('Failed to close chat window:', error);
      throw error;
    }
  }

  /**
   * Met à jour le titre d'une fenêtre
   * @param {string} title - Nouveau titre
   */
  static async updateWindowTitle(title) {
    try {
      await invoke('update_chat_window_title', { title });
    } catch (error) {
      console.error('Failed to update window title:', error);
    }
  }

  /**
   * Obtient les écrans disponibles
   * @returns {Promise<Array>} Liste des écrans
   */
  static async getAvailableScreens() {
    try {
      const screens = await invoke('get_available_screens');
      return screens;
    } catch (error) {
      console.error('Failed to get available screens:', error);
      return [];
    }
  }

  /**
   * Déplace la fenêtre vers un écran spécifique
   * @param {number} screenIndex - Index de l'écran
   */
  static async moveWindowToScreen(screenIndex) {
    try {
      await invoke('move_window_to_screen', { screenIndex });
    } catch (error) {
      console.error('Failed to move window to screen:', error);
      throw error;
    }
  }

  /**
   * Écoute les événements d'initialisation de fenêtre
   * @param {Function} callback - Callback appelé avec les données d'initialisation
   * @returns {Promise<Function>} Fonction pour se désabonner
   */
  static async listenToWindowInit(callback) {
    const unlisten = await listen('chat-window-init', (event) => {
      callback(event.payload);
    });
    return unlisten;
  }
}
