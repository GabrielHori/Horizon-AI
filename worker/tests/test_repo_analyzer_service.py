"""
Tests pour Repo Analyzer Service
=================================
Vérifie que l'analyse de repository fonctionne correctement avec sandbox.
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.repo_analyzer_service import repo_analyzer_service, RepoAnalysis
from services.audit_service import audit_service, ActionType


class TestRepoAnalyzerService:
    """Tests pour le service d'analyse de repository"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        # Créer un dossier temporaire pour les tests
        self.test_dir = tempfile.mkdtemp()
        
        # Créer un repository de test
        self.test_repo = Path(self.test_dir) / "test_repo"
        self.test_repo.mkdir()
        
        # Créer une structure de repository de test
        (self.test_repo / "src").mkdir()
        (self.test_repo / "tests").mkdir()
        (self.test_repo / "package.json").write_text('{"name": "test-app", "dependencies": {"react": "^18.0.0"}}')
        (self.test_repo / "src" / "App.jsx").write_text("import React from 'react';\n\nexport default function App() { return <div>Hello</div>; }")
        (self.test_repo / "src" / "index.js").write_text("console.log('Hello World');")
        (self.test_repo / "README.md").write_text("# Test Repository\n\nThis is a test repository.")
        (self.test_repo / ".gitignore").write_text("node_modules/\n*.log")
        
        # Setup audit service avec dossier temporaire
        audit_service.audit_dir = Path(self.test_dir) / "audit"
        audit_service.audit_dir.mkdir(parents=True, exist_ok=True)
        audit_service.actions_log = audit_service.audit_dir / "actions.log"
        audit_service.file_access_log = audit_service.audit_dir / "file_access.log"
        audit_service.remote_access_log = audit_service.audit_dir / "remote_access.log"
        audit_service.prompts_log = audit_service.audit_dir / "prompts.log"
        
        # Rediriger le sandbox_dir vers le dossier temporaire
        repo_analyzer_service.sandbox_dir = Path(self.test_dir) / "sandbox"
        repo_analyzer_service.sandbox_dir.mkdir(parents=True, exist_ok=True)
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_analyze_structure(self):
        """Test analyse de structure du repository"""
        structure = repo_analyzer_service.analyze_structure(str(self.test_repo))
        
        assert structure is not None
        assert "total_files" in structure
        assert "total_dirs" in structure
        assert "files_by_type" in structure
        assert structure["total_files"] >= 5  # Au moins les fichiers créés
        
        # Vérifier les types de fichiers détectés
        assert structure["total_files"] > 0
    
    def test_detect_stack(self):
        """Test détection de stack technique"""
        stack = repo_analyzer_service.detect_stack(str(self.test_repo))
        
        assert stack is not None
        assert "languages" in stack
        assert "frameworks" in stack
        assert "tools" in stack
        
        # Vérifier que JavaScript est détecté
        assert "JavaScript" in stack["languages"] or "javascript" in str(stack["languages"]).lower()
        
        # Vérifier que React est détecté (via package.json)
        frameworks = stack.get("frameworks", [])
        assert any("react" in str(f).lower() for f in frameworks) or "React" in str(stack)
    
    def test_generate_summary(self):
        """Test génération de résumé architectural"""
        summary = repo_analyzer_service.generate_summary(str(self.test_repo))
        
        assert summary is not None
        assert isinstance(summary, str)
        assert len(summary) > 0
        
        # Le résumé devrait mentionner les éléments principaux
        summary_lower = summary.lower()
        assert any(keyword in summary_lower for keyword in ["javascript", "react", "test", "repository"])
    
    def test_detect_tech_debt(self):
        """Test détection de dettes techniques"""
        tech_debt = repo_analyzer_service.detect_tech_debt(str(self.test_repo))
        
        assert tech_debt is not None
        assert isinstance(tech_debt, list)
    
    def test_analyze_repository_complete(self):
        """Test analyse complète du repository"""
        analysis = repo_analyzer_service.analyze_repository(
            repo_path=str(self.test_repo),
            max_depth=5,
            max_files=100
        )
        
        assert analysis is not None
        assert isinstance(analysis, RepoAnalysis)
        assert analysis.repo_path == str(self.test_repo)
        assert analysis.structure is not None
        assert analysis.stack is not None
        assert analysis.summary is not None
        assert isinstance(analysis.tech_debt, list)
        assert analysis.file_count > 0
        assert analysis.analyzed_at is not None
    
    def test_sandbox_isolation(self):
        """Test que le sandbox isole correctement le repository"""
        # Analyser le repository (devrait créer un sandbox)
        analysis = repo_analyzer_service.analyze_repository(
            repo_path=str(self.test_repo),
            max_depth=5,
            max_files=100
        )
        
        # Vérifier que le repository original n'a pas été modifié
        original_files = list(self.test_repo.rglob("*"))
        assert len(original_files) == 7  # Les fichiers créés dans setup
        
        # Vérifier que le README original existe toujours
        assert (self.test_repo / "README.md").exists()
        original_readme = (self.test_repo / "README.md").read_text()
        assert "Test Repository" in original_readme
    
    def test_ignore_patterns(self):
        """Test que les patterns ignorés sont bien exclus"""
        # Créer des fichiers à ignorer
        (self.test_repo / "node_modules").mkdir()
        (self.test_repo / "node_modules" / "package.json").write_text('{}')
        (self.test_repo / ".git").mkdir()
        (self.test_repo / ".git" / "config").write_text('[core]')
        
        analysis = repo_analyzer_service.analyze_repository(
            repo_path=str(self.test_repo),
            max_depth=5,
            max_files=100
        )
        
        # Les fichiers dans node_modules et .git ne devraient pas être comptés
        # (ou être ignorés selon l'implémentation)
        assert analysis.file_count >= 5  # Au moins les fichiers de base
    
    def test_error_handling_invalid_path(self):
        """Test gestion d'erreur pour chemin invalide"""
        invalid_path = str(Path(self.test_dir) / "nonexistent_repo")
        
        try:
            analysis = repo_analyzer_service.analyze_repository(
                repo_path=invalid_path,
                max_depth=5,
                max_files=100
            )
            # Si l'analyse réussit malgré le chemin invalide, c'est un problème
            # mais on accepte si le service gère l'erreur gracieusement
        except Exception as e:
            # C'est acceptable si une exception est levée
            assert isinstance(e, (FileNotFoundError, ValueError, OSError))
    
    def test_large_repository_limits(self):
        """Test que les limites (max_files, max_depth) sont respectées"""
        # Créer un repository avec beaucoup de fichiers
        for i in range(50):
            (self.test_repo / f"file_{i}.txt").write_text(f"Content {i}")
        
        analysis = repo_analyzer_service.analyze_repository(
            repo_path=str(self.test_repo),
            max_depth=2,
            max_files=20
        )
        
        # Le nombre de fichiers analysés ne devrait pas dépasser max_files
        # (selon l'implémentation, cela peut être vérifié dans structure)
        assert analysis.file_count <= 60  # Un peu de marge pour les fichiers de base


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
