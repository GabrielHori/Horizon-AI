import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { logger } from './logger';

// Codes d'erreur standardisés
const ErrorCodes = {
  BRIDGE_ERROR: 'BRIDGE_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INVALID_JSON: 'INVALID_JSON',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Crée un objet d'erreur standardisé
 * @param {string} code - Code d'erreur
 * @param {string} message - Message d'erreur
 * @param {string} cmd - Commande qui a échoué
 * @param {object} originalError - Erreur originale
 * @returns {object} Objet d'erreur standardisé
 */
function createErrorObject(code, message, cmd, originalError = null) {
  return {
    error: true,
    code,
    message,
    command: cmd,
    timestamp: new Date().toISOString(),
    ...(originalError && {
      details: {
        name: originalError.name,
        message: originalError.message,
        stack: logger.isDev() ? originalError.stack : undefined
      }
    })
  };
}

export async function requestWorker(cmd, payload = {}, timeoutMs = 30000) {
  try {
    // 🔧 CORRECTION URGENTE : Timeout pour éviter freeze UI
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const requestPromise = invoke("call_python", { cmd, payload });

    // Race entre la requête et le timeout
    const response = await Promise.race([requestPromise, timeoutPromise]);

    if (!response) {
      logger.warn(`Empty response for command: ${cmd}`);
      return createErrorObject(
        ErrorCodes.EMPTY_RESPONSE,
        `Empty response received for command: ${cmd}`,
        cmd
      );
    }

    // Rust peut renvoyer string JSON
    if (typeof response === "string") {
      try {
        return JSON.parse(response);
      } catch (parseError) {
        logger.error(`JSON parse error for command: ${cmd}`, parseError);
        return createErrorObject(
          ErrorCodes.INVALID_JSON,
          `Invalid JSON response for command: ${cmd}`,
          cmd,
          parseError
        );
      }
    }

    // Rust peut renvoyer déjà un objet
    if (typeof response === "object") {
      // Vérifier si c'est déjà un objet d'erreur
      if (response.error === true) {
        // Normaliser les erreurs backend
        return createErrorObject(
          response.code || ErrorCodes.BRIDGE_ERROR,
          response.message || `Backend error for command: ${cmd}`,
          cmd,
          response
        );
      }
      return response;
    }

    logger.warn(`Unexpected response type for command: ${cmd}`, typeof response);
    return createErrorObject(
      ErrorCodes.BRIDGE_ERROR,
      `Unexpected response type for command: ${cmd}`,
      cmd
    );

  } catch (error) {
    logger.error(`Command failed: ${cmd}`, error);

    // Détecter timeout
    if (error.message && error.message.includes('timeout')) {
      return createErrorObject(
        ErrorCodes.TIMEOUT_ERROR,
        `Command timed out (>${timeoutMs}ms): ${cmd}`,
        cmd,
        error
      );
    }

    // Détecter les types d'erreurs spécifiques
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      return createErrorObject(
        ErrorCodes.NETWORK_ERROR,
        `Network error when executing command: ${cmd}`,
        cmd,
        error
      );
    }

    if (error.name === 'TimeoutError') {
      return createErrorObject(
        ErrorCodes.TIMEOUT_ERROR,
        `Command timed out: ${cmd}`,
        cmd,
        error
      );
    }

    return createErrorObject(
      ErrorCodes.UNKNOWN_ERROR,
      `Unknown error executing command: ${cmd}`,
      cmd,
      error
    );
  }
}

// ====== SINGLETON STREAM LISTENER ======
// Évite les listeners multiples qui causent la duplication des tokens
let streamListenerSetup = false;
let streamCallbacks = new Set();
let streamUnlisten = null;

export async function setupStreamListener(onChunk) {
  // Ajouter le callback à la liste
  streamCallbacks.add(onChunk);

  // Si le listener global n'est pas encore configuré, le configurer
  if (!streamListenerSetup) {
    streamListenerSetup = true;

    streamUnlisten = await listen("python-stream", (event) => {
      if (!event?.payload) return;

      let data = event.payload;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { }
      }

      // Notifier tous les callbacks enregistrés
      streamCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          logger.error('Stream callback error:', e);
        }
      });
    });
  }

  // Retourner une fonction pour supprimer CE callback spécifique
  return () => {
    streamCallbacks.delete(onChunk);

    // 🛡️ STABILISATION: Si plus de callbacks, cleanup le listener global
    if (streamCallbacks.size === 0 && streamUnlisten) {
      streamUnlisten();
      streamUnlisten = null;
      streamListenerSetup = false;
    }
  };
}

// ====== SINGLETON PUSH LISTENER ======
let pushListenerSetup = false;
let pushCallbacks = new Set();
let pushUnlisten = null;

export async function setupPushListener(onData) {
  pushCallbacks.add(onData);

  if (!pushListenerSetup) {
    pushListenerSetup = true;

    pushUnlisten = await listen("python-push", (event) => {
      if (!event?.payload) return;

      pushCallbacks.forEach(callback => {
        try {
          callback(event.payload);
        } catch (e) {
          logger.error('Push callback error:', e);
        }
      });
    });
  }

  return () => {
    pushCallbacks.delete(onData);

    // 🛡️ STABILISATION: Si plus de callbacks, cleanup le listener global
    if (pushCallbacks.size === 0 && pushUnlisten) {
      pushUnlisten();
      pushUnlisten = null;
      pushListenerSetup = false;
    }
  };
}

// 🛡️ STABILISATION: Méthode publique pour cleanup complet (app unmount)
export function cleanupAllListeners() {
  // Cleanup stream
  if (streamUnlisten) {
    streamUnlisten();
    streamUnlisten = null;
  }
  streamCallbacks.clear();
  streamListenerSetup = false;

  // Cleanup push
  if (pushUnlisten) {
    pushUnlisten();
    pushUnlisten = null;
  }
  pushCallbacks.clear();
  pushListenerSetup = false;

  logger.debug('All listeners cleaned up');
}

// 🛡️ STABILISATION: Debug - Nombre de callbacks actifs
export function getActiveCallbacksCount() {
  return {
    stream: streamCallbacks.size,
    push: pushCallbacks.size
  };
}
