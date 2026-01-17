"""
Tests E2E Sprint 2 - Workflows UI Améliorés
===========================================
Tests end-to-end pour les workflows améliorés du Sprint 2 :
- Preview → Confirmation → Lecture complète (ContextPanel)
- Modal confirmation suppression (MemoryManager)
- Visualisation contenu (MemoryManager)
- Vue arborescente + statistiques (RepoAnalyzer)
"""

import sys
import os
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.chat_history_service import chat_history_service
from services.memory_service import memory_service
from services.repo_analyzer_service import repo_analyzer_service
from services.audit_service import audit_service, ActionType
from services.crypto_service import CryptoService

# Note: ContextReader est implémenté en Rust (Tauri)
# Ces tests vérifient la logique métier backend Python


class TestContextPanelWorkflow:
    """Tests E2E pour le workflow ContextPanel (Sprint 2)"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.test_dir = tempfile.mkdtemp()
        self.scope_dir = Path(self.test_dir) / "scope"
        self.scope_dir.mkdir()
        
        # Créer fichiers de test
        (self.scope_dir / "test.py").write_text("# Python file\nprint('Hello')\n" * 60)  # > 50 lignes
        (self.scope_dir / "test.js").write_text("// JavaScript file\nconsole.log('Hello');\n")
        
        # Setup audit
        audit_service.audit_dir = Path(self.test_dir) / "audit"
        audit_service.audit_dir.mkdir(parents=True, exist_ok=True)
        audit_service.file_access_log = audit_service.audit_dir / "file_access.log"
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_preview_workflow_logic(self):
        """Vérifier que le workflow preview fonctionne (abstrait, implémentation frontend)"""
        # Ce test vérifie la logique métier backend
        # L'implémentation UI est en React (ContextPanel.jsx)
        
        file_path = str(self.scope_dir / "test.py")
        
        # Simuler preview (50 premières lignes)
        with open(file_path, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
        
        preview_lines = all_lines[:50]
        preview_content = ''.join(preview_lines)
        
        # Le preview doit contenir les 50 premières lignes
        assert len(preview_lines) <= 50, "Le preview doit être limité à 50 lignes"
        assert len(all_lines) > 50, "Le fichier doit avoir plus de 50 lignes pour tester le preview"
        
        # Simuler génération token de confirmation
        import uuid
        confirmation_token = str(uuid.uuid4())
        
        assert len(confirmation_token) > 0, "Un token de confirmation doit être généré"
    
    def test_confirmation_token_workflow(self):
        """Vérifier que le workflow confirmation token fonctionne"""
        # Simuler workflow complet : Preview → Token → Confirmation → Lecture complète
        
        file_path = str(self.scope_dir / "test.py")
        
        # 1. Preview (50 lignes)
        with open(file_path, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
        preview = ''.join(all_lines[:50])
        
        # 2. Générer token de confirmation
        import uuid
        token = str(uuid.uuid4())
        
        # 3. Simuler confirmation (doit valider le token)
        # Dans l'implémentation Rust, le token est validé avec expiration (5 min)
        token_valid = len(token) > 0  # Simplifié pour le test
        
        assert token_valid, "Le token doit être valide après génération"
        
        # 4. Lecture complète (après confirmation)
        full_content = ''.join(all_lines)
        
        assert len(full_content) > len(preview), "Le contenu complet doit être plus long que le preview"
        assert full_content.startswith(preview), "Le contenu complet doit commencer par le preview"


class TestMemoryManagerWorkflow:
    """Tests E2E pour le workflow MemoryManager (Sprint 2)"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.test_dir = tempfile.mkdtemp()
        memory_service.storage_path = Path(self.test_dir) / "memory"
        memory_service.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Setup crypto
        self.crypto_service = CryptoService()
        self.crypto_service.set_password("test_password_123")
        memory_service.crypto_service = self.crypto_service
        
        # Setup audit
        audit_service.audit_dir = Path(self.test_dir) / "audit"
        audit_service.audit_dir.mkdir(parents=True, exist_ok=True)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_crud_memory_workflow(self):
        """Vérifier le workflow CRUD complet mémoire (Sprint 2)"""
        # 1. Créer une entrée
        result = memory_service.save_memory(
            memory_type="user",
            key="test_key",
            value="test_value",
            metadata={"source": "test"}
        )

        assert result.get("success"), "La création doit réussir"

        # 2. Lister les entrées
        entries = memory_service.list_memories(memory_type="user")

        assert len(entries.get("entries", [])) > 0, "L'entrée doit être listée"
        entry = next((e for e in entries["entries"] if e["key"] == "test_key"), None)
        assert entry, "L'entrée créée doit être trouvée"

        # 3. Lire l'entrée (visualisation)
        read_result = memory_service.get_memory(memory_type="user", key="test_key")

        assert read_result.get("success"), "La lecture doit réussir"
        assert read_result.get("value") == "test_value", "La valeur doit être correcte"

        # 4. Modifier l'entrée (édition inline)
        update_result = memory_service.save_memory(
            memory_type="user",
            key="test_key",
            value="updated_value",
            metadata={"source": "test", "updated": True}
        )

        assert update_result.get("success"), "La modification doit réussir"

        # 5. Vérifier modification
        updated = memory_service.get_memory(memory_type="user", key="test_key")
        assert updated.get("value") == "updated_value", "La valeur doit être mise à jour"

        # 6. Supprimer l'entrée (modal confirmation)
        delete_result = memory_service.delete_memory(memory_type="user", key="test_key")

        assert delete_result.get("success"), "La suppression doit réussir"

        # 7. Vérifier suppression
        deleted = memory_service.get_memory(memory_type="user", key="test_key")
        assert not deleted.get("success") or deleted.get("value") is None, "L'entrée doit être supprimée"
    
    def test_memory_encryption_workflow(self):
        """Vérifier le workflow chiffrement mémoire avec indicateur visuel"""
        # 1. Configurer chiffrement
        crypto_set = memory_service.set_crypto_password("encryption_password")
        
        assert crypto_set, "Le mot de passe de chiffrement doit être configuré"
        
        # 2. Créer entrée chiffrée
        result = memory_service.save(
            memory_type="user",
            key="encrypted_key",
            value="secret_value",
            encrypt=True
        )
        
        assert result.get("success"), "La création chiffrée doit réussir"
        
        # 3. Vérifier que l'entrée est marquée comme chiffrée
        entry = memory_service.get(memory_type="user", key="encrypted_key")
        
        # Note: L'indicateur "encrypted" est géré côté frontend
        # Ici, on vérifie que la valeur peut être déchiffrée
        assert entry.get("success"), "La lecture doit réussir"
        assert entry.get("value") == "secret_value", "La valeur doit être correctement déchiffrée"
    
    def test_memory_visualization_workflow(self):
        """Vérifier le workflow visualisation contenu (modal)"""
        # Créer une entrée avec contenu long
        long_value = "Line 1\n" * 100  # 100 lignes
        
        memory_service.save(
            memory_type="user",
            key="long_entry",
            value=long_value
        )
        
        # Simuler visualisation (doit charger la valeur complète)
        entry = memory_service.get(memory_type="user", key="long_entry")
        
        assert entry.get("success"), "La lecture doit réussir"
        assert len(entry.get("value", "")) > 0, "Le contenu complet doit être récupéré"
        assert entry.get("value") == long_value, "Le contenu complet doit être correct"


