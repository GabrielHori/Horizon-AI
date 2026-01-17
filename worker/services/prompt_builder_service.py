"""
Prompt Builder Service pour Horizon AI V2
=========================================
Construit des prompts structurés avec versioning et séparation claire des composants.

IMPORTANT - Philosophie LOCAL-FIRST:
- Tous les prompts sont construits localement
- Aucune donnée envoyée à l'extérieur
- Versioning pour traçabilité
"""

import sys
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class PromptComponent:
    """Composant d'un prompt (système, contexte, mémoire, utilisateur)"""
    type: str  # "system", "context", "memory", "user", "assistant"
    content: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Prompt:
    """Prompt final avec versioning et structure"""
    components: List[PromptComponent]
    created_at: str
    prompt_id: str
    version: str = "2.0"
    
    def to_ollama_messages(self) -> List[Dict[str, str]]:
        """
        Convertit le prompt en format Ollama (liste de messages)
        
        Returns:
            Liste de messages au format Ollama
        """
        messages = []
        
        # 1. System prompt (règles de base)
        system_parts = []
        for component in self.components:
            if component.type == "system":
                system_parts.append(component.content)
        
        if system_parts:
            system_content = "\n\n".join(system_parts)
            messages.append({
                "role": "system",
                "content": system_content
            })
        
        # 2. Contexte (fichiers) - ajouté comme système étendu
        context_parts = []
        for component in self.components:
            if component.type == "context":
                context_parts.append(component.content)
        
        if context_parts:
            context_text = "\n\n--- CONTEXTE (FICHIERS) ---\n\n"
            context_text += "\n\n---\n\n".join(context_parts)
            messages.append({
                "role": "system",
                "content": context_text
            })
        
        # 3. Mémoire - ajouté comme système
        memory_parts = []
        for component in self.components:
            if component.type == "memory":
                memory_parts.append(component.content)
        
        if memory_parts:
            memory_text = "\n\n--- MÉMOIRE ---\n\n"
            memory_text += "\n\n".join(memory_parts)
            messages.append({
                "role": "system",
                "content": memory_text
            })
        
        # 4. Historique de conversation (user/assistant)
        for component in self.components:
            if component.type in ["user", "assistant"]:
                messages.append({
                    "role": component.type,
                    "content": component.content
                })
        
        return messages
    
    def to_string(self) -> str:
        """
        Représentation textuelle du prompt pour affichage UI
        
        Returns:
            String formaté avec toutes les sections
        """
        parts = []
        parts.append(f"=== PROMPT V{self.version} ({self.created_at}) ===\n")
        
        for component in self.components:
            parts.append(f"\n--- {component.type.upper()} ---")
            if component.metadata:
                parts.append(f"[Metadata: {json.dumps(component.metadata, ensure_ascii=False)}]")
            parts.append(component.content)
            parts.append("")  # Ligne vide
        
        return "\n".join(parts)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertit le prompt en dictionnaire pour sérialisation"""
        return {
            "version": self.version,
            "prompt_id": self.prompt_id,
            "created_at": self.created_at,
            "components": [
                {
                    "type": c.type,
                    "content": c.content,
                    "metadata": c.metadata or {}
                }
                for c in self.components
            ]
        }


class PromptBuilderService:
    """
    Service pour construire des prompts structurés avec versioning
    """
    
    def __init__(self):
        self.prompt_history = []  # Historique des prompts (métadonnées uniquement)
        
        # Déterminer le chemin de base pour les logs
        if getattr(sys, 'frozen', False):
            appdata = sys.environ.get('APPDATA') or sys.environ.get('LOCALAPPDATA')
            if appdata:
                self.base_dir = Path(appdata) / "HorizonAI"
            else:
                self.base_dir = Path.home() / ".horizon-ai"
        else:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        
        self.audit_dir = self.base_dir / "data" / "audit"
        self.audit_dir.mkdir(parents=True, exist_ok=True)
        self.prompts_log = self.audit_dir / "prompts.log"
    
    def build_prompt(
        self,
        user_message: str,
        chat_history: List[Dict[str, Any]] = None,
        context_files: List[Dict[str, Any]] = None,
        memory_entries: List[Dict[str, Any]] = None,
        repo_context: Optional[Dict[str, Any]] = None,
        web_context: Optional[str] = None,
        system_rules: Optional[str] = None,
        language: str = "fr",
    ) -> Prompt:
        """
        Construit un prompt complet avec tous les composants
        
        Args:
            user_message: Message de l'utilisateur
            chat_history: Historique de conversation (liste de messages)
            context_files: Fichiers de contexte (liste de FileContent)
            memory_entries: Entrées de mémoire (liste de {key, value})
            system_rules: Règles système personnalisées (optionnel)
            language: Langue de l'interface ("fr" ou "en")
        
        Returns:
            Prompt structuré avec versioning
        """
        components = []
        
        # 1. System prompt (règles de base)
        if system_rules:
            system_content = system_rules
        else:
            system_content = self._get_default_system_prompt(language)
        
        components.append(PromptComponent(
            type="system",
            content=system_content,
            metadata={"language": language}
        ))
        
        # 2. Mémoire (si pertinente)
        if memory_entries:
            memory_text = self._format_memory(memory_entries)
            components.append(PromptComponent(
                type="memory",
                content=memory_text,
                metadata={"count": len(memory_entries)}
            ))
        
        # 3. Contexte Repository (si fourni)
        if repo_context:
            repo_text = self._format_repo_context(repo_context, language)
            components.append(PromptComponent(
                type="context",
                content=repo_text,
                metadata={
                    "type": "repository",
                    "languages": repo_context.get("structure", {}).get("languages", [])
                }
            ))

        # 4. Contexte Web (si fourni)
        if web_context:
            web_text = self._format_web_context(web_context)
            components.append(PromptComponent(
                type="context",
                content=web_text,
                metadata={"type": "web"}
            ))

        # 5. Contexte (fichiers)
        if context_files:
            context_text = self._format_context(context_files)
            components.append(PromptComponent(
                type="context",
                content=context_text,
                metadata={
                    "files": [f.get("path", "") for f in context_files],
                    "count": len(context_files)
                }
            ))

        # 6. Historique de conversation
        if chat_history:
            for msg in chat_history:
                role = msg.get("role", "user")
                if role in ["user", "assistant"]:
                    components.append(PromptComponent(
                        type=role,
                        content=msg.get("content", ""),
                        metadata={"timestamp": msg.get("timestamp")}
                    ))
        
        # 7. Message utilisateur actuel
        components.append(PromptComponent(
            type="user",
            content=user_message,
            metadata={"timestamp": datetime.now().isoformat()}
        ))
        
        # Créer le prompt final
        prompt_id = str(uuid.uuid4())
        prompt = Prompt(
            version="2.0",
            components=components,
            created_at=datetime.now().isoformat(),
            prompt_id=prompt_id
        )
        
        # Logger pour audit (métadonnées uniquement, pas le contenu complet)
        self.log_prompt(prompt)
        
        return prompt
    
    def _get_default_system_prompt(self, language: str) -> str:
        """Retourne le prompt système par défaut selon la langue"""
        prompts = {
            "fr": """Tu es un assistant IA utile et amical. Tu dois TOUJOURS répondre en français.

