/**
 * Permission Detector - Détection de demandes de permission dans les messages utilisateur (V2.1 Phase 3)
 * 
 * Responsabilités:
 * - Analyser le message utilisateur pour détecter des demandes explicites de permission
 * - Retourner la permission détectée avec description
 * - Patterns FR/EN supportés
 * 
 * ⚠️ SÉCURITÉ : Toujours demander confirmation explicite, jamais d'activation automatique
 */

/**
 * Détecte une demande de permission dans un message utilisateur
 * 
 * @param {string} message - Message de l'utilisateur
 * @param {string} language - Langue ('fr' ou 'en')
 * @returns {{detected: boolean, permission?: string, description?: string}} - Résultat de la détection
 */
export const detectPermissionRequest = (message, language = 'fr') => {
  if (!message || typeof message !== 'string') {
    return { detected: false };
  }

  const lowerMessage = message.toLowerCase().trim();

  // Patterns de détection (FR et EN)
  const patterns = [
    // FileRead
    {
      permission: 'FileRead',
      keywords: [
        // FR
        'autorise.*accès.*fichier',
        'autorise.*lecture',
        'autorise.*lire',
        'permets.*accès.*fichier',
        'permets.*lecture',
        'donne.*accès.*fichier',
        'donne.*lecture',
        // EN
        'allow.*file.*access',
        'allow.*read',
        'authorize.*file.*access',
        'authorize.*read',
        'enable.*file.*read',
        'grant.*file.*access'
      ],
      description: language === 'fr' 
        ? 'Accès en lecture aux fichiers'
        : 'Read access to files'
    },
    // FileWrite
    {
      permission: 'FileWrite',
      keywords: [
        // FR
        'autorise.*écriture',
        'autorise.*modification',
        'autorise.*écrire',
        'permets.*écriture',
        'permets.*modifier',
        'donne.*écriture',
        'donne.*permission.*écrire',
        // EN
        'allow.*write',
        'allow.*modify',
        'authorize.*write',
        'authorize.*modify',
        'enable.*write',
        'grant.*write.*permission'
      ],
      description: language === 'fr'
        ? 'Accès en écriture aux fichiers'
        : 'Write access to files'
    },
    // RepoAnalyze
    {
      permission: 'RepoAnalyze',
      keywords: [
        // FR
        'autorise.*repo',
        'autorise.*repository',
        'autorise.*analyse.*repo',
        'permets.*repo',
        'permets.*repository',
        'donne.*accès.*repo',
        // EN
        'allow.*repo',
        'allow.*repository',
        'authorize.*repo',
        'enable.*repo.*access',
        'grant.*repo.*access'
      ],
      description: language === 'fr'
        ? 'Analyse de repository'
        : 'Repository analysis'
    },
    // CommandExecute
    {
      permission: 'CommandExecute',
      keywords: [
        // FR
        'autorise.*commande',
        'autorise.*exécuter',
        'permets.*commande',
        'permets.*exécuter',
        'donne.*permission.*exécuter',
        // EN
        'allow.*command',
        'allow.*execute',
        'authorize.*command',
        'enable.*command.*execution'
      ],
      description: language === 'fr'
        ? 'Exécution de commandes système'
        : 'System command execution'
    }
  ];

  // Tester chaque pattern
  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      try {
        // Créer regex avec mot entier (pour éviter faux positifs)
        // Exemple: "autorise accès fichier" mais pas "information"
        const regex = new RegExp(`\\b${keyword.replace(/\.\*/g, '\\s+')}\\b`, 'i');
        if (regex.test(lowerMessage)) {
          return {
            detected: true,
            permission: pattern.permission,
            description: pattern.description
          };
        }
      } catch (regexError) {
        // Si regex invalide, essayer pattern simple
        if (lowerMessage.includes(keyword.replace(/\.\*/g, ' ').split(' ')[0])) {
          return {
            detected: true,
            permission: pattern.permission,
            description: pattern.description
          };
        }
      }
    }
  }

  return { detected: false };
};

/**
 * Récupère la description d'une permission
 * 
 * @param {string} permission - Type de permission
 * @param {string} language - Langue ('fr' ou 'en')
 * @returns {string} - Description de la permission
 */
export const getPermissionDescription = (permission, language = 'fr') => {
  const descriptions = {
    fr: {
      FileRead: 'Lire des fichiers depuis le système de fichiers local',
      FileWrite: 'Écrire ou modifier des fichiers',
      CommandExecute: 'Exécuter des commandes système',
      NetworkAccess: 'Accès réseau',
      RemoteAccess: 'Accès distant à l\'application',
      MemoryAccess: 'Accéder aux données mémoire',
      RepoAnalyze: 'Analyser la structure d\'un repository'
    },
    en: {
      FileRead: 'Reading files from the local filesystem',
      FileWrite: 'Writing or modifying files',
      CommandExecute: 'Executing system commands',
      NetworkAccess: 'Network access',
      RemoteAccess: 'Remote access to the application',
      MemoryAccess: 'Accessing memory data',
      RepoAnalyze: 'Analyzing repository structure'
    }
  };

  return descriptions[language]?.[permission] || permission;
};
