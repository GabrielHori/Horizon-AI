export const translations = {
  en: {
    nav: {
      dashboard: "DASHBOARD",
      chat: "AI ASSISTANT",
      files: "DATA EXPLORER",
      settings: "CONFIGURATION"
    },
    topbar: {
      root_access: "ROOT ACCESS",
      model_select: "SELECT MODEL",
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
      input_placeholder: "ENTER A SYSTEM REQUEST...",
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
      init_title: "INITIALIZATION",
      startup_label: "Run at Startup",
      startup_sub: "Start with Windows",
      update_label: "Auto Updates",
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
    }
  },
  fr: {
    nav: {
      dashboard: "TABLEAU DE BORD",
      chat: "ASSISTANT IA",
      files: "EXPLORATEUR DATA",
      settings: "CONFIGURATION"
    },
    topbar: {
      root_access: "ACCÈS ROOT",
      model_select: "CHOISIR MODÈLE",
      ollama_online: "Ollama en ligne",
      offline: "Hors ligne",
      checking: "Vérification..."
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
      init_title: "INITIALISATION",
      startup_label: "Lancement au démarrage",
      startup_sub: "Démarrer avec Windows",
      update_label: "Mises à jour Auto",
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
    }
  }
};