RÈGLES IMPORTANTES:
- Tu es en mode "assistant sécurisé" : tu ne peux que SUGGÉRER, jamais EXÉCUTER
- Pour toute modification de fichier, tu dois fournir un DIFF explicite
- Tu ne dois jamais proposer d'exécuter des commandes système sans validation utilisateur
- Si tu ne connais pas quelque chose, dis-le clairement
- Sois concis et précis dans tes réponses""",
            
            "en": """You are a helpful and friendly AI assistant. You must ALWAYS respond in English.

IMPORTANT RULES:
- You are in "secure assistant mode": you can only SUGGEST, never EXECUTE
- For any file modification, you must provide an explicit DIFF
- You must never propose to execute system commands without user validation
- If you don't know something, say so clearly
- Be concise and precise in your answers"""
        }
        return prompts.get(language, prompts["en"])
    
    def _format_memory(self, memory_entries: List[Dict[str, Any]]) -> str:
        """Formate les entrées mémoire"""
        parts = []
        for entry in memory_entries:
            key = entry.get("key", "")
            value = entry.get("value", "")
            parts.append(f"[{key}]: {value}")
        return "\n".join(parts)
    
    def _format_repo_context(self, repo_context: Dict[str, Any], language: str) -> str:
        """Formate le contexte repository"""
        parts = []
        
        if language == "fr":
            parts.append("=== CONTEXTE REPOSITORY ===")
            if repo_context.get("summary"):
                parts.append(repo_context["summary"])
            
            if repo_context.get("stack"):
                stack = repo_context["stack"]
                if stack.get("languages"):
                    parts.append("\nLangages détectés:")
                    for lang, count in stack["languages"].items():
                        parts.append(f"  - {lang}: {count} fichiers")
                
                if stack.get("frameworks"):
                    parts.append(f"\nFrameworks: {', '.join(stack['frameworks'])}")
                
                if stack.get("tools"):
                    parts.append(f"Outils: {', '.join(stack['tools'])}")
        else:
            parts.append("=== REPOSITORY CONTEXT ===")
            if repo_context.get("summary"):
                parts.append(repo_context["summary"])
            
            if repo_context.get("stack"):
                stack = repo_context["stack"]
                if stack.get("languages"):
                    parts.append("\nDetected languages:")
                    for lang, count in stack["languages"].items():
                        parts.append(f"  - {lang}: {count} files")
                
                if stack.get("frameworks"):
                    parts.append(f"\nFrameworks: {', '.join(stack['frameworks'])}")
                
                if stack.get("tools"):
                    parts.append(f"Tools: {', '.join(stack['tools'])}")
        
        return "\n".join(parts)

    def _format_web_context(self, web_context: str) -> str:
        """Formate le contexte web"""
        return "=== WEB RESULTS ===\n" + web_context

    def _format_context(self, files: List[Dict[str, Any]]) -> str:
        """Formate le contexte fichiers"""
        parts = []
        for file in files:
            path = file.get("path", "")
            content = file.get("content", "")
            parts.append(f"=== {path} ===")
            parts.append(content)
            parts.append("")  # Ligne vide entre fichiers
        return "\n".join(parts)
    
    def log_prompt(self, prompt: Prompt):
        """
        Log le prompt pour audit (métadonnées uniquement, pas le contenu complet)
        """
        log_entry = {
            "prompt_id": prompt.prompt_id,
            "version": prompt.version,
            "created_at": prompt.created_at,
            "components_count": len(prompt.components),
            "components_metadata": [
                {
                    "type": c.type,
                    "metadata": c.metadata or {},
                    "content_length": len(c.content)
                }
                for c in prompt.components
            ],
            # Ne pas logger le contenu complet (trop volumineux et peut contenir des données sensibles)
            # Mais garder les métadonnées pour audit
        }
        
        self.prompt_history.append(log_entry)
        
        # Sauvegarder dans fichier audit
        try:
            with open(self.prompts_log, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"[PROMPT BUILDER ERROR] Failed to log prompt: {e}", file=sys.stderr)
    
    def get_prompt_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retourne l'historique des prompts (métadonnées uniquement)"""
        return self.prompt_history[-limit:]


# Singleton
prompt_builder_service = PromptBuilderService()
