"""
Project Service pour Horizon AI V2.1
=====================================
Service de gestion des projets persistants avec nouvelle structure.

Nouveau modèle :
- Projet = conteneur logique complet (UUID unique)
- Contient : repos[], memoryKeys[], permissions, settings
- Lié explicitement aux conversations via projectId
"""

import os
import sys
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass

# Import des services
try:
    from services.memory_service import memory_service
    from services.chat_history_service import chat_history_service
    from services.audit_service import audit_service, ActionType
    SERVICES_AVAILABLE = True
except ImportError:
    SERVICES_AVAILABLE = False
    memory_service = None
    chat_history_service = None
    audit_service = None
    ActionType = None


@dataclass
class ProjectRepo:
    """Repository attaché à un projet"""
    path: str
    attachedAt: str  # ISO date
    analysis: Optional[Dict[str, Any]] = None  # Cache de l'analyse


@dataclass
class ProjectPermissions:
    """Permissions d'un projet"""
    read: bool = True
    write: bool = False
    custom: Optional[Dict[str, bool]] = None  # Permissions custom par projet


@dataclass
class ProjectSettings:
    """Paramètres d'un projet"""
    defaultModel: Optional[str] = None
    autoLoadRepo: bool = True
    contextMode: str = 'safe'  # 'safe' | 'standard'


@dataclass
class Project:
    """Structure d'un projet V2.1"""
    id: str  # UUID v4
    name: str
    description: Optional[str] = None
    scopePath: Optional[str] = None  # Dossier de travail (peut être null)
    
    # Repos (peut avoir plusieurs repos)
    repos: List[ProjectRepo] = None
    
    # Mémoire projet
    memoryKeys: List[str] = None  # Clés mémoire de type "project" liées
    
    # Permissions
    permissions: ProjectPermissions = None
    
    # Métadonnées
    createdAt: str = ""  # ISO date
    updatedAt: str = ""  # ISO date
    lastAccessedAt: str = ""  # ISO date
    
    # Config projet
    settings: ProjectSettings = None
    
    # Compteur conversations (calculé dynamiquement)
    conversationCount: int = 0
    
    def __post_init__(self):
        """Initialisation par défaut"""
        if not self.id:
            self.id = str(uuid.uuid4())
        
        if not self.repos:
            self.repos = []
        
        if not self.memoryKeys:
            self.memoryKeys = []
        
        if not self.permissions:
            self.permissions = ProjectPermissions()
        
        if not self.settings:
            self.settings = ProjectSettings()
        
        if not self.createdAt:
            self.createdAt = datetime.utcnow().isoformat()
        
        if not self.updatedAt:
            self.updatedAt = datetime.utcnow().isoformat()
        
        if not self.lastAccessedAt:
            self.lastAccessedAt = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertit le projet en dictionnaire pour JSON"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "scopePath": self.scopePath,
            "repos": [
                {
                    "path": repo.path,
                    "attachedAt": repo.attachedAt,
                    "analysis": repo.analysis
                } for repo in self.repos
            ],
            "memoryKeys": self.memoryKeys,
            "permissions": {
                "read": self.permissions.read,
                "write": self.permissions.write,
                "custom": self.permissions.custom or {}
            },
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt,
            "lastAccessedAt": self.lastAccessedAt,
            "settings": {
                "defaultModel": self.settings.defaultModel,
                "autoLoadRepo": self.settings.autoLoadRepo,
                "contextMode": self.settings.contextMode
            },
            "conversationCount": self.conversationCount
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Project':
        """Crée un projet depuis un dictionnaire"""
        # Gérer les repos
        repos = []
        if data.get("repos"):
            for repo_data in data["repos"]:
                repos.append(ProjectRepo(
                    path=repo_data["path"],
                    attachedAt=repo_data.get("attachedAt", datetime.utcnow().isoformat()),
                    analysis=repo_data.get("analysis")
                ))
        
        # Gérer les permissions
        perms_data = data.get("permissions", {})
        permissions = ProjectPermissions(
            read=perms_data.get("read", True),
            write=perms_data.get("write", False),
            custom=perms_data.get("custom")
        )
        
        # Gérer les settings
        settings_data = data.get("settings", {})
        settings = ProjectSettings(
            defaultModel=settings_data.get("defaultModel"),
            autoLoadRepo=settings_data.get("autoLoadRepo", True),
            contextMode=settings_data.get("contextMode", "safe")
        )
        
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            scopePath=data.get("scopePath"),
            repos=repos,
            memoryKeys=data.get("memoryKeys", []),
            permissions=permissions,
            createdAt=data.get("createdAt", datetime.utcnow().isoformat()),
            updatedAt=data.get("updatedAt", datetime.utcnow().isoformat()),
            lastAccessedAt=data.get("lastAccessedAt", datetime.utcnow().isoformat()),
            settings=settings,
            conversationCount=data.get("conversationCount", 0)
        )


