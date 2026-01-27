export const translations = {
  en: {
    nav: {
      dashboard: "HOME",
      chat: "ASSISTANT",
      library: "LIBRARY",
      security: "SECURITY",
      advanced: "ADVANCED CENTER",
      files: "FILES",
      memory: "MEMORY",
      remote: "REMOTE ACCESS",
      settings: "SETTINGS",
      models: "MODELS",
      license: "LICENSE"
    },

    topbar: {
      root_access: "LOCAL PROFILE",
      style_select: "AI STYLE",
      style_unavailable: "No styles available",
      ollama_online: "Ollama Online",
      offline: "Offline",
      checking: "Checking..."
    },



    // === NOUVEAU DASHBOARD ===
    dashboard: {
      systemReady: "System Ready",
      connecting: "Connecting...",
      greeting: {
        morning: "Good morning",
        afternoon: "Good afternoon",
        evening: "Good evening"
      },
      howCanIHelp: "How can I help you today?",
      selectModelFirst: "Select a model first ↗",
      askAnything: "Ask anything...",
      thinking: "Thinking...",
      continueConversation: "Continue conversation",
      // Quick Prompts
      prompts: {
        explain: "Explain a concept",
        write: "Write about...",
        code: "Help me code",
        summarize: "Summarize this"
      },
      // Quick Actions
      actions: {
        fullChat: "Full Chat",
        fullChatDesc: "Conversations with history",
        myModels: "My Models",
        myModelsDesc: "Manage installed models",
        settings: "Settings",
        settingsDesc: "Configure the app"
      },
      // Models
      recommendedModels: "Recommended Models",
      clickToInstall: "Click to install",
      install: "Install",
      // Status
      activeModel: "Active model:",
      noModelSelected: "No model selected",
      // Errors
      errorNoModel: "⚠️ Please select a model from the dropdown menu at the top (SELECT MODEL).\n\nIf no models appear, install one by clicking 'Install' below.",
      errorConnection: "❌ Connection error. Please check:\n• Ollama is running\n• Model is properly installed\n\nStart Ollama with: ollama serve",
      // Model descriptions
      modelFastLight: "Fast & light",
      modelBalanced: "Balanced",
      modelReasoning: "Reasoning"
      ,
      entryTitle: "What would you like to do?",
      entrySubtitle: "Everything stays on this computer unless you say otherwise.",
      intents: {
        ask: {
          title: "Ask a question",
          desc: "A clear, direct answer.",
          placeholder: "Ask your question..."
        },
        understand: {
          title: "Understand a text",
          desc: "Simple explanation, step by step.",
          placeholder: "Paste a text to explain..."
        },
        write: {
          title: "Writing help",
          desc: "Rewrite, improve, or draft.",
          placeholder: "Describe what you want to write..."
        },
        analyze: {
          title: "Analyze a project",
          desc: "Optional. For a local folder.",
          placeholder: "Tell me what to analyze..."
        }
      },
      secondary: {
        resumeTitle: "Resume a conversation",
        resumeDesc: "Find your recent chats",
        securityTitle: "Security",
        securityDesc: "Current mode",
        advancedTitle: "Advanced center"
      },
      security: {
        normal: "Normal",
        max: "Maximum security"
      },
      footer: {
        local: "Local assistant. No automatic sharing."
      }
    },

    styles: {
      quick: { label: "Fast", desc: "Short, direct answers." },
      clear: { label: "Clear & simple", desc: "Explains without jargon." },
      creative: { label: "Creative", desc: "Original ideas and examples." },
      structured: { label: "Structured", desc: "Plans, steps, lists." },
      precise: { label: "Precise", desc: "Careful details." }
    },
    labels: {
      style: "Style",
      intent: "Intent",
      model: "Model"
    },
    securityCenter: {
      title: "Security",
      subtitle: "Clear, human approvals. Nothing happens without you.",
      maximumTitle: "Maximum security",
      maximumDesc: "Always ask before sensitive actions.",
      enabled: "Enabled",
      disabled: "Disabled",
      confirmEnable: "Enable maximum security?",
      confirmDisable: "Disable maximum security?",
      remoteTitle: "Access from another device",
      remoteDesc: "Optional. You stay in control.",
      remoteAction: "Open access settings",
      remoteOn: "On",
      remoteOff: "Off",
      historyTitle: "Local history",
      historyDesc: "Stored on this device only.",
      historyAction: "Manage"
    },
    advancedCenter: {
      title: "Advanced Center",
      subtitle: "Optional",
      description: "Expert settings live here. You can ignore this screen.",
      modelsTitle: "Internal models",
      modelsDesc: "Manage installed models.",
      filesTitle: "Files & context",
      filesDesc: "Browse local files.",
      memoryTitle: "Memory",
      memoryDesc: "User and project memory.",
      remoteTitle: "Remote access",
      remoteDesc: "Access from another device.",
      settingsTitle: "Settings",
      settingsDesc: "Advanced configuration."
    },
    // === SETUP OLLAMA ===
    ollamaSetup: {
      title: "HORIZON AI",
      subtitle: "Initial Configuration",
      ollamaDetected: "Ollama detected.",
      ollamaReady: "System ready. Click Continue to start.",
      ollamaNotDetected: "Ollama is not detected.",
      ollamaRequired: "Ollama is required to run local AI models.",
      installing: "Installing Ollama...",
      installOllama: "Install Ollama",
      continueWithout: "Continue without Ollama",
      continue: "Continue",
      ollamaDesc: "Ollama allows running AI models locally on your machine."
    },
    dash: {
      title: "DASHBOARD",
      subtitle: "Horizon Forge Neural Interface",
      coreStatus: "Core Status",
      readyForCompute: "Ready for Compute",
      processor: "Processor",
      memory: "Memory",
      vram: "Neural VRAM",
      suggestedUnits: "Suggested Units",
      initialize: "Initialize",
      systemOps: "System Operations",
      searchPlaceholder: "SEARCH UNIT...",
      download: "Download",
      downloading: "Downloading...",
      custom_title: "ADD CUSTOM MODEL",
      custom_desc: "Download any model from the Ollama Hub by name (e.g., deepseek-coder:6.7b).",
      custom_placeholder: "ex: llama3.2:3b",
      btn_add: "DOWNLOAD",
      noModelsFound: "No models found matching",
      // Descriptions
      llama_desc: "Versatile AI",
      mistral_desc: "Balanced Performance",
      deepseek_desc: "Advanced Reasoning",
      phi_desc: "Lightweight",
      qwen_desc: "Coding Expert",
      code_desc: "Dev Assistant"
    },
    chat: {
      database: "Neural Archives",
      new_session: "Initialize Session",
      input_placeholder: "Tell me what you want to do...",
      execute: "Execute",
      active_flux: "Active Flux...",
      image_attached: "Image Attached",
      add_media: "Add Media"
    },
    files: {
      title: "DATA EXPLORER",
      storage_label: "Local Storage",
      filter_placeholder: "Filter your models...",
      ready: "Ready",
      delete_confirm_title: "Irreversible Action",
      delete_confirm_desc: "Delete this model permanently?",
      cancel: "Cancel",
      confirm: "Confirm",
      no_models: "No models installed in core."
    },
    settings: {
      title: "CORE",
      subtitle: "SYSTEM CONFIGURATION",
      interface_title: "INTERFACE & LANGUAGE",
      lang_label: "System Language",
      internet_label: "AI Internet Access",
      gpuAcceleration: "GPU Acceleration",
      gpuAcceleration_desc: "Use GPU for Ollama when available.",
      init_title: "INITIALIZATION",
      startup_label: "Run at Startup",
      startup_desc: "Launch at system startup.",
      startup_sub: "Start with Windows",
      update_label: "Auto Updates",
      update_desc: "Auto-update installed models.",
      update_sub: "Check AI Cores",
      identity_title: "OPERATOR IDENTITY",
      name_label: "System Display Name",
      save_btn: "SAVE SETTINGS",
      syncing: "SYNCING...",
      success: "System synchronized successfully.",
      error: "Error: Core unreachable.",
      storage_title: "STORAGE",
      storage_desc: "Define the location of model files (.gguf).",
      storage_placeholder: "Default (C:\\Users\\...)\\.ollama\\models",
      storage_browse: "BROWSE"
    },
    // === V2.1 SECURITY (Phase 3) ===
    security: {
      actionBlocked: "Action Blocked",
      actionBlockedReason: "This action requires a permission",
      missingPermission: "Missing permission",
      requestPermission: "Request Permission",
      learnMore: "Learn More",
      securityModeActive: "Security Mode Active",
      paranoModeDescription: "Maximum security asks for approval on every sensitive action.",
      permissionRequiredFor: "This permission is required for",
      permissionDescriptions: {
        FileRead: "Reading files from the local filesystem",
        FileWrite: "Writing or modifying files",
        CommandExecute: "Executing system commands",
        NetworkAccess: "Network access",
        RemoteAccess: "Remote access to the application",
        MemoryAccess: "Accessing memory data",
        RepoAnalyze: "Analyzing repository structure"
      },
      // Permission Request Modal
      permissionRequestTitle: "Permission Request",
      permissionRequestDescription: "You requested to authorize:",
      permissionWarning: "Enabling this permission allows the AI to access your files. Make sure you trust this action.",
      permissionScope: "Permission scope:",
      permissionScopeTemporary: "Temporary ({duration} minutes)",
      permissionScopeSession: "This session only",
      permissionScopeProject: "This project only",
      permissionDuration: "Duration (minutes):",
      permissionDuration15min: "15 minutes",
      permissionDuration1hour: "1 hour",
      permissionDuration8hours: "8 hours",
      permissionCancel: "Cancel",
      permissionAuthorize: "Authorize ({scope})",
      // Permission Bar
      permissionsLabel: "Permissions:",
      fileRead: "Read Files",
      fileWrite: "Write Files",
      repoAnalyze: "Analyze Repo",
      securityModeActive: "Security Mode Active",
      permissionGranted: "Granted",
      permissionDenied: "Denied",
      securityModeInactive: "Security disabled"
    }
  },
  fr: {
    nav: {
      dashboard: "ACCUEIL",
      chat: "ASSISTANT",
      library: "BIBLIOTHEQUE",
      security: "SECURITE",
      advanced: "CENTRE AVANCE",
      files: "FICHIERS",
        memory: "MEMOIRE",
        remote: "ACCES AUTRE APPAREIL",
        settings: "PARAMETRES",
        models: "MODELES",
        license: "LICENCE"
      },

        topbar: {
      root_access: "PROFIL LOCAL",
      style_select: "STYLE IA",
      style_unavailable: "Aucun style disponible",
      ollama_online: "Ollama en ligne",
      offline: "Hors ligne",
      checking: "Verification..."
    },

    // === NOUVEAU DASHBOARD ===
    dashboard: {
      systemReady: "Système Prêt",
      connecting: "Connexion...",
      greeting: {
        morning: "Bonjour",
        afternoon: "Bon après-midi",
        evening: "Bonsoir"
      },
      howCanIHelp: "Comment puis-je vous aider aujourd'hui ?",
      selectModelFirst: "Sélectionnez un modèle d'abord ↗",
      askAnything: "Posez votre question...",
      thinking: "Réflexion en cours...",
      continueConversation: "Continuer la conversation",
      // Quick Prompts
      prompts: {
        explain: "Explique-moi un concept",
        write: "Écris un texte sur...",
        code: "Aide-moi à coder",
        summarize: "Résume ce texte"
      },
      // Quick Actions
      actions: {
        fullChat: "Chat Complet",
        fullChatDesc: "Conversations avec historique",
        myModels: "Mes Modèles",
        myModelsDesc: "Gérer les modèles installés",
        settings: "Paramètres",
        settingsDesc: "Configurer l'application"
      },
      // Models
      recommendedModels: "Modèles Recommandés",
      clickToInstall: "Cliquez pour installer",
      install: "Installer",
      // Status
      activeModel: "Modèle actif :",
      noModelSelected: "Aucun modèle sélectionné",
      // Errors
      errorNoModel: "⚠️ Veuillez d'abord sélectionner un modèle dans le menu déroulant en haut de l'écran (CHOISIR MODÈLE).\n\nSi aucun modèle n'apparaît, installez-en un en cliquant sur 'Installer' ci-dessous.",
      errorConnection: "❌ Erreur de connexion. Vérifiez que :\n• Ollama est bien lancé\n• Le modèle est correctement installé\n\nLancez Ollama avec : ollama serve",
      // Model descriptions
      modelFastLight: "Rapide et léger",
      modelBalanced: "Équilibré",
      modelReasoning: "Raisonnement"
      ,
      entryTitle: "Que voulez-vous faire ?",
      entrySubtitle: "Tout reste sur cet ordinateur, sauf si vous dites le contraire.",
      intents: {
        ask: {
          title: "Poser une question",
          desc: "Une reponse claire et directe.",
          placeholder: "Posez votre question..."
        },
        understand: {
          title: "Comprendre un texte",
          desc: "Explication simple, etape par etape.",
          placeholder: "Collez un texte a expliquer..."
        },
        write: {
          title: "Aide a ecrire",
          desc: "Reecrire, ameliorer, ou rediger.",
          placeholder: "Decrivez ce que vous voulez ecrire..."
        },
        analyze: {
          title: "Analyser un projet",
          desc: "Optionnel. Pour un dossier local.",
          placeholder: "Dites ce que vous voulez analyser..."
        }
      },
      secondary: {
        resumeTitle: "Reprendre une conversation",
        resumeDesc: "Retrouvez vos derniers echanges",
        securityTitle: "Securite",
        securityDesc: "Mode actuel",
        advancedTitle: "Centre avance"
      },
      security: {
        normal: "Normal",
        max: "Securite maximale"
      },
      footer: {
        local: "Assistant local. Aucun partage automatique."
      }
    },

    styles: {
      quick: { label: "Rapide", desc: "Reponses courtes et directes." },
      clear: { label: "Clair et simple", desc: "Explique sans jargon." },
      creative: { label: "Creatif", desc: "Idees originales et exemples." },
      structured: { label: "Structure", desc: "Plans, etapes, listes." },
      precise: { label: "Precis", desc: "Details soignes." }
    },
    labels: {
      style: "Style",
      intent: "Intention",
      model: "Modele"
    },
    securityCenter: {
      title: "Securite",
      subtitle: "Toujours demander. Rien ne se fait sans vous.",
      maximumTitle: "Securite maximale",
      maximumDesc: "Toujours demander avant une action sensible.",
      enabled: "Active",
      disabled: "Inactive",
      confirmEnable: "Activer la securite maximale ?",
      confirmDisable: "Desactiver la securite maximale ?",
      remoteTitle: "Acces depuis un autre appareil",
      remoteDesc: "Optionnel. Vous gardez le controle.",
      remoteAction: "Ouvrir les reglages d'acces",
      remoteOn: "On",
      remoteOff: "Off",
      historyTitle: "Historique local",
      historyDesc: "Stocke uniquement sur cet ordinateur.",
      historyAction: "Gerer"
    },
    advancedCenter: {
      title: "Centre avance",
      subtitle: "Optionnel",
      description: "Les reglages experts sont ici. Vous pouvez ignorer cet ecran.",
      modelsTitle: "Modeles internes",
      modelsDesc: "Gerer les modeles installes.",
      filesTitle: "Fichiers et contexte",
      filesDesc: "Parcourir les fichiers locaux.",
      memoryTitle: "Memoire",
      memoryDesc: "Memoire utilisateur et projet.",
      remoteTitle: "Acces distant",
      remoteDesc: "Acces depuis un autre appareil.",
      settingsTitle: "Parametres",
      settingsDesc: "Configuration avancee."
    },
    // === SETUP OLLAMA ===
    ollamaSetup: {
      title: "HORIZON AI",
      subtitle: "Configuration Initiale",
      ollamaDetected: "Ollama détecté.",
      ollamaReady: "Système prêt. Cliquez sur Continuer pour démarrer.",
      ollamaNotDetected: "Ollama n'est pas détecté.",
      ollamaRequired: "Ollama est nécessaire pour utiliser les modèles d'IA locaux.",
      installing: "Installation d'Ollama en cours...",
      installOllama: "Installer Ollama",
      continueWithout: "Continuer sans Ollama",
      continue: "Continuer",
      ollamaDesc: "Ollama permet d'exécuter des modèles d'IA localement sur votre machine."
    },
    dash: {
      title: "TABLEAU DE BORD",
      subtitle: "Interface Neurale Horizon Forge",
      coreStatus: "Statut du Noyau",
      readyForCompute: "Prêt pour Calcul",
      processor: "Processeur",
      memory: "Mémoire",
      vram: "VRAM Neurale",
      suggestedUnits: "Unités Suggérées",
      initialize: "Initialiser",
      systemOps: "Opérations Système",
      searchPlaceholder: "CHERCHER UNE UNITÉ...",
      download: "Télécharger",
      downloading: "Téléchargement...",
      custom_title: "AJOUTER MODÈLE",
      custom_desc: "Téléchargez n'importe quel modèle depuis Ollama Hub (ex: deepseek-coder:6.7b).",
      custom_placeholder: "ex: llama3.2:3b",
      btn_add: "TÉLÉCHARGER",
      noModelsFound: "Aucun modèle trouvé correspondant à",
      // Descriptions
      llama_desc: "IA Polyvalente",
      mistral_desc: "Performance Équilibrée",
      deepseek_desc: "Raisonnement Avancé",
      phi_desc: "Léger et Rapide",
      qwen_desc: "Expert en Code",
      code_desc: "Assistant Développeur"
    },
    chat: {
      database: "Archives Neurales",
      new_session: "Initialiser Session",
      input_placeholder: "ENTRER UNE REQUÊTE SYSTÈME...",
      execute: "Exécuter",
      active_flux: "Flux actif...",
      image_attached: "Image Attachée",
      add_media: "Ajouter média"
    },
    files: {
      title: "EXPLORATEUR DATA",
      storage_label: "Stockage Local",
      filter_placeholder: "Filtrer vos modèles...",
      ready: "Prêt",
      delete_confirm_title: "Action Irréversible",
      delete_confirm_desc: "Supprimer ce modèle définitivement ?",
      cancel: "Annuler",
      confirm: "Confirmer",
      no_models: "Aucun modèle installé dans le noyau."
    },
    settings: {
      title: "CORE",
      subtitle: "CONFIGURATION SYSTÈME",
      interface_title: "INTERFACE & LANGUE",
      lang_label: "Langue du système",
      internet_label: "Accès Internet IA",
      gpuAcceleration: "Acceleration GPU",
      gpuAcceleration_desc: "Utiliser le GPU pour Ollama quand disponible.",
      init_title: "INITIALISATION",
      startup_label: "Lancement au démarrage",
      startup_desc: "Lancer au demarrage du systeme.",
      startup_sub: "Démarrer avec Windows",
      update_label: "Mises à jour Auto",
      update_desc: "Mettre a jour automatiquement les modeles installes.",
      update_sub: "Vérifier les Noyaux IA",
      identity_title: "IDENTITÉ DE L'OPÉRATEUR",
      name_label: "Nom d'affichage système",
      save_btn: "ENREGISTRER LES MODIFICATIONS",
      syncing: "SYNCHRONISATION...",
      success: "Configuration synchronisée avec succès.",
      error: "Erreur : Le noyau est injoignable.",
      storage_title: "STOCKAGE",
      storage_desc: "Définissez l'emplacement des fichiers de modèles (.gguf).",
      storage_placeholder: "Par défaut (C:\\Users\\...)\\.ollama\\models",
      storage_browse: "PARCOURIR"
    },
    // === V2.1 SÉCURITÉ (Phase 3) ===
    security: {
      actionBlocked: "Action Bloquée",
      actionBlockedReason: "Cette action nécessite une permission",
      missingPermission: "Permission manquante",
      requestPermission: "Demander Permission",
      learnMore: "En Savoir Plus",
      securityModeActive: "Mode Sécurité Actif",
      paranoModeDescription: "La securite maximale demande votre accord pour chaque action sensible.",
      permissionRequiredFor: "Cette permission est requise pour",
      permissionDescriptions: {
        FileRead: "Lire des fichiers depuis le système de fichiers local",
        FileWrite: "Écrire ou modifier des fichiers",
        CommandExecute: "Exécuter des commandes système",
        NetworkAccess: "Accès réseau",
        RemoteAccess: "Accès distant à l'application",
        MemoryAccess: "Accéder aux données mémoire",
        RepoAnalyze: "Analyser la structure d'un repository"
      },
      // Modal Demande Permission
      permissionRequestTitle: "Demande de Permission",
      permissionRequestDescription: "Vous avez demandé à autoriser :",
      permissionWarning: "Activer cette permission permet à l'IA d'accéder à vos fichiers. Assurez-vous de faire confiance à cette action.",
      permissionScope: "Portée de la permission :",
      permissionScopeTemporary: "Temporaire ({duration} minutes)",
      permissionScopeSession: "Cette session uniquement",
      permissionScopeProject: "Ce projet uniquement",
      permissionDuration: "Durée (minutes) :",
      permissionDuration15min: "15 minutes",
      permissionDuration1hour: "1 heure",
      permissionDuration8hours: "8 heures",
      permissionCancel: "Annuler",
      permissionAuthorize: "Autoriser ({scope})",
      // Barre Permissions
      permissionsLabel: "Permissions :",
      fileRead: "Lecture Fichiers",
      fileWrite: "Écriture Fichiers",
      repoAnalyze: "Analyser Repo",
      securityModeActive: "Mode Sécurité Actif",
      permissionGranted: "Accordée",
      permissionDenied: "Refusée",
      securityModeInactive: "Securite desactivee"
    }
  }
};
