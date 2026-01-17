# 🗑️ INVENTAIRE CODE MORT - HORIZON AI

**Date:** 2026-01-13  
**Audit basé sur:** AUDIT_TECHNIQUE_COMPLET.md  
**Total estimé:** ~35% du code backend orphelin

---

## 🎯 DÉCISION PAR CATÉGORIE

Pour chaque élément, 3 options :
1. ✅ **INTÉGRER** - Créer l'UI manquante (effort moyen/élevé)
2. 🔄 **MIGRER** - Adapter pour autre usage (effort moyen)
3. ❌ **SUPPRIMER** - Retirer complètement (effort faible, gain clarté)

---

## 1️⃣ COMPONENTS REACT ORPHELINS

### FileManager.jsx (230 lignes)
**État:** Composant complet, bien codé, fonctionnel  
**Problème:** Aucune route/bouton pour y accéder  
**Fonctionnalités:**
- Lecture de fichiers avec permissions
- Scan de directories
- Preview de fichiers (premiers 500 caractères)
- Configuration scope de lecture (global/directory)
- Gestion extensions autorisées

**Options:**

#### ✅ Option A: INTÉGRER dans AIChatPanel (Recommandé)
**Effort:** 2-3h  
**Plan:**
1. Ajouter bouton "📁 Add Context Files" dans ChatInput
2. Ouvrir FileManager en modal
3. Sélection → Ajouter aux `context_files` du chat
4. Backend dispatcher déjà prêt (ligne 205)

**Bénéfice:** Feature complète "AI avec accès fichiers" (comme Claude)

#### ❌ Option B: SUPPRIMER
**Effort:** 15 min  
**Plan:**
1. Supprimer `src/components/FileManager.jsx`
2. Supprimer commandes Rust context_reader (10 commandes)
3. Supprimer `src-tauri/src/context_reader_commands.rs` (219 lignes)
4. **PERTE:** 450+ lignes de code fonctionnel

**Risque:** Fonctionnalité demandée plus tard = refaire from scratch

---

### ContextPanel.jsx (180 lignes)
**État:** Composant complet, bien codé, fonctionnel  
**Problème:** Aucune route/bouton pour y accéder  
**Fonctionnalités:**
- Affichage contexte actuel (fichiers, mémoires, repos)
- Preview du prompt final avant envoi
- Gestion du contexte session/global

**Options:**

#### ✅ Option A: INTÉGRER dans AIChatPanel (Recommandé)
**Effort:** 1h  
**Plan:**
1. Ajouter bouton "🔍 View Context" dans ChatInput (à côté de Send)
2. Ouvrir ContextPanel en sidebar droite
3. Afficher `currentPrompt` du hook `useChatStreaming`

**Bénéfice:** Transparence totale du prompt final (debug + confiance)

#### 🔄 Option B: MIGRER vers PromptViewer
**Effort:** 30 min  
**Plan:**
1. Fusionner avec `PromptViewer.jsx` existant
2. Améliorer PromptViewer avec infos contexte
3. Supprimer ContextPanel.jsx

#### ❌ Option C: SUPPRIMER
**Effort:** 5 min  
**Perte:** Preview contexte avant envoi

---

## 2️⃣ COMMANDES RUST ORPHELINES (Context Reader)

**Fichier:** `src-tauri/src/context_reader_commands.rs` (219 lignes)

| Commande | Utilisée? | Effort Intégration |
|----------|-----------|-------------------|
| `read_file` | ❌ | 1h (FileManager) |
| `read_multiple_files` | ❌ | 1h (FileManager) |
| `read_file_confirmed` | ❌ | 1h (FileManager) |
| `scan_directory` | ❌ | 1h (FileManager) |
| `get_context_config` | ❌ | 30min |
| `set_context_scope` | ❌ | 30min |
| `get_file_preview` | ❌ | 1h (FileManager) |
| `update_context_config` | ❌ | 30min |
| `add_allowed_extension` | ❌ | 30min |
| `remove_allowed_extension` | ❌ | 30min |

**Total effort intégration:** 8h (si FileManager intégré)

**Options:**

#### ✅ Option A: GARDER (Recommandé si FileManager intégré)
- Commandes bien sécurisées (permission checks, path validation)
- Backend prêt pour FileManager UI

#### ❌ Option B: SUPPRIMER
- Économie: 219 lignes Rust
- Risque: Refaire si feature demandée

---

## 3️⃣ COMMANDES PYTHON ORPHELINES

### delete_model (worker/ipc/dispatcher.py)
**État:** Implémentée, jamais appelée  
**Usage potentiel:** Bouton "Delete" dans OllamaSetup pour supprimer modèles

**Options:**

#### ✅ Option A: INTÉGRER (Facile - 30min)
**Plan:**
1. Ajouter bouton "🗑️" dans OllamaSetup à côté de chaque modèle
2. Confirmation modal "Delete model X?"
3. Appeler `delete_model` via requestWorker

**Bénéfice:** Gestion modèles complète (liste + pull + delete)

#### ❌ Option B: SUPPRIMER
- Économie: 15 lignes Python
- Note: Ollama CLI peut supprimer via `ollama rm`

---

### get_conversation_metadata (V2.1)
**État:** Implémentée, partiellement utilisée  
**Usage actuel:** Appelée dans `handleSelectChat` mais résultat peu exploité  
**Données retournées:** title, model, timestamp, message_count, projectId

**Options:**

#### ✅ Option A: EXPLOITER (Recommandé - 1h)
**Plan:**
1. Afficher metadata dans ChatSidebar (nombre messages, date création)
2. Afficher badge projet lié
3. Permettre édition titre

