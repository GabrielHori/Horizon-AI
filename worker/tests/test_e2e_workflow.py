"""
Tests E2E pour workflow complet
================================
Vérifie que le workflow complet fonctionne de bout en bout.
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.audit_service import audit_service, ActionType
from services.prompt_builder_service import prompt_builder_service
from services.crypto_service import crypto_service
from services.memory_service import memory_service
from services.repo_analyzer_service import repo_analyzer_service


class TestE2EWorkflow:
    """Tests E2E pour workflow complet"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        # Setup audit service avec dossier temporaire
        self.test_dir = tempfile.mkdtemp()
        audit_service.audit_dir = Path(self.test_dir)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
        audit_service.file_access_log = audit_service.audit_dir / "file_access.log"
        audit_service.remote_access_log = audit_service.audit_dir / "remote_access.log"
        audit_service.prompts_log = audit_service.audit_dir / "prompts.log"
        
        # Setup crypto service
        crypto_service.set_password("test_password_e2e")
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        crypto_service.clear_master_key()
    
    def test_complete_chat_workflow(self):
        """Test workflow complet d'un chat avec contexte"""
        # 1. Construire un prompt avec contexte
        context_files = [
            {"path": "/project/main.py", "content": "def main():\n    print('Hello')"}
        ]
        
        prompt = prompt_builder_service.build_prompt(
            user_message="Analyze this code",
            context_files=context_files,
            language="en"
        )
        
        # 2. Logger l'envoi du prompt
        audit_service.log_action(
            ActionType.PROMPT_SENT,
            {
                "prompt_id": prompt.prompt_id,
                "model": "llama3.2:3b",
                "user_message_length": len("Analyze this code"),
                "context_files_count": len(context_files)
            }
        )
        
        # 3. Vérifier que le prompt est correctement construit
        assert prompt.version == "2.0"
        assert len(prompt.components) >= 3  # system + context + user
        
        # 4. Vérifier que le prompt peut être converti en format Ollama
        messages = prompt.to_ollama_messages()
        assert len(messages) >= 2
        
        # 5. Vérifier que l'action est loggée
        assert audit_service.actions_log.exists()
        assert audit_service.prompts_log.exists()
        
        # 6. Vérifier les statistiques
        stats = audit_service.get_log_stats()
        assert stats["prompts_count"] >= 1
    
    def test_file_access_with_audit(self):
        """Test accès fichier avec audit trail"""
        # Simuler une lecture de fichier
        audit_service.log_action(
            ActionType.FILE_READ,
            {
                "file_path": "/project/config.json",
                "size": 1024,
                "confirmation_token": "test-token-123"
            },
            user_id="test_user"
        )
        
        # Vérifier que c'est loggé
        assert audit_service.file_access_log.exists()
        
        # Vérifier les stats
        stats = audit_service.get_log_stats()
        assert stats["file_access_count"] >= 1
    
    def test_encrypted_token_storage(self):
        """Test stockage chiffré de tokens"""
        # Simuler un token remote access
        token = "secret_token_12345"
        
        # Chiffrer le token
        encrypted_token = crypto_service.encrypt_string(token, "tunnel_auth_token")
        
        # Vérifier que c'est différent
        assert encrypted_token != token
        
        # Déchiffrer
        decrypted_token = crypto_service.decrypt_string(encrypted_token, "tunnel_auth_token")
        assert decrypted_token == token
        
        # Logger l'accès
        audit_service.log_action(
            ActionType.REMOTE_ACCESS,
            {"token_used": True, "encrypted": True},
            ip_address="192.168.1.1"
        )
        
        # Vérifier que c'est loggé
        assert audit_service.remote_access_log.exists()
    
    def test_prompt_with_memory_and_context(self):
        """Test prompt avec mémoire et contexte"""
        # 1. Créer des entrées mémoire
        memory_entries = [
            {"key": "user_name", "value": "John Doe"},
            {"key": "preferred_language", "value": "Python"}
        ]
        
        # 2. Créer des fichiers de contexte
        context_files = [
            {"path": "/project/app.py", "content": "print('Hello')"}
        ]
        
        # 3. Construire le prompt
        prompt = prompt_builder_service.build_prompt(
            user_message="What should I do?",
            memory_entries=memory_entries,
            context_files=context_files,
            language="en"
        )
        
        # 4. Vérifier que tous les composants sont présents
        component_types = [c.type for c in prompt.components]
        assert "system" in component_types
        assert "memory" in component_types
        assert "context" in component_types
        assert "user" in component_types
        
        # 5. Vérifier le contenu
        memory_component = next(c for c in prompt.components if c.type == "memory")
        assert "user_name" in memory_component.content
        assert "John Doe" in memory_component.content
        
        context_component = next(c for c in prompt.components if c.type == "context")
        assert "/project/app.py" in context_component.content
        
        # 6. Logger
        audit_service.log_action(
            ActionType.PROMPT_SENT,
            {
                "prompt_id": prompt.prompt_id,
                "memory_keys_count": len(memory_entries),
                "context_files_count": len(context_files)
            }
        )
        
        # 7. Vérifier les logs
        stats = audit_service.get_log_stats()
        assert stats["prompts_count"] >= 1
    
    def test_prompt_with_repo_context(self):
        """Test prompt avec contexte repository"""
        import tempfile
        from pathlib import Path
        
        # 1. Créer un repository de test
        test_repo = Path(tempfile.mkdtemp())
        (test_repo / "package.json").write_text('{"name": "test-app"}')
        (test_repo / "src" / "App.jsx").mkdir(parents=True)
        (test_repo / "src" / "App.jsx").write_text("import React from 'react';")
        
        try:
            # 2. Analyser le repository
            analysis = repo_analyzer_service.analyze_repository(
                repo_path=str(test_repo),
                max_depth=3,
                max_files=50
            )
            
            # 3. Construire le prompt avec contexte repository
            repo_context = {
                "summary": analysis.summary,
                "stack": analysis.stack,
                "structure": {
                    "total_files": analysis.file_count,
                    "languages": list(analysis.stack.get("languages", {}).keys())
                }
            }
            
            prompt = prompt_builder_service.build_prompt(
                user_message="Analyze this repository",
                repo_context=repo_context,
                language="en"
            )
            
            # 4. Vérifier que le contexte repository est présent
            context_components = [c for c in prompt.components if c.type == "context"]
            repo_context_component = next(
                (c for c in context_components if c.metadata.get("type") == "repository"),
                None
            )
            
            assert repo_context_component is not None
            assert "REPOSITORY CONTEXT" in repo_context_component.content or "CONTEXTE REPOSITORY" in repo_context_component.content
            assert analysis.summary in repo_context_component.content or len(repo_context_component.content) > 0
            
        finally:
            # Cleanup
            import shutil
            shutil.rmtree(test_repo, ignore_errors=True)
    
    def test_prompt_with_memory_and_repo(self):
        """Test prompt avec mémoire ET contexte repository"""
        import tempfile
        from pathlib import Path
        
        # 1. Setup mémoire
        test_dir = tempfile.mkdtemp()
        memory_service.base_dir = Path(test_dir)
        memory_service.memory_dir = memory_service.base_dir / "data" / "memory"
        memory_service.user_memory_path = memory_service.memory_dir / "user.json"
        memory_service.memory_dir.mkdir(parents=True, exist_ok=True)
        memory_service.session_memory = {}
        
        crypto_service.set_password("test_e2e")
        memory_service.set_crypto_password("test_e2e")
        
        # 2. Créer une mémoire
        memory_service.save_memory("user", "project_name", "MyProject")
        
        # 3. Créer un repository de test
        test_repo = Path(tempfile.mkdtemp())
        (test_repo / "README.md").write_text("# MyProject\n\nTest project")
        
        try:
            # 4. Analyser le repository
            analysis = repo_analyzer_service.analyze_repository(
                repo_path=str(test_repo),
                max_depth=3,
                max_files=50
            )
            
            # 5. Récupérer la mémoire
            memory_entries = [
                {"key": "project_name", "value": memory_service.get_memory("user", "project_name")}
            ]
            
            # 6. Construire le prompt avec mémoire ET repository
            repo_context = {
                "summary": analysis.summary,
                "stack": analysis.stack,
                "structure": {
                    "total_files": analysis.file_count,
                    "languages": list(analysis.stack.get("languages", {}).keys())
                }
            }
            
            prompt = prompt_builder_service.build_prompt(
                user_message="What can you tell me about this project?",
                memory_entries=memory_entries,
                repo_context=repo_context,
                language="en"
            )
            
            # 7. Vérifier que tous les composants sont présents
            component_types = [c.type for c in prompt.components]
            assert "system" in component_types
            assert "memory" in component_types
            assert "context" in component_types
            assert "user" in component_types
            
            # 8. Vérifier le contenu mémoire
            memory_component = next(c for c in prompt.components if c.type == "memory")
            assert "project_name" in memory_component.content
            assert "MyProject" in memory_component.content
            
            # 9. Vérifier le contenu repository
            context_components = [c for c in prompt.components if c.type == "context"]
            repo_component = next(
                (c for c in context_components if c.metadata.get("type") == "repository"),
                None
            )
            assert repo_component is not None
            
        finally:
            # Cleanup
            import shutil
            shutil.rmtree(test_dir, ignore_errors=True)
            shutil.rmtree(test_repo, ignore_errors=True)
            crypto_service.clear_master_key()
    
    def test_audit_trail_completeness(self):
        """Test que tous les types d'actions sont audités"""
        actions_to_test = [
            (ActionType.FILE_READ, {"file_path": "/test/read.txt"}),
            (ActionType.FILE_WRITE, {"file_path": "/test/write.txt"}),
            (ActionType.PROMPT_SENT, {"prompt_id": "test-123"}),
            (ActionType.REMOTE_ACCESS, {"ip": "1.2.3.4"}),
            (ActionType.MEMORY_SAVE, {"key": "test_key"}),
        ]
        
        for action_type, details in actions_to_test:
            audit_service.log_action(action_type, details)
        
        # Vérifier les stats
        stats = audit_service.get_log_stats()
        assert stats["total_entries"] >= len(actions_to_test)
        
        # Vérifier que chaque type est présent
        for action_type, _ in actions_to_test:
            assert action_type.value in stats["by_action_type"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