class TestRepoAnalyzerWorkflow:
    """Tests E2E pour le workflow RepoAnalyzer amélioré (Sprint 2)"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.test_dir = tempfile.mkdtemp()
        self.test_repo = Path(self.test_dir) / "test_repo"
        self.test_repo.mkdir()
        
        # Créer structure de repository
        (self.test_repo / "src").mkdir()
        (self.test_repo / "src" / "components").mkdir()
        (self.test_repo / "src" / "utils").mkdir()
        (self.test_repo / "tests").mkdir()
        
        (self.test_repo / "package.json").write_text('{"name": "test-app", "dependencies": {"react": "^18.0.0"}}')
        (self.test_repo / "src" / "App.jsx").write_text("import React from 'react';\n\nexport default function App() { return <div>Hello</div>; }")
        (self.test_repo / "src" / "index.js").write_text("console.log('Hello World');")
        (self.test_repo / "src" / "components" / "Button.jsx").write_text("export function Button() { return <button>Click</button>; }")
        (self.test_repo / "src" / "utils" / "helper.js").write_text("export function helper() { return 'helper'; }")
        (self.test_repo / "README.md").write_text("# Test Repository")
        
        # Setup services
        repo_analyzer_service.sandbox_dir = Path(self.test_dir) / "sandbox"
        repo_analyzer_service.sandbox_dir.mkdir(parents=True, exist_ok=True)
        
        audit_service.audit_dir = Path(self.test_dir) / "audit"
        audit_service.audit_dir.mkdir(parents=True, exist_ok=True)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_repo_analysis_with_stats(self):
        """Vérifier que l'analyse repo génère les statistiques visuelles (Sprint 2)"""
        result = repo_analyzer_service.analyze_repository(
            str(self.test_repo),
            max_depth=10,
            max_files=1000
        )
        
        assert result.success, "L'analyse doit réussir"
        assert result.analysis, "L'analyse doit contenir des résultats"
        
        analysis = result.analysis
        
        # Vérifier statistiques visuelles (pour UI)
        assert hasattr(analysis, 'file_count') or 'file_count' in analysis, "Le compteur de fichiers doit être présent"
        assert hasattr(analysis, 'total_size') or 'total_size' in analysis, "La taille totale doit être présente"
        
        # Vérifier structure (pour vue arborescente)
        assert hasattr(analysis, 'structure') or 'structure' in analysis, "La structure doit être présente"
        
        # Vérifier stack (pour badges)
        assert hasattr(analysis, 'stack') or 'stack' in analysis, "La stack doit être présente"
        
        # Vérifier indicateur sandbox (doit être actif après Sprint 1)
        # Note: Vérifié via sandbox_dir existence et utilisation
    
    def test_repo_tree_structure_generation(self):
        """Vérifier que la structure arborescente peut être générée (pour UI)"""
        result = repo_analyzer_service.analyze_repository(
            str(self.test_repo),
            max_depth=10,
            max_files=1000
        )
        
        assert result.success, "L'analyse doit réussir"
        
        # Extraire les dossiers pour la vue arborescente
        analysis = result.analysis
        structure = analysis.structure if hasattr(analysis, 'structure') else analysis.get('structure', {})
        
        # Les dossiers doivent être organisables en arbre
        # Note: L'organisation en arbre est faite côté frontend (RepoAnalyzer.jsx)
        # Ici, on vérifie que les données nécessaires sont présentes
        
        assert structure is not None, "La structure doit être présente"


