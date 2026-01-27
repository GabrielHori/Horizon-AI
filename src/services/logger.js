/**
 * Logger Service - Système de logging conditionnel pour Horizon AI
 * 
 * En développement: tous les logs sont affichés
 * En production: seuls les warnings et errors sont affichés
 * 
 * Usage:
 *   import { logger } from './services/logger';
 *   
 *   logger.debug('Message de debug');  // Dev only
 *   logger.info('Info importante');    // Dev only
 *   logger.warn('Attention');          // Toujours
 *   logger.error('Erreur', error);     // Toujours
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Niveaux de log avec couleurs
const LOG_LEVELS = {
    DEBUG: { priority: 0, color: '#9CA3AF', prefix: '🔍' },
    INFO: { priority: 1, color: '#3B82F6', prefix: 'ℹ️' },
    WARN: { priority: 2, color: '#F59E0B', prefix: '⚠️' },
    ERROR: { priority: 3, color: '#EF4444', prefix: '❌' },
};

// Niveau minimum pour afficher les logs (en prod: WARN, en dev: DEBUG)
const MIN_LEVEL = isDev ? 0 : 2;

/**
 * Formate un message de log
 */
function formatMessage(level, message, ...args) {
    const config = LOG_LEVELS[level];
    const timestamp = new Date().toLocaleTimeString();

    return {
        prefix: `${config.prefix} [${timestamp}] [${level}]`,
        message,
        args,
        style: `color: ${config.color}; font-weight: bold;`,
    };
}

/**
 * Affiche un log si le niveau est suffisant
 */
function log(level, message, ...args) {
    const config = LOG_LEVELS[level];

    // Vérifier si le niveau est suffisant
    if (config.priority < MIN_LEVEL) {
        return;
    }

    const formatted = formatMessage(level, message, ...args);

    // Utiliser la méthode console appropriée
    switch (level) {
        case 'ERROR':
            console.error(formatted.prefix, message, ...args);
            break;
        case 'WARN':
            console.warn(formatted.prefix, message, ...args);
            break;
        case 'INFO':
            console.info(`%c${formatted.prefix}`, formatted.style, message, ...args);
            break;
        case 'DEBUG':
        default:
            console.log(`%c${formatted.prefix}`, formatted.style, message, ...args);
            break;
    }
}

/**
 * Logger principal exporté
 */
export const logger = {
    /**
     * Log de debug (dev uniquement)
     */
    debug: (message, ...args) => log('DEBUG', message, ...args),

    /**
     * Log d'information (dev uniquement)
     */
    info: (message, ...args) => log('INFO', message, ...args),

    /**
     * Log d'avertissement (toujours affiché)
     */
    warn: (message, ...args) => log('WARN', message, ...args),

    /**
     * Log d'erreur (toujours affiché)
     */
    error: (message, ...args) => log('ERROR', message, ...args),

    /**
     * Log conditionnel uniquement en dev
     */
    devOnly: (message, ...args) => {
        if (isDev) {
            console.log('🛠️ [DEV]', message, ...args);
        }
    },

    /**
     * Log d'un objet/état pour debug
     */
    inspect: (label, obj) => {
        if (isDev) {
            console.groupCollapsed(`🔎 [INSPECT] ${label}`);
            console.dir(obj);
            console.groupEnd();
        }
    },

    /**
     * Mesure le temps d'exécution d'une opération
     */
    time: (label) => {
        if (isDev) {
            console.time(`⏱️ ${label}`);
        }
    },

    timeEnd: (label) => {
        if (isDev) {
            console.timeEnd(`⏱️ ${label}`);
        }
    },

    /**
     * Vérifier si on est en mode dev
     */
    isDev: () => isDev,
};

// Export par défaut
export default logger;