class ProjectService:
    """
    Service de gestion des projets persistants
    
    Stockage : data/projects/projects.json (chiffré si crypto disponible)
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
        
        # Dossier de stockage
        self.projects_dir = self.base_dir / "data" / "projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.projects_file = self.projects_dir / "projects.json"
        
        # Service de chiffrement (optionnel)
        try:
            from services.crypto_service import crypto_service
            self.crypto_service = crypto_service
        except ImportError:
            self.crypto_service = None
    
    def list_projects(self) -> List[Project]:
        """
        Liste tous les projets avec conversationCount calculé
        
        Returns:
            Liste de projets triés par lastAccessedAt (plus récent en premier)
        """
        projects = self._load_projects()
        
        # Calculer conversationCount pour chaque projet
        if SERVICES_AVAILABLE and chat_history_service:
            for project in projects:
                try:
                    count = chat_history_service.get_conversation_count_by_project(project.id)
                    project.conversationCount = count
                except Exception as e:
                    print(f"[ProjectService] Error counting conversations: {e}", file=sys.stderr)
                    project.conversationCount = 0
        
        # Trier par lastAccessedAt (plus récent en premier)
        projects.sort(key=lambda p: p.lastAccessedAt, reverse=True)
        
        return projects
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """
        Récupère un projet par ID
        
        Args:
            project_id: UUID du projet
            
        Returns:
            Projet ou None si non trouvé
        """
        projects = self.list_projects()
        project = next((p for p in projects if p.id == project_id), None)
        
        # Mettre à jour lastAccessedAt
        if project:
            project.lastAccessedAt = datetime.utcnow().isoformat()
            self.update_project(project_id, {"lastAccessedAt": project.lastAccessedAt})
        
        return project
    
    def create_project(
        self,
        name: str,
        description: Optional[str] = None,
        scopePath: Optional[str] = None,
        permissions: Optional[Dict[str, Any]] = None
    ) -> Project:
        """
        Crée un nouveau projet
        
        Args:
            name: Nom du projet
            description: Description optionnelle
            scopePath: Chemin du dossier de travail (optionnel)
            permissions: Permissions initiales (optionnel)
            
        Returns:
            Projet créé
        """
        # Créer le projet
        project = Project(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            scopePath=scopePath,
            repos=[],
            memoryKeys=[],
            permissions=ProjectPermissions(
                read=permissions.get("read", True) if permissions else True,
                write=permissions.get("write", False) if permissions else False,
                custom=permissions.get("custom") if permissions else None
            ),
            createdAt=datetime.utcnow().isoformat(),
            updatedAt=datetime.utcnow().isoformat(),
            lastAccessedAt=datetime.utcnow().isoformat()
        )
        
        # Sauvegarder
        projects = self._load_projects()
        projects.append(project)
        self._save_projects(projects)
        
        # Logger dans audit
        if SERVICES_AVAILABLE and audit_service and ActionType:
            try:
                audit_service.log_action(
                    ActionType.PERMISSION_GRANTED,
                    {
                        "action": "project_created",
                        "project_id": project.id,
                        "project_name": project.name,
                        "scopePath": project.scopePath
                    }
                )
            except Exception as e:
                print(f"[ProjectService] Error logging: {e}", file=sys.stderr)
        
        return project
    
    def update_project(self, project_id: str, updates: Dict[str, Any]) -> Optional[Project]:
        """
        Met à jour un projet
        
        Args:
            project_id: UUID du projet
            updates: Dictionnaire des champs à mettre à jour
            
        Returns:
            Projet mis à jour ou None si non trouvé
        """
        projects = self._load_projects()
        project = next((p for p in projects if p.id == project_id), None)
        
        if not project:
            return None
        
        # Mettre à jour les champs
        if "name" in updates:
            project.name = updates["name"]
        if "description" in updates:
            project.description = updates.get("description")
        if "scopePath" in updates:
            project.scopePath = updates.get("scopePath")
        if "repos" in updates:
            # Convertir la liste de dicts en objets ProjectRepo
            repos_data = updates["repos"]
            project.repos = [
                ProjectRepo(
                    path=repo_data["path"],
                    attachedAt=repo_data.get("attachedAt", datetime.utcnow().isoformat()),
                    analysis=repo_data.get("analysis")
                ) for repo_data in repos_data
            ]
        if "memoryKeys" in updates:
            project.memoryKeys = updates["memoryKeys"] or []
        if "permissions" in updates:
            perms_data = updates["permissions"]
            project.permissions.read = perms_data.get("read", project.permissions.read)
            project.permissions.write = perms_data.get("write", project.permissions.write)
            if "custom" in perms_data:
                project.permissions.custom = perms_data["custom"]
        if "settings" in updates:
            settings_data = updates["settings"]
            if "defaultModel" in settings_data:
                project.settings.defaultModel = settings_data["defaultModel"]
            if "autoLoadRepo" in settings_data:
                project.settings.autoLoadRepo = settings_data["autoLoadRepo"]
            if "contextMode" in settings_data:
                project.settings.contextMode = settings_data["contextMode"]
        if "lastAccessedAt" in updates:
            project.lastAccessedAt = updates["lastAccessedAt"]
        
        project.updatedAt = datetime.utcnow().isoformat()
        
        # Sauvegarder
        self._save_projects(projects)
        
        return project
    
    def add_repo_to_project(self, project_id: str, repo_path: str, analysis: Optional[Dict[str, Any]] = None) -> Optional[Project]:
        """
        Ajoute un repository à un projet
        
        Args:
            project_id: UUID du projet
            repo_path: Chemin du repository
            analysis: Cache de l'analyse (optionnel)
            
        Returns:
            Projet mis à jour ou None
        """
        project = self.get_project(project_id)
        if not project:
            return None
        
        # Vérifier si le repo existe déjà
        existing_repo = next((r for r in project.repos if r.path == repo_path), None)
        if existing_repo:
            # Mettre à jour l'analyse si fournie
            if analysis:
                existing_repo.analysis = analysis
                existing_repo.attachedAt = datetime.utcnow().isoformat()
        else:
            # Ajouter le nouveau repo
            project.repos.append(ProjectRepo(
                path=repo_path,
                attachedAt=datetime.utcnow().isoformat(),
                analysis=analysis
            ))
        
        # Sauvegarder via update_project (qui gère la conversion)
        updates = {
            "repos": [
                {
                    "path": r.path,
                    "attachedAt": r.attachedAt,
                    "analysis": r.analysis
                } for r in project.repos
            ]
        }
        return self.update_project(project_id, updates)
    
    def remove_repo_from_project(self, project_id: str, repo_path: str) -> Optional[Project]:
        """
        Retire un repository d'un projet
        
        Args:
            project_id: UUID du projet
            repo_path: Chemin du repository à retirer
            
        Returns:
            Projet mis à jour ou None
        """
        project = self.get_project(project_id)
        if not project:
            return None
        
        # Retirer le repo
        project.repos = [r for r in project.repos if r.path != repo_path]
        
        # Sauvegarder via update_project (qui gère la conversion)
        updates = {
            "repos": [
                {
                    "path": r.path,
                    "attachedAt": r.attachedAt,
                    "analysis": r.analysis
                } for r in project.repos
            ]
        }
        return self.update_project(project_id, updates)
    
    def add_memory_key_to_project(self, project_id: str, memory_key: str) -> Optional[Project]:
        """
        Ajoute une clé mémoire à un projet
        
        Args:
            project_id: UUID du projet
            memory_key: Clé mémoire (type "project", projectId=project_id)
            
        Returns:
            Projet mis à jour ou None
        """
        project = self.get_project(project_id)
        if not project:
            return None
        
        if memory_key not in project.memoryKeys:
            project.memoryKeys.append(memory_key)
        
        updates = {
            "memoryKeys": project.memoryKeys
        }
        return self.update_project(project_id, updates)
    
    def remove_memory_key_from_project(self, project_id: str, memory_key: str) -> Optional[Project]:
        """
        Retire une clé mémoire d'un projet
        
        Args:
            project_id: UUID du projet
            memory_key: Clé mémoire à retirer
            
        Returns:
            Projet mis à jour ou None
        """
        project = self.get_project(project_id)
        if not project:
            return None
        
        project.memoryKeys = [k for k in project.memoryKeys if k != memory_key]
        
        updates = {
            "memoryKeys": project.memoryKeys
        }
        return self.update_project(project_id, updates)
    
    def delete_project(self, project_id: str) -> bool:
        """
        Supprime un projet et ses données associées
        
        Args:
            project_id: UUID du projet
            
        Returns:
            True si supprimé, False sinon
        """
        projects = self._load_projects()
        project = next((p for p in projects if p.id == project_id), None)
        
        if not project:
            return False
        
        # Supprimer la mémoire projet (si service disponible)
        if SERVICES_AVAILABLE and memory_service:
            try:
                # Supprimer toutes les entrées de mémoire du projet (via le fichier complet)
                memory_file = memory_service.projects_dir / f"{project_id}.json"
                if memory_file.exists():
                    try:
                        memory_file.unlink()  # Supprimer le fichier complet
                    except Exception as e:
                        print(f"[ProjectService] Error deleting memory file: {e}", file=sys.stderr)
                
                # Supprimer également chaque clé individuellement (nettoyage supplémentaire)
                for memory_key in project.memoryKeys:
                    try:
                        memory_service.delete_memory("project", memory_key, project_id=project_id)
                    except Exception:
                        pass  # Ignorer si déjà supprimé
            except Exception as e:
                print(f"[ProjectService] Error deleting memory: {e}", file=sys.stderr)
        
        # Marquer les conversations comme orphelines (projectId = null) OU les déplacer vers projet "Orphelin"
        # V2.1 Sprint 2.2 : Optionnellement déplacer vers projet "Orphelin" automatique
        # Pour l'instant, on marque simplement comme orphelines (projectId = null)
        if SERVICES_AVAILABLE and chat_history_service:
            try:
                # Récupérer toutes les conversations du projet
                conversations = chat_history_service.list_conversations_by_project(project_id)
                for conv in conversations:
                    # Marquer comme orpheline (projectId = null)
                    # TODO V2.1 Sprint 2.2 Optionnel : Déplacer vers projet "Orphelin" au lieu de null
                    chat_history_service.update_conversation_project(conv.get("id"), None)
            except Exception as e:
                print(f"[ProjectService] Error updating conversations: {e}", file=sys.stderr)
        
        # Retirer le projet
        projects = [p for p in projects if p.id != project_id]
        self._save_projects(projects)
        
        # Logger dans audit
        if SERVICES_AVAILABLE and audit_service and ActionType:
            try:
                audit_service.log_action(
                    ActionType.PERMISSION_DENIED,
                    {
                        "action": "project_deleted",
                        "project_id": project_id,
                        "project_name": project.name
                    }
                )
            except Exception as e:
                print(f"[ProjectService] Error logging: {e}", file=sys.stderr)
        
        return True
    
    def _load_projects(self) -> List[Project]:
        """Charge les projets depuis le fichier"""
        if not self.projects_file.exists():
            return []
        
        try:
            with open(self.projects_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Détecter si chiffré (préfixe "ENC:")
                if content.startswith("ENC:"):
                    if not self.crypto_service or not self.crypto_service._master_key:
                        print("[ProjectService] Encrypted file but no crypto key, returning empty", file=sys.stderr)
                        return []
                    
                    encrypted_data = content[4:]  # Enlever "ENC:"
                    try:
                        decrypted = self.crypto_service.decrypt_string(encrypted_data)
                        data = json.loads(decrypted)
                    except Exception as e:
                        print(f"[ProjectService] Error decrypting: {e}", file=sys.stderr)
                        return []
                else:
                    # Données en clair
                    data = json.loads(content) if content.strip() else {}
            
            # Convertir en objets Project
            projects_data = data.get("projects", [])
            projects = [Project.from_dict(p) for p in projects_data]
            
            return projects
            
        except Exception as e:
            print(f"[ProjectService] Error loading projects: {e}", file=sys.stderr)
            return []
    
    def get_or_create_orphan_project(self, language: str = "fr") -> Project:
        """
        Récupère ou crée le projet "Orphelin" automatique pour conversations sans projet (V2.1 Sprint 2.2)
        
        Args:
            language: Langue pour le nom du projet ("fr" ou "en")
            
        Returns:
            Projet "Orphelin"
        """
        projects = self.list_projects()
        
        # Chercher un projet "Orphelin" existant
        orphan_name_fr = "Projets Orphelins"
        orphan_name_en = "Orphan Projects"
        orphan_project = next(
            (p for p in projects if p.name == orphan_name_fr or p.name == orphan_name_en),
            None
        )
        
        if orphan_project:
            return orphan_project
        
        # Créer le projet "Orphelin" s'il n'existe pas
        orphan_name = orphan_name_fr if language == "fr" else orphan_name_en
        orphan_description = (
            "Projet automatique pour conversations sans projet" 
            if language == "fr" 
            else "Automatic project for conversations without a project"
        )
        
        orphan_project = self.create_project(
            name=orphan_name,
            description=orphan_description,
            scopePath=None,  # Pas de scope spécifique
            permissions={"read": True, "write": False}
        )
        
        return orphan_project
    
    def _save_projects(self, projects: List[Project]):
        """Sauvegarde les projets dans le fichier (chiffré si crypto disponible)"""
        try:
            data = {
                "projects": [p.to_dict() for p in projects],
                "last_updated": datetime.utcnow().isoformat(),
                "version": "2.1"
            }
            
            json_data = json.dumps(data, indent=2, ensure_ascii=False)
            
            # Chiffrer si crypto disponible
            if self.crypto_service and self.crypto_service._master_key:
                try:
                    encrypted = self.crypto_service.encrypt_string(json_data)
                    json_data = "ENC:" + encrypted
                except Exception as e:
                    print(f"[ProjectService] Error encrypting: {e}", file=sys.stderr)
            
            # Écrire dans le fichier
            with open(self.projects_file, 'w', encoding='utf-8') as f:
                f.write(json_data)
                
        except Exception as e:
            print(f"[ProjectService] Error saving projects: {e}", file=sys.stderr)
            raise


# Instance globale du service
project_service = ProjectService()
