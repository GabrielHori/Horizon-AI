"""
Tests pour Prompt Builder Service
==================================
Vérifie que les prompts sont construits correctement avec versioning.
"""

import sys
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.prompt_builder_service import prompt_builder_service, Prompt, PromptComponent


class TestPromptBuilder:
    """Tests pour le prompt builder"""
    
    def test_build_simple_prompt(self):
        """Test construction d'un prompt simple"""
        prompt = prompt_builder_service.build_prompt(
            user_message="Hello!",
            language="en"
        )
        
        assert prompt.version == "2.0"
        assert prompt.prompt_id is not None
        assert len(prompt.components) >= 2  # system + user
        
        # Vérifier qu'il y a un composant system
        system_components = [c for c in prompt.components if c.type == "system"]
        assert len(system_components) == 1
        
        # Vérifier qu'il y a un composant user
        user_components = [c for c in prompt.components if c.type == "user"]
        assert len(user_components) == 1
        assert user_components[0].content == "Hello!"
    
    def test_build_prompt_with_context(self):
        """Test construction d'un prompt avec contexte fichiers"""
        context_files = [
            {"path": "/test/file1.py", "content": "def hello():\n    pass"},
            {"path": "/test/file2.js", "content": "function hello() {}"}
        ]
        
        prompt = prompt_builder_service.build_prompt(
            user_message="Analyze these files",
            context_files=context_files,
            language="en"
        )
        
        # Vérifier qu'il y a un composant context
        context_components = [c for c in prompt.components if c.type == "context"]
        assert len(context_components) == 1
        
        context_content = context_components[0].content
        assert "/test/file1.py" in context_content
        assert "/test/file2.js" in context_content
        assert "def hello()" in context_content
    
    def test_build_prompt_with_memory(self):
        """Test construction d'un prompt avec mémoire"""
        memory_entries = [
            {"key": "user_preference", "value": "I prefer Python"},
            {"key": "project_name", "value": "MyProject"}
        ]
        
        prompt = prompt_builder_service.build_prompt(
            user_message="What is my preference?",
            memory_entries=memory_entries,
            language="en"
        )
        
        # Vérifier qu'il y a un composant memory
        memory_components = [c for c in prompt.components if c.type == "memory"]
        assert len(memory_components) == 1
        
        memory_content = memory_components[0].content
        assert "user_preference" in memory_content
        assert "I prefer Python" in memory_content
    
    def test_build_prompt_with_history(self):
        """Test construction d'un prompt avec historique"""
        chat_history = [
            {"role": "user", "content": "Hello", "timestamp": "2025-01-01T10:00:00"},
            {"role": "assistant", "content": "Hi there!", "timestamp": "2025-01-01T10:00:01"},
            {"role": "user", "content": "How are you?", "timestamp": "2025-01-01T10:00:02"}
        ]
        
        prompt = prompt_builder_service.build_prompt(
            user_message="Tell me a joke",
            chat_history=chat_history,
            language="en"
        )
        
        # Vérifier que l'historique est inclus
        user_components = [c for c in prompt.components if c.type == "user"]
        assistant_components = [c for c in prompt.components if c.type == "assistant"]
        
        assert len(user_components) >= 3  # 2 dans l'historique + 1 nouveau
        assert len(assistant_components) >= 1
    
    def test_to_ollama_messages(self):
        """Test conversion en format Ollama"""
        prompt = prompt_builder_service.build_prompt(
            user_message="Test",
            language="en"
        )
        
        messages = prompt.to_ollama_messages()
        
        assert isinstance(messages, list)
        assert len(messages) >= 2  # system + user
        
        # Vérifier la structure
        system_msg = next((m for m in messages if m["role"] == "system"), None)
        assert system_msg is not None
        assert "role" in system_msg
        assert "content" in system_msg
    
    def test_to_string(self):
        """Test représentation textuelle"""
        prompt = prompt_builder_service.build_prompt(
            user_message="Test",
            language="en"
        )
        
        prompt_str = prompt.to_string()
        
        assert isinstance(prompt_str, str)
        assert "PROMPT V2.0" in prompt_str
        assert "SYSTEM" in prompt_str
        assert "USER" in prompt_str
        assert "Test" in prompt_str
    
    def test_prompt_versioning(self):
        """Test que tous les prompts ont la version 2.0"""
        prompt1 = prompt_builder_service.build_prompt("Test 1", language="en")
        prompt2 = prompt_builder_service.build_prompt("Test 2", language="fr")
        
        assert prompt1.version == "2.0"
        assert prompt2.version == "2.0"
        assert prompt1.prompt_id != prompt2.prompt_id  # IDs uniques


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
