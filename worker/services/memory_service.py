"""
Memory Service pour Horizon AI V2
==================================
Service de gestion de mémoire locale intelligente avec chiffrement.

Types de mémoire :
- user : Préférences utilisateur, historique de travail
- project : Contexte spécifique à un projet
- session : Contexte temporaire de la session (non persisté)

Sécurité :
- Chiffrement AES-256-GCM via crypto_service
- Audit trail complet
- Permissions explicites requises
"""

import os
import sys
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, asdict

# Import des services
try:
    from services.crypto_service import CryptoService
    from services.audit_service import audit_service, ActionType
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    audit_service = None
    ActionType = None


@dataclass
class MemoryEntry:
    """Entrée de mémoire"""
    key: str
    value: Any
    memory_type: str  # "user", "project", "session"
    project_id: Optional[str] = None  # Pour mémoire projet
    created_at: str = ""
    updated_at: str = ""
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()
        if self.metadata is None:
            self.metadata = {}


class MemoryService:
    """
    Service de gestion de mémoire locale intelligente
    
    Gère 3 types de mémoire :
    - user : Persistante, chiffrée, stockée dans data/memory/user.json
    - project : Persistante, chiffrée, stockée dans data/memory/projects/{project_id}.json
    - session : Temporaire, en mémoire uniquement, non chiffrée
    """
    
    def __init__(self):
        # Déterminer le chemin de base
        if getattr(sys, 'frozen', False):
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                self.base_dir = Path(appdata) / "HorizonAI"
            else:
                self.base_dir = Path.home() / ".horizon-ai"
        else:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        
        # Dossiers de stockage
        self.memory_dir = self.base_dir / "data" / "memory"
        self.user_memory_path = self.memory_dir / "user.json"
        self.projects_dir = self.memory_dir / "projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        
        # Mémoire session (temporaire, en mémoire uniquement)
        self.session_memory: Dict[str, Any] = {}
        
        # Service de chiffrement
        self.crypto_service: Optional[CryptoService] = None
        if CRYPTO_AVAILABLE:
            try:
                self.crypto_service = CryptoService()
            except Exception:
                pass
    
    def set_crypto_password(self, password: str) -> bool:
        """
        Configure le mot de passe pour le chiffrement
        
        Args:
            password: Mot de passe utilisateur
            
        Returns:
            True si configuré avec succès
        """
        if not self.crypto_service:
            return False
        
        try:
            return self.crypto_service.set_password(password)
        except Exception:
            return False
    
    def save_memory(
        self,
        memory_type: str,
        key: str,
        value: Any,
        project_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Sauvegarde une entrée de mémoire
        
        Args:
            memory_type: "user", "project", ou "session"
            key: Clé de l'entrée
            value: Valeur à stocker
            project_id: ID du projet (requis pour memory_type="project")
            metadata: Métadonnées optionnelles
            
        Returns:
            True si sauvegardé avec succès
        """
        try:
            # Validation
            if memory_type not in ["user", "project", "session"]:
                return False
            
            if memory_type == "project" and not project_id:
                return False
            
            # Créer l'entrée
            entry = MemoryEntry(
                key=key,
                value=value,
                memory_type=memory_type,
                project_id=project_id,
                metadata=metadata or {}
            )
            
            # Sauvegarder selon le type
            if memory_type == "session":
                # Session : stockage en mémoire uniquement
                self.session_memory[key] = asdict(entry)
                entry.updated_at = datetime.now().isoformat()
                self.session_memory[key] = asdict(entry)
            else:
                # User ou Project : stockage persistant avec chiffrement
                self._save_persistent_memory(entry)
            
            # Audit trail
            if audit_service:
                audit_service.log_action(
                    ActionType.MEMORY_WRITE,
                    {
                        "memory_type": memory_type,
                        "key": key,
                        "project_id": project_id,
                        "has_value": value is not None
                    }
                )
            
            return True
            
        except Exception as e:
            if audit_service:
                audit_service.log_action(
                    ActionType.MEMORY_WRITE,
                    {
                        "error": str(e),
                        "memory_type": memory_type,
                        "key": key
                    }
                )
            return False
    
    def _save_persistent_memory(self, entry: MemoryEntry):
        """Sauvegarde mémoire persistante (user ou project)"""
        if entry.memory_type == "user":
            file_path = self.user_memory_path
        elif entry.memory_type == "project":
            file_path = self.projects_dir / f"{entry.project_id}.json"
        else:
            return
        
        # Charger les données existantes
        data = {}
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Détecter si chiffré (préfixe "ENC:")
                    if content.startswith("ENC:"):
                        if not self.crypto_service or not self.crypto_service._master_key:
                            # Pas de clé, on ne peut pas déchiffrer
                            data = {}
                        else:
                            encrypted_data = content[4:]  # Enlever "ENC:"
                            try:
                                decrypted = self.crypto_service.decrypt_string(encrypted_data)
                                data = json.loads(decrypted)
                            except Exception:
                                data = {}
                    else:
                        # Données en clair
                        data = json.loads(content) if content.strip() else {}
            except Exception:
                data = {}
        
        # Mettre à jour l'entrée
        if "entries" not in data:
            data["entries"] = {}
        
        entry_dict = asdict(entry)
        entry_dict["updated_at"] = datetime.now().isoformat()
        data["entries"][entry.key] = entry_dict
        data["last_updated"] = datetime.now().isoformat()
        
        # Sauvegarder (chiffré si crypto disponible)
        json_data = json.dumps(data, indent=2, ensure_ascii=False)
        
        if self.crypto_service and self.crypto_service._master_key:
            # Chiffrer
            encrypted = self.crypto_service.encrypt_string(json_data)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write("ENC:" + encrypted)
        else:
            # En clair
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(json_data)
    
    def get_memory(
        self,
        memory_type: str,
        key: str,
        project_id: Optional[str] = None
    ) -> Optional[Any]:
        """
        Récupère une entrée de mémoire
        
        Args:
            memory_type: "user", "project", ou "session"
            key: Clé de l'entrée
            project_id: ID du projet (requis pour memory_type="project")
            
        Returns:
            Valeur de l'entrée ou None si non trouvée
        """
        try:
            if memory_type == "session":
                entry_dict = self.session_memory.get(key)
                if entry_dict:
                    return entry_dict.get("value")
                return None
            
            # Charger depuis le fichier
            if memory_type == "user":
                file_path = self.user_memory_path
            elif memory_type == "project":
                if not project_id:
                    return None
                file_path = self.projects_dir / f"{project_id}.json"
            else:
                return None
            
            if not file_path.exists():
                return None
            
            # Lire et déchiffrer si nécessaire
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if content.startswith("ENC:"):
                if not self.crypto_service or not self.crypto_service._master_key:
                    return None
                encrypted_data = content[4:]
                try:
                    decrypted = self.crypto_service.decrypt_string(encrypted_data)
                    data = json.loads(decrypted)
                except Exception:
                    return None
            else:
                data = json.loads(content) if content.strip() else {}
            
            # Récupérer l'entrée
            entries = data.get("entries", {})
            entry_dict = entries.get(key)
            if entry_dict:
                return entry_dict.get("value")
            
            return None
            
        except Exception:
            return None
    
    def list_memories(
        self,
        memory_type: str,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Liste toutes les entrées de mémoire d'un type donné
        
        Args:
            memory_type: "user", "project", ou "session"
            project_id: ID du projet (requis pour memory_type="project")
            
        Returns:
            Liste des entrées (sans les valeurs pour la sécurité)
        """
        try:
            if memory_type == "session":
                return [
                    {
                        "key": key,
                        "memory_type": "session",
                        "created_at": entry.get("created_at"),
                        "updated_at": entry.get("updated_at"),
                        "metadata": entry.get("metadata", {})
                    }
                    for key, entry in self.session_memory.items()
                ]
            
            # Charger depuis le fichier
            if memory_type == "user":
                file_path = self.user_memory_path
            elif memory_type == "project":
                if not project_id:
                    return []
                file_path = self.projects_dir / f"{project_id}.json"
            else:
                return []
            
            if not file_path.exists():
                return []
            
            # Lire et déchiffrer si nécessaire
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if content.startswith("ENC:"):
                if not self.crypto_service or not self.crypto_service._master_key:
                    return []
                encrypted_data = content[4:]
                try:
                    decrypted = self.crypto_service.decrypt_string(encrypted_data)
                    data = json.loads(decrypted)
                except Exception:
                    return []
            else:
                data = json.loads(content) if content.strip() else {}
            
            # Retourner la liste (sans valeurs pour la sécurité)
            entries = data.get("entries", {})
            return [
                {
                    "key": key,
                    "memory_type": memory_type,
                    "project_id": project_id,
                    "created_at": entry.get("created_at"),
                    "updated_at": entry.get("updated_at"),
                    "metadata": entry.get("metadata", {})
                }
                for key, entry in entries.items()
            ]
            
        except Exception:
            return []
    
    def delete_memory(
        self,
        memory_type: str,
        key: str,
        project_id: Optional[str] = None
    ) -> bool:
        """
        Supprime une entrée de mémoire
        
        Args:
            memory_type: "user", "project", ou "session"
            key: Clé de l'entrée
            project_id: ID du projet (requis pour memory_type="project")
            
        Returns:
            True si supprimé avec succès
        """
        try:
            if memory_type == "session":
                if key in self.session_memory:
                    del self.session_memory[key]
                    
                    # Audit trail
                    if audit_service:
                        audit_service.log_action(
                            ActionType.MEMORY_DELETE,
                            {
                                "memory_type": "session",
                                "key": key
                            }
                        )
                    return True
                return False
            
            # Supprimer depuis le fichier
            if memory_type == "user":
                file_path = self.user_memory_path
            elif memory_type == "project":
                if not project_id:
                    return False
                file_path = self.projects_dir / f"{project_id}.json"
            else:
                return False
            
            if not file_path.exists():
                return False
            
            # Charger, modifier, sauvegarder
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if content.startswith("ENC:"):
                if not self.crypto_service or not self.crypto_service._master_key:
                    return False
                encrypted_data = content[4:]
                try:
                    decrypted = self.crypto_service.decrypt_string(encrypted_data)
                    data = json.loads(decrypted)
                except Exception:
                    return False
            else:
                data = json.loads(content) if content.strip() else {}
            
            # Supprimer l'entrée
            entries = data.get("entries", {})
            if key in entries:
                del entries[key]
                data["entries"] = entries
                data["last_updated"] = datetime.now().isoformat()
                
                # Sauvegarder
                json_data = json.dumps(data, indent=2, ensure_ascii=False)
                
                if self.crypto_service and self.crypto_service._master_key:
                    encrypted = self.crypto_service.encrypt_string(json_data)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write("ENC:" + encrypted)
                else:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(json_data)
                
                # Audit trail
                if audit_service:
                    audit_service.log_action(
                        ActionType.MEMORY_DELETE,
                        {
                            "memory_type": memory_type,
                            "key": key,
                            "project_id": project_id
                        }
                    )
                
                return True
            
            return False
            
        except Exception as e:
            if audit_service:
                audit_service.log_action(
                    ActionType.MEMORY_DELETE,
                    {
                        "error": str(e),
                        "memory_type": memory_type,
                        "key": key
                    }
                )
            return False
    
    def clear_session_memory(self) -> bool:
        """
        Vide toute la mémoire de session
        
        Returns:
            True si vidé avec succès
        """
        try:
            count = len(self.session_memory)
            self.session_memory.clear()
            
            # Audit trail
            if audit_service:
                audit_service.log_action(
                    ActionType.MEMORY_DELETE,
                    {
                        "memory_type": "session",
                        "action": "clear_all",
                        "count": count
                    }
                )
            
            return True
        except Exception:
            return False


# Instance globale
memory_service = MemoryService()