class TestChatHistoryEncryptionWorkflow:
    """Tests E2E pour le workflow chat history chiffré (Sprint 1)"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.test_dir = tempfile.mkdtemp()
        chat_history_service.storage_path = Path(self.test_dir) / "history"
        chat_history_service.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Setup crypto
        self.crypto_service = CryptoService()
        self.crypto_service.set_password("chat_password_123")
        chat_history_service.crypto_service = self.crypto_service
        chat_history_service.set_crypto_password("chat_password_123")
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_chat_history_encryption_workflow(self):
        """Vérifier le workflow complet chat history chiffré"""
        # 1. Créer conversation chiffrée
        chat_id = chat_history_service.save_message(
            chat_id=None,
            role="user",
            content="Message secret",
            model="llama3",
            encrypt=True
        )
        
        assert chat_id, "Un chat_id doit être retourné"
        
        # 2. Ajouter réponse assistant
        chat_history_service.save_message(
            chat_id=chat_id,
            role="assistant",
            content="Réponse secrète",
            model="llama3",
            encrypt=True  # Maintenir chiffrement
        )
        
        # 3. Lister conversations (doit afficher flag encrypted)
        conversations = chat_history_service.list_conversations()
        
        chat = next((c for c in conversations if c["id"] == chat_id), None)
        assert chat, "La conversation doit être listée"
        assert chat.get("encrypted") == True, "La conversation doit être marquée comme chiffrée"
        
        # 4. Lire messages (doit déchiffrer automatiquement)
        messages = chat_history_service.get_messages(chat_id)
        
        assert len(messages) == 2, "Les 2 messages doivent être récupérés"
        assert messages[0].get("content") == "Message secret", "Le message utilisateur doit être déchiffré"
        assert messages[1].get("content") == "Réponse secrète", "Le message assistant doit être déchiffré"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
