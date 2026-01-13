"""
Tests pour Memory Service
==========================
Vérifie que la gestion de mémoire (user/project/session) fonctionne correctement.
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.memory_service import memory_service, MemoryEntry
from services.crypto_service import crypto_service
from services.audit_service import audit_service, ActionType


class TestMemoryService:
    """Tests pour le service de mémoire"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        # Créer un dossier temporaire pour les tests
        self.test_dir = tempfile.mkdtemp()
        
        # Rediriger le base_dir vers le dossier temporaire
        memory_service.base_dir = Path(self.test_dir)
        memory_service.memory_dir = memory_service.base_dir / "data" / "memory"
        memory_service.user_memory_path = memory_service.memory_dir / "user.json"
        memory_service.projects_dir = memory_service.memory_dir / "projects"
        memory_service.projects_dir.mkdir(parents=True, exist_ok=True)
        
        # Réinitialiser la mémoire session
        memory_service.session_memory = {}
        
        # Setup crypto service
        crypto_service.set_password("test_password_memory")
        memory_service.set_crypto_password("test_password_memory")
        
        # Setup audit service avec dossier temporaire
        audit_service.audit_dir = Path(self.test_dir) / "audit"
        audit_service.audit_dir.mkdir(parents=True, exist_ok=True)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
        audit_service.file_access_log = audit_service.audit_dir / "file_access.log"
        audit_service.remote_access_log = audit_service.audit_dir / "remote_access.log"
        audit_service.prompts_log = audit_service.audit_dir / "prompts.log"
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        crypto_service.clear_master_key()
        memory_service.session_memory = {}
    
    def test_save_user_memory(self):
        """Test sauvegarde de mémoire utilisateur"""
        result = memory_service.save_memory(
            memory_type="user",
            key="test_key",
            value="test_value"
        )
        
        assert result is True
        
        # Vérifier que la mémoire est sauvegardée
        retrieved = memory_service.get_memory("user", "test_key")
        assert retrieved == "test_value"
        
        # Vérifier l'audit trail
        stats = audit_service.get_log_stats()
        assert stats["total_entries"] >= 1
    
    def test_save_project_memory(self):
        """Test sauvegarde de mémoire projet"""
        project_id = "test_project_123"
        
        result = memory_service.save_memory(
            memory_type="project",
            key="project_key",
            value="project_value",
            project_id=project_id
        )
        
        assert result is True
        
        # Vérifier que la mémoire est sauvegardée
        retrieved = memory_service.get_memory("project", "project_key", project_id=project_id)
        assert retrieved == "project_value"
    
    def test_save_session_memory(self):
        """Test sauvegarde de mémoire session (temporaire)"""
        result = memory_service.save_memory(
            memory_type="session",
            key="session_key",
            value="session_value"
        )
        
        assert result is True
        
        # Vérifier que la mémoire est en RAM
        retrieved = memory_service.get_memory("session", "session_key")
        assert retrieved == "session_value"
        
        # Vérifier qu'elle n'est pas persistée
        assert not memory_service.user_memory_path.exists()
    
    def test_list_memories(self):
        """Test liste des mémoires"""
        # Créer plusieurs mémoires
        memory_service.save_memory("user", "key1", "value1")
        memory_service.save_memory("user", "key2", "value2")
        memory_service.save_memory("project", "proj_key", "proj_value", project_id="proj1")
        
        # Lister les mémoires utilisateur
        user_memories = memory_service.list_memories("user")
        assert len(user_memories) >= 2
        assert any(m["key"] == "key1" for m in user_memories)
        assert any(m["key"] == "key2" for m in user_memories)
        
        # Lister les mémoires projet
        project_memories = memory_service.list_memories("project", project_id="proj1")
        assert len(project_memories) >= 1
        assert any(m["key"] == "proj_key" for m in project_memories)
    
    def test_delete_memory(self):
        """Test suppression de mémoire"""
        # Créer une mémoire
        memory_service.save_memory("user", "to_delete", "value")
        
        # Vérifier qu'elle existe
        assert memory_service.get_memory("user", "to_delete") == "value"
        
        # Supprimer
        result = memory_service.delete_memory("user", "to_delete")
        assert result is True
        
        # Vérifier qu'elle n'existe plus
        assert memory_service.get_memory("user", "to_delete") is None
        
        # Vérifier l'audit trail
        stats = audit_service.get_log_stats()
        assert stats["total_entries"] >= 2  # MEMORY_WRITE + MEMORY_DELETE
    
    def test_clear_session_memory(self):
        """Test nettoyage de la mémoire session"""
        # Créer plusieurs mémoires session
        memory_service.save_memory("session", "key1", "value1")
        memory_service.save_memory("session", "key2", "value2")
        
        # Vérifier qu'elles existent
        assert len(memory_service.session_memory) == 2
        
        # Nettoyer
        memory_service.clear_session_memory()
        
        # Vérifier qu'elles sont supprimées
        assert len(memory_service.session_memory) == 0
        assert memory_service.get_memory("session", "key1") is None
    
    def test_memory_encryption(self):
        """Test que les mémoires persistantes sont chiffrées"""
        # Sauvegarder une mémoire utilisateur
        memory_service.save_memory("user", "secret_key", "secret_value")
        
        # Vérifier que le fichier existe
        assert memory_service.user_memory_path.exists()
        
        # Lire le fichier directement (devrait être chiffré)
        with open(memory_service.user_memory_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Le contenu ne devrait pas contenir la valeur en clair
        assert "secret_value" not in content
        
        # Mais on peut le récupérer via le service
        retrieved = memory_service.get_memory("user", "secret_key")
        assert retrieved == "secret_value"
    
    def test_memory_update(self):
        """Test mise à jour d'une mémoire existante"""
        # Créer une mémoire
        memory_service.save_memory("user", "update_key", "initial_value")
        
        # Mettre à jour
        memory_service.save_memory("user", "update_key", "updated_value")
        
        # Vérifier la mise à jour
        retrieved = memory_service.get_memory("user", "update_key")
        assert retrieved == "updated_value"
    
    def test_memory_with_metadata(self):
        """Test mémoire avec métadonnées"""
        metadata = {"source": "test", "version": "1.0"}
        
        memory_service.save_memory(
            "user",
            "meta_key",
            "meta_value",
            metadata=metadata
        )
        
        # Récupérer la liste pour vérifier les métadonnées
        memories = memory_service.list_memories("user")
        meta_memory = next((m for m in memories if m["key"] == "meta_key"), None)
        
        assert meta_memory is not None
        assert meta_memory.get("metadata") == metadata


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
