# 📘 Guide Utilisateur - Horizon AI v1.0

## 🎯 Présentation

**Horizon AI** est une application desktop d'intelligence artificielle qui fonctionne **100% en local** sur votre ordinateur. Aucune donnée n'est envoyée sur internet - tout reste sur votre machine.

---

## 🚀 Premier Lancement

### Installation automatique

Au premier lancement, l'application va :
1. **Vérifier** si Ollama (le moteur IA) est installé
2. **Installer** automatiquement Ollama si nécessaire
3. **Télécharger** un modèle IA par défaut (llama3.2:3b - ~2GB)

> 💡 Cette opération peut prendre 2-5 minutes selon votre connexion internet.

---

## 🖥️ Interface Principale

### Barre de navigation (gauche)

| Icône | Section | Description |
|-------|---------|-------------|
| 📊 | **Tableau de bord** | Page d'accueil avec mini-chat rapide |
| 💬 | **Assistant IA** | Chat complet avec historique |
| 📁 | **Explorateur Data** | Gestion des modèles IA |
| ⚙️ | **Configuration** | Paramètres de l'application |

### Barre supérieure

- **Sélecteur de modèle** : Choisissez le modèle IA à utiliser
- **Indicateur utilisateur** : Affiche votre nom et accès

### Barre latérale (bas)

- **CPU** : Utilisation du processeur
- **RAM** : Mémoire utilisée
- **VRAM** : Mémoire GPU (si disponible)

---

## 💬 Comment utiliser le Chat IA

### 1. Sélectionner un modèle

Cliquez sur le menu déroulant en haut et choisissez un modèle :
- **llama3.2:3b** - Rapide et léger (recommandé)
- **mistral** - Équilibré
- **deepseek-r1:7b** - Bon pour le raisonnement

### 2. Poser une question

1. Tapez votre message dans le champ en bas
2. Appuyez sur **Entrée** ou cliquez sur le bouton **Envoyer**
3. L'IA répondra en temps réel (streaming)

### 3. Actions disponibles

| Action | Description |
|--------|-------------|
| **⏹️ Stop** | Interrompre la génération |
| **📋 Copier** | Copier la réponse |
| **🔄 Réessayer** | Relancer en cas d'erreur |
| **🗑️ Supprimer** | Supprimer une conversation |

### 4. Conversations

- Cliquez sur **"+ Nouvelle Session"** pour démarrer une nouvelle conversation
- L'historique est automatiquement sauvegardé
- Cliquez sur une conversation passée pour la reprendre

---

## ⬇️ Installer de nouveaux modèles

### Depuis le Tableau de bord

1. Allez sur la page **Tableau de bord**
2. Scrollez jusqu'à "Modèles Recommandés"
3. Cliquez sur **Install** à côté du modèle souhaité
4. Attendez la fin du téléchargement

### Modèles recommandés

| Modèle | Taille | Utilisation |
|--------|--------|-------------|
| llama3.2:3b | 2 GB | Usage général, rapide |
| mistral | 4 GB | Équilibré, polyvalent |
| deepseek-r1:7b | 4 GB | Raisonnement, code |
| codellama | 4 GB | Programmation |
| phi | 2 GB | Léger, rapide |

---

## ⚙️ Paramètres

### Interface

- **Langue** : Français 🇫🇷 ou English 🇬🇧
- **Accès Internet** : Activer/désactiver l'accès réseau

### Système

- **Version** : Affiche la version actuelle
- **Démarrage** : Lancer avec Windows *(bientôt disponible)*
- **Mises à jour** : Auto-update *(bientôt disponible)*

### Stockage

- **Chemin des modèles** : Personnaliser où Ollama stocke les modèles

### Identité

- **Nom d'utilisateur** : Personnalisez votre nom affiché

---

## ❓ FAQ

### L'application ne démarre pas

1. Vérifiez que vous avez suffisamment d'espace disque (10 GB minimum)
2. Essayez de redémarrer votre ordinateur
3. Lancez `ollama serve` dans un terminal

### Le chat ne répond pas

1. Vérifiez qu'un modèle est sélectionné en haut
2. Vérifiez qu'Ollama fonctionne (le statut doit être vert)
3. Essayez de sélectionner un autre modèle

### Le téléchargement d'un modèle échoue

1. Vérifiez votre connexion internet
2. Essayez un modèle plus petit (llama3.2:3b)
3. Libérez de l'espace disque

### L'application est lente

1. Fermez les autres applications gourmandes
2. Utilisez un modèle plus léger (phi, llama3.2:3b)
3. Si vous avez un GPU NVIDIA, il sera utilisé automatiquement

---

## 🔧 Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Entrée` | Envoyer le message |
| `Ctrl+N` | Nouvelle conversation |

---

## 📞 Support

En cas de problème, vérifiez :
1. Les logs dans la console (bouton en bas à droite)
2. Que Ollama est bien lancé
3. Que vous avez assez d'espace disque

---

## 📋 Informations techniques

- **Frontend** : React + Tauri
- **Backend** : Python (Worker local)
- **IA** : Ollama (modèles locaux)
- **OS supporté** : Windows 10/11 (64-bit)

---

*Horizon AI v1.0 - Propulsé par l'IA locale* ⚡
