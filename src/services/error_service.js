/**
 * Error Service - Gestion centralisée des erreurs
 *
 * Responsabilités:
 * - Standardiser la gestion des erreurs dans toute l'application
 * - Fournir des messages d'erreur utilisateur conviviaux
 * - Gérer les erreurs techniques vs erreurs utilisateur
 * - Permettre la récupération et la réessai des opérations
 */

// Types d'erreurs standardisés
export const ErrorTypes = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  BACKEND: 'backend',
  UNKNOWN: 'unknown',
  USER: 'user'
};

/**
 * Crée une erreur utilisateur conviviale à partir d'une erreur technique
 * @param {object} error - Erreur technique
 * @param {string} context - Contexte de l'erreur
 * @param {string} language - Langue pour les messages
 * @returns {object} Erreur formatée pour l'utilisateur
 */
export function createUserFriendlyError(error, context = '', language = 'fr') {
  // Messages d'erreur par langue
  const messages = {
    fr: {
      network: 'Problème de connexion réseau. Veuillez vérifier votre connexion.',
      timeout: 'L\'opération a pris trop de temps. Veuillez réessayer.',
      permission: 'Permission refusée. Veuillez accorder les permissions nécessaires.',
      validation: 'Données invalides. Veuillez vérifier vos entrées.',
      backend: 'Erreur serveur. Veuillez réessayer plus tard.',
      unknown: 'Une erreur inattendue est survenue. Veuillez réessayer.',
      retry: 'Réessayer',
      dismiss: 'Ignorer'
    },
    en: {
      network: 'Network connection problem. Please check your connection.',
      timeout: 'Operation timed out. Please try again.',
      permission: 'Permission denied. Please grant necessary permissions.',
      validation: 'Invalid data. Please check your inputs.',
      backend: 'Server error. Please try again later.',
      unknown: 'An unexpected error occurred. Please try again.',
      retry: 'Retry',
      dismiss: 'Dismiss'
    }
  };

  const msg = messages[language] || messages.en;

  // Déterminer le type d'erreur
  let errorType = ErrorTypes.UNKNOWN;
  let userMessage = msg.unknown;
  let canRetry = true;

  if (error?.code) {
    // Erreurs standardisées du bridge
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'EMPTY_RESPONSE':
        errorType = ErrorTypes.NETWORK;
        userMessage = msg.network;
        break;
      case 'TIMEOUT_ERROR':
        errorType = ErrorTypes.TIMEOUT;
        userMessage = msg.timeout;
        break;
      case 'BRIDGE_ERROR':
      case 'INVALID_JSON':
        errorType = ErrorTypes.BACKEND;
        userMessage = msg.backend;
        break;
    }
  } else if (error?.message) {
    // Détecter à partir du message
    if (error.message.includes('permission') || error.message.includes('Permission')) {
      errorType = ErrorTypes.PERMISSION;
      userMessage = msg.permission;
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorType = ErrorTypes.VALIDATION;
      userMessage = msg.validation;
    } else if (error.message.includes('network') || error.message.includes('Network')) {
      errorType = ErrorTypes.NETWORK;
      userMessage = msg.network;
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorType = ErrorTypes.TIMEOUT;
      userMessage = msg.timeout;
    }
  }

  // Ajouter le contexte si disponible
  if (context) {
    userMessage += ` (${context})`;
  }

  return {
    error: true,
    type: errorType,
    userMessage,
    technicalMessage: error?.message || 'No technical details',
    code: error?.code || 'UNKNOWN',
    timestamp: error?.timestamp || new Date().toISOString(),
    canRetry,
    originalError: logger.isDev() ? error : undefined,
    actions: [
      { label: msg.retry, action: 'retry', primary: true },
      { label: msg.dismiss, action: 'dismiss', primary: false }
    ]
  };
}

/**
 * Gère une erreur et retourne un état approprié
 * @param {object} error - Erreur à gérer
 * @param {function} setError - Fonction pour mettre à jour l'état d'erreur
 * @param {string} context - Contexte de l'erreur
 * @param {string} language - Langue pour les messages
 */
export function handleError(error, setError, context = '', language = 'fr') {
  if (!error) {
    setError(null);
    return;
  }

  const userError = createUserFriendlyError(error, context, language);
  setError(userError);

  // Log technique en développement
  if (logger.isDev()) {
    logger.error(`Error in ${context}:`, error);
  }
}

