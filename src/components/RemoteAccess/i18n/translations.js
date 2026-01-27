/**
 * Remote Access Translations
 * Centralized internationalization for the RemoteAccess component
 */

export const translations = {
  fr: {
    title: "ACCÈS DISTANT",
    subtitle: "Cloudflare Tunnel",
    description: "Accédez à votre IA locale depuis n'importe où",
    localFirst: "100% Local-First - Aucune donnée stockée dans le cloud",

    // Status
    tunnelActive: "Tunnel Actif",
    tunnelInactive: "Tunnel Inactif",
    connecting: "Connexion en cours...",

    // Actions
    enableRemoteAccess: "Activer l'accès distant",
    disableRemoteAccess: "Désactiver l'accès distant",

    // URL
    publicUrl: "URL Publique",
    copyUrl: "Copier l'URL",
    urlCopied: "URL copiée !",
    openInBrowser: "Ouvrir dans le navigateur",

    // Token
    authToken: "Token d'Authentification",
    generateNewToken: "Générer un nouveau token",
    regenerateToken: "Régénérer",
    tokenGenerated: "Token généré",
    tokenExpires: "Expire dans",
    hours: "heures",
    copyToken: "Copier le token",
    tokenCopied: "Token copié !",
    showToken: "Afficher",
    hideToken: "Masquer",
    tokenWarning: "Ce token ne sera affiché qu'une seule fois. Copiez-le maintenant !",

    // QR Code
    qrCode: "QR Code Mobile",
    scanQR: "Scannez ce code avec votre téléphone",
    showQR: "Afficher le QR Code",
    hideQR: "Masquer le QR Code",

    // Custom domain
    customDomainTitle: "Domaine personnalise",
    customDomainDesc: "Utilisez un tunnel Cloudflare nomme pour un lien fixe (ex: ai.example.com).",
    customDomainLabel: "Domaine/sous-domaine",
    customDomainTunnelName: "Nom du tunnel",
    customDomainCredentials: "Fichier credentials.json",
    customDomainSave: "Enregistrer",
    customDomainDisable: "Desactiver",
    customDomainSaved: "Configuration enregistree.",
    customDomainHint: "Redemarrez le tunnel pour appliquer le domaine.",
    customDomainPlaceholder: "ai.example.com",
    customTunnelPlaceholder: "horizon-ai",
    customCredentialsPlaceholder: "C:\\Users\\...\\<tunnel-id>.json",
    domainSaveError: "Erreur lors de l'enregistrement du domaine",

    // IP Allowlist
    ipAllowlist: "Liste Blanche IP",
    ipAllowlistDesc: "Restreindre l'accès à des IPs spécifiques (optionnel)",
    addIp: "Ajouter une IP",
    noIpRestriction: "Aucune restriction (toutes les IPs autorisées)",

    // Cloudflared
    cloudflaredRequired: "Cloudflared requis",
    cloudflaredNotInstalled: "Cloudflared n'est pas installé",
    installCloudflared: "Installer Cloudflared",
    installCommand: "Commande d'installation",
    version: "Version",

    // Security
    securityNote: "Note de sécurité",
    securityInfo: "Toutes les requêtes distantes nécessitent le token d'authentification. Le rate limiting protège contre les abus.",

    // Errors
    errorStarting: "Erreur lors du démarrage du tunnel",
    errorStopping: "Erreur lors de l'arrêt du tunnel",
    errorGeneratingToken: "Erreur lors de la génération du token"
  },
  en: {
    title: "REMOTE ACCESS",
    subtitle: "Cloudflare Tunnel",
    description: "Access your local AI from anywhere",
    localFirst: "100% Local-First - No data stored in the cloud",

    // Status
    tunnelActive: "Tunnel Active",
    tunnelInactive: "Tunnel Inactive",
    connecting: "Connecting...",

    // Actions
    enableRemoteAccess: "Enable remote access",
    disableRemoteAccess: "Disable remote access",

    // URL
    publicUrl: "Public URL",
    copyUrl: "Copy URL",
    urlCopied: "URL copied!",
    openInBrowser: "Open in browser",

    // Token
    authToken: "Authentication Token",
    generateNewToken: "Generate new token",
    regenerateToken: "Regenerate",
    tokenGenerated: "Token generated",
    tokenExpires: "Expires in",
    hours: "hours",
    copyToken: "Copy token",
    tokenCopied: "Token copied!",
    showToken: "Show",
    hideToken: "Hide",
    tokenWarning: "This token will only be displayed once. Copy it now!",

    // QR Code
    qrCode: "Mobile QR Code",
    scanQR: "Scan this code with your phone",
    showQR: "Show QR Code",
    hideQR: "Hide QR Code",

    // Custom domain
    customDomainTitle: "Custom domain",
    customDomainDesc: "Use a named Cloudflare Tunnel for a fixed link (example: ai.example.com).",
    customDomainLabel: "Domain/subdomain",
    customDomainTunnelName: "Tunnel name",
    customDomainCredentials: "credentials.json file",
    customDomainSave: "Save",
    customDomainDisable: "Disable",
    customDomainSaved: "Configuration saved.",
    customDomainHint: "Restart the tunnel to apply the domain.",
    customDomainPlaceholder: "ai.example.com",
    customTunnelPlaceholder: "horizon-ai",
    customCredentialsPlaceholder: "C:\\Users\\...\\<tunnel-id>.json",
    domainSaveError: "Failed to save custom domain",

    // IP Allowlist
    ipAllowlist: "IP Allowlist",
    ipAllowlistDesc: "Restrict access to specific IPs (optional)",
    addIp: "Add IP",
    noIpRestriction: "No restriction (all IPs allowed)",

    // Cloudflared
    cloudflaredRequired: "Cloudflared required",
    cloudflaredNotInstalled: "Cloudflared is not installed",
    installCloudflared: "Install Cloudflared",
    installCommand: "Install command",
    version: "Version",

    // Security
    securityNote: "Security Note",
    securityInfo: "All remote requests require the authentication token. Rate limiting protects against abuse.",

    // Errors
    errorStarting: "Error starting tunnel",
    errorStopping: "Error stopping tunnel",
    errorGeneratingToken: "Error generating token"
  }
};
