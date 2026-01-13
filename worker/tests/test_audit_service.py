"""
Tests pour Audit Service
========================
Vérifie que toutes les actions IA sont correctement loggées.
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.audit_service import audit_service, ActionType


class TestAuditService:
    """Tests pour le service d'audit"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        # Créer un dossier temporaire pour les tests
        self.test_dir = tempfile.mkdtemp()
        audit_service.audit_dir = Path(self.test_dir)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
        audit_service.file_access_log = audit_service.audit_dir / "file_access.log"
        audit_service.remote_access_log = audit_service.audit_dir / "remote_access.log"
        audit_service.prompts_log = audit_service.audit_dir / "prompts.log"
        
        # Nettoyer les logs existants
        for log_file in [
            audit_service.actions_log,
            audit_service.file_access_log,
            audit_service.remote_access_log,
            audit_service.prompts_log
        ]:
            if log_file.exists():
                log_file.unlink()
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        # Supprimer le dossier temporaire
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_log_file_read(self):
        """Test logging d'une lecture de fichier"""
        audit_service.log_action(
            ActionType.FILE_READ,
            {"file_path": "/test/file.txt", "size": 1024},
            user_id="test_user"
        )
        
        # Vérifier que le log existe
        assert audit_service.actions_log.exists()
        assert audit_service.file_access_log.exists()
        
        # Lire et vérifier le contenu
        with open(audit_service.actions_log, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            assert len(lines) == 1
            
            entry = json.loads(lines[0])
            assert entry["action_type"] == "file_read"
            assert entry["details"]["file_path"] == "/test/file.txt"
            assert entry["user_id"] == "test_user"
    
    def test_log_prompt_sent(self):
        """Test logging d'un prompt envoyé"""
        audit_service.log_action(
            ActionType.PROMPT_SENT,
            {
                "prompt_id": "test-prompt-123",
                "model": "llama3.2:3b",
                "user_message_length": 50
            }
        )
        
        # Vérifier que le log existe
        assert audit_service.actions_log.exists()
        assert audit_service.prompts_log.exists()
        
        # Vérifier le contenu
        with open(audit_service.prompts_log, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            assert len(lines) == 1
            
            entry = json.loads(lines[0])
            assert entry["action_type"] == "prompt_sent"
            assert entry["details"]["prompt_id"] == "test-prompt-123"
    
    def test_log_remote_access(self):
        """Test logging d'un accès distant"""
        audit_service.log_action(
            ActionType.REMOTE_ACCESS,
            {"ip": "192.168.1.1", "endpoint": "/api/chat"},
            ip_address="192.168.1.1"
        )
        
        # Vérifier que le log existe
        assert audit_service.actions_log.exists()
        assert audit_service.remote_access_log.exists()
        
        # Vérifier le contenu
        with open(audit_service.remote_access_log, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            assert len(lines) == 1
            
            entry = json.loads(lines[0])
            assert entry["action_type"] == "remote_access"
            assert entry["ip_address"] == "192.168.1.1"
    
    def test_export_logs(self):
        """Test export des logs avec filtres"""
        # Créer plusieurs entrées avec différentes dates
        now = datetime.now()
        
        # Entrée récente
        audit_service.log_action(
            ActionType.FILE_READ,
            {"file_path": "/test/recent.txt"},
        )
        
        # Simuler une entrée plus ancienne (en modifiant le timestamp dans le fichier)
        # Pour simplifier, on crée directement une entrée avec un timestamp passé
        old_entry = {
            "timestamp": (now - timedelta(days=10)).isoformat(),
            "action_type": "file_read",
            "details": {"file_path": "/test/old.txt"}
        }
        with open(audit_service.actions_log, 'a', encoding='utf-8') as f:
            f.write(json.dumps(old_entry) + "\n")
        
        # Exporter seulement les logs récents (derniers 5 jours)
        export_path = Path(self.test_dir) / "export.json"
        count = audit_service.export_logs(
            export_path,
            start_date=now - timedelta(days=5)
        )
        
        # Vérifier l'export
        assert export_path.exists()
        assert count >= 1  # Au moins l'entrée récente
        
        with open(export_path, 'r', encoding='utf-8') as f:
            exported = json.load(f)
            assert len(exported) >= 1
            # Vérifier que l'entrée ancienne n'est pas incluse
            for entry in exported:
                entry_date = datetime.fromisoformat(entry["timestamp"])
                assert entry_date >= (now - timedelta(days=5))
    
    def test_get_log_stats(self):
        """Test récupération des statistiques"""
        # Créer plusieurs entrées
        audit_service.log_action(ActionType.FILE_READ, {"file_path": "/test/1.txt"})
        audit_service.log_action(ActionType.FILE_WRITE, {"file_path": "/test/2.txt"})
        audit_service.log_action(ActionType.PROMPT_SENT, {"prompt_id": "test-1"})
        audit_service.log_action(ActionType.REMOTE_ACCESS, {"ip": "1.2.3.4"})
        
        stats = audit_service.get_log_stats()
        
        assert stats["total_entries"] >= 4
        assert stats["file_access_count"] >= 2
        assert stats["prompts_count"] >= 1
        assert stats["remote_access_count"] >= 1
        assert "file_read" in stats["by_action_type"]
        assert "file_write" in stats["by_action_type"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