/**
 * Exécute une opération avec gestion d'erreurs automatisée
 * @param {function} operation - Opération asynchrone à exécuter
 * @param {function} setError - Fonction pour mettre à jour l'état d'erreur
 * @param {function} setLoading - Fonction pour mettre à jour l'état de chargement
 * @param {string} context - Contexte de l'opération
 * @param {string} language - Langue pour les messages
 * @returns {Promise<any>} Résultat de l'opération ou null en cas d'erreur
 */
export async function executeWithErrorHandling(operation, setError, setLoading, context = '', language = 'fr') {
  try {
    setLoading(true);
    setError(null);

    const result = await operation();

    // Vérifier si le résultat est une erreur
    if (result?.error === true) {
      handleError(result, setError, context, language);
      return null;
    }

    return result;
  } catch (error) {
    handleError(error, setError, context, language);
    return null;
  } finally {
    setLoading(false);
  }
}

/**
 * Vérifie si un résultat est une erreur
 * @param {any} result - Résultat à vérifier
 * @returns {boolean} True si c'est une erreur
 */
export function isError(result) {
  return result?.error === true;
}

/**
 * Extrait le message utilisateur d'une erreur
 * @param {object} error - Erreur
 * @param {string} language - Langue
 * @returns {string} Message utilisateur
 */
export function getUserMessage(error, language = 'fr') {
  if (!error) return '';

  if (error.userMessage) {
    return error.userMessage;
  }

  return createUserFriendlyError(error, '', language).userMessage;
}

import { requestWorker } from './bridge';
import { logger } from './logger';

let showToastFn = null;

// Initialisation lazy du Toast (pour éviter dépendance circulaire)
function getToast() {
  if (!showToastFn) {
    try {
      const Toast = require('../components/Toast');
      showToastFn = Toast.showToast;
    } catch (e) {
      console.warn('[ErrorService] Toast not available, falling back to console');
      showToastFn = {
        success: (msg) => logger.info('[SUCCESS]', msg),
        error: (msg) => logger.error('[ERROR]', msg),
        warning: (msg) => logger.warn('[WARNING]', msg),
        info: (msg) => logger.info('[INFO]', msg)
      };
    }
  }
  return showToastFn;
}

/**
 * 🛡️ STABILISATION: Wrapper sécurisé autour de requestWorker
 * 
 * Ajoute automatiquement:
 * - try/catch global
 * - Affichage Toast en cas d'erreur
 * - Logging pour debug
 * - Messages utilisateur-friendly
 * 
 * @param {string} cmd - Commande backend
 * @param {object} payload - Payload
 * @param {object} options - Options
 * @param {boolean} options.silent - Ne pas afficher Toast
 * @param {string} options.errorMessage - Message erreur custom
 * @param {string} options.successMessage - Message succès custom
 * @param {function} options.onError - Callback erreur
 * @param {number} options.timeout - Timeout custom
 * @returns {Promise<object>} Résultat
 */
export async function safeRequestWorker(cmd, payload = {}, options = {}) {
  const {
    silent = false,
    errorMessage = null,
    successMessage = null,
    onError = null,
    timeout = 30000
  } = options;

  try {
    const result = await requestWorker(cmd, payload, timeout);

    // Vérifier si c'est une erreur backend
    if (result?.error === true) {
      const message = errorMessage || result.message || `Operation failed: ${cmd}`;

      if (!silent) {
        getToast().error(message);
      }

      if (onError) {
        onError(result);
      }

      // Logger en dev
      if (logger.isDev()) {
        logger.error(`safeRequestWorker error for ${cmd}:`, result);
      }

      return result;
    }

    // Succès
    if (successMessage && !silent) {
      getToast().success(successMessage);
    }

    return result;

  } catch (error) {
    logger.error(`safeRequestWorker exception for ${cmd}:`, error);

    const message = errorMessage || error.message || `Unexpected error: ${cmd}`;

    if (!silent) {
      getToast().error(message);
    }

    if (onError) {
      onError(error);
    }

    // Retourner erreur standardisée
    return {
      error: true,
      code: 'REQUEST_ERROR',
      message,
      originalError: error
    };
  }
}