**Bénéfice:** UX enrichie dans sidebar conversations

#### 🔄 Option B: SIMPLIFIER
- Retirer appel dans `handleSelectChat`
- Garder commande pour usage futur API

#### ❌ Option C: SUPPRIMER
- Si pas de plan d'utilisation

---

### update_conversation_project (V2.1)
**État:** Implémentée, jamais appelée  
**Usage potentiel:** Migrer conversation vers autre projet

**Options:**

#### ✅ Option A: INTÉGRER (2h)
**Plan:**
1. Menu contextuel sur conversation (clic droit)
2. Option "Move to project..."
3. Sélecteur projets
4. Appeler `update_conversation_project`

**Bénéfice:** Réorganisation flexible conversations

#### ❌ Option B: SUPPRIMER
- Si organisation projets pas prioritaire

---

### projects_get_or_create_orphan (V2.1 Sprint 2.2)
**État:** Implémentée, code présent dans AIChatPanel mais commenté  
**Usage:** Auto-créer projet "Orphelin" pour conversations sans projet

**Options:**

#### ✅ Option A: ACTIVER (Recommandé - 15min)
**Plan:**
1. Décommenter code dans `handleSelectChat` (lignes 518-544)
2. Tester comportement
3. Ajouter traduction pour nom "Orphan"/"Orphelin"

**Bénéfice:** Aucune conversation sans projet (organisation automatique)

#### ❌ Option B: SUPPRIMER
- Si organisation manuelle préférée

---

### get_repo_summary & detect_tech_debt
**État:** Implémentées, jamais appelées  
**Usage potentiel:** Analyse partielle repository (summary + dette technique)

**Options:**

#### ✅ Option A: INTÉGRER (3h)
**Plan:**
1. Ajouter bouton "📊 Detailed Analysis" dans RepoAnalyzer
2. Appeler `get_repo_summary` et `detect_tech_debt`
3. Afficher dans modal avec tabs (Summary / Tech Debt / Full Analysis)

**Bénéfice:** Analyse repository multi-niveaux

#### ❌ Option B: SUPPRIMER
- Si analyse de base `analyze_repository` suffit
- Économie: 60 lignes Python

---

## 4️⃣ PERMISSIONS V2.1 PHASE 3 NON EXPLOITÉES

### request_permission_with_scope & has_permission_with_context
**État:** Implémentées (Rust), jamais appelées  
**Fonctionnalités avancées:**
- Permissions temporaires (durée limitée)
- Permissions session (jusqu'à fermeture app)
- Permissions projet (isolées par projet)

**Usage actuel:** Frontend use seulement `request_permission` (legacy, global)

**Options:**

#### ✅ Option A: MIGRER FRONTEND (Recommandé - 4h)
**Plan:**
1. Changer `PermissionService.requestPermission()` pour utiliser `request_permission_with_scope`
2. Ajouter UI dans `PermissionRequestModal` pour choisir scope
3. Options: Global / Temporary (1h) / Session / Project
4. Exploiter isolation par projet

**Bénéfice:** Sécurité granulaire (demander permission juste pour 1 action)

#### 🔄 Option B: GARDER LEGACY
- Garder commandes V2.1 pour migration future
- Pas de changement frontend

#### ❌ Option C: SUPPRIMER V2.1
- Retirer commandes with_scope
- Simplifier à global only
- Économie: 100 lignes Rust

---

## 📊 RÉCAPITULATIF RECOMMANDATIONS

### ✅ INTÉGRER (Recommandé - Valeur élevée):
1. **FileManager + ContextPanel** → AIChatPanel (4h)
   - Feature killer: AI avec accès fichiers locaux
2. **delete_model** → OllamaSetup (30min)
   - Gestion modèles complète
3. **projects_get_or_create_orphan** → Activer (15min)
   - Organisation automatique conversations
4. **Permissions V2.1 Phase 3** → Migrer frontend (4h)
   - Sécurité granulaire

**Total effort:** ~9h  
**Bénéfice:** +4 features majeures, 0% code mort

---

### 🔄 MIGRER (Compromis):
1. **ContextPanel** → Fusionner dans PromptViewer (30min)
2. **get_conversation_metadata** → Exploiter partiellement (1h)

---

### ❌ SUPPRIMER (Gain clarté):
1. **get_repo_summary & detect_tech_debt** (si analyse de base suffit)
2. **update_conversation_project** (si pas prioritaire)

**Économie:** ~100 lignes Python

---

## 🎯 PLAN D'ACTION SUGGÉRÉ

### Sprint 1 (2h - Quick Wins):
1. ✅ Activer `projects_get_or_create_orphan` (15min)
2. ✅ Ajouter bouton delete model (30min)
3. ✅ Fusionner ContextPanel → PromptViewer (30min)
4. ✅ Exploiter metadata conversations (30min)

### Sprint 2 (4h - Features Majeures):
5. ✅ Intégrer FileManager dans AIChatPanel (3h)
6. ✅ Nettoyer code mort confirmé (1h)

### Sprint 3 (4h - V2.1 Phase 3):
7. ✅ Migrer Permissions vers V2.1 Phase 3 (4h)

**Total:** 10h répartis sur 3 sprints

---

## ❓ DÉCISION REQUISE

Pour chaque élément, choisir :
- ✅ **INTÉGRER** (créer UI)
- 🔄 **MIGRER** (adapter)
- ❌ **SUPPRIMER** (retirer)
- ⏸️ **GARDER** (future usage, marquer TODO)

**Question:** Voulez-vous que je commence par le **Sprint 1 (Quick Wins - 2h)** ?

Ou préférez-vous une approche différente ?
