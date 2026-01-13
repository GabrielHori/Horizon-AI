"""
Service d'audit pour Horizon AI V2
==================================
Log toutes les actions IA pour traçabilité complète.

IMPORTANT - Philosophie LOCAL-FIRST:
- Tous les logs sont stockés localement
- Aucune donnée envoyée à l'extérieur
- Format JSONL pour faciliter l'export
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from enum import Enum


class ActionType(Enum):
    """Types d'actions auditées"""
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"
    FILE_DELETE = "file_delete"
    COMMAND_EXECUTE = "command_execute"
    AGENT_PROPOSAL = "agent_proposal"
    MEMORY_WRITE = "memory_write"
    MEMORY_SAVE = "memory_save"
    MEMORY_DELETE = "memory_delete"
    PROMPT_SENT = "prompt_sent"
    REMOTE_ACCESS = "remote_access"
    REMOTE_ACCESS_REVOKED = "remote_access_revoked"  # V2.1 : Révocation session rapide
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"


class AuditService:
    """
    Service d'audit pour logger toutes les actions IA
    
    Tous les logs sont stockés dans data/audit/
    Format : JSONL (JSON Lines) pour faciliter le parsing
    """
    
    def __init__(self):
        # Déterminer le chemin de base
        if getattr(sys, 'frozen', False):
            # Mode PyInstaller : utiliser AppData
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                base_dir = Path(appdata) / "HorizonAI"
            else:
                base_dir = Path.home() / ".horizon-ai"
        else:
            # Mode développement
            base_dir = Path(__file__).resolve().parent.parent.parent
        
        self.audit_dir = base_dir / "data" / "audit"
        self.audit_dir.mkdir(parents=True, exist_ok=True)
        
        # Fichiers de logs spécialisés
        self.actions_log = self.audit_dir / "actions.log"
        self.file_access_log = self.audit_dir / "file_access.log"
        self.remote_access_log = self.audit_dir / "remote_access.log"
        self.prompts_log = self.audit_dir / "prompts.log"
    
    def log_action(
        self,
        action_type: ActionType,
        details: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """
        Log une action dans le fichier d'audit
        
        Args:
            action_type: Type d'action (ActionType enum)
            details: Détails de l'action (dict)
            user_id: ID utilisateur (optionnel)
            ip_address: Adresse IP (pour remote access)
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "action_type": action_type.value,
            "details": details,
        }
        
        if user_id:
            log_entry["user_id"] = user_id
        
        if ip_address:
            log_entry["ip_address"] = ip_address
        
        # Écrire dans le log principal
        self._write_log(self.actions_log, log_entry)
        
        # Logs spécialisés selon le type d'action
        if action_type in [
            ActionType.FILE_READ,
            ActionType.FILE_WRITE,
            ActionType.FILE_DELETE
        ]:
            self._write_log(self.file_access_log, log_entry)
        
        if action_type in [ActionType.REMOTE_ACCESS, ActionType.REMOTE_ACCESS_REVOKED]:
            self._write_log(self.remote_access_log, log_entry)
        
        if action_type == ActionType.PROMPT_SENT:
            self._write_log(self.prompts_log, log_entry)
    
    def _write_log(self, log_file: Path, entry: Dict[str, Any]):
        """Écrit une entrée dans un fichier de log (format JSONL)"""
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"[AUDIT ERROR] Failed to write log: {e}", file=sys.stderr)
    
    def export_logs(
        self,
        output_path: Path,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action_types: Optional[list] = None,
    ) -> int:
        """
        Exporte les logs dans un fichier JSON
        
        Args:
            output_path: Chemin du fichier de sortie
            start_date: Date de début (optionnel)
            end_date: Date de fin (optionnel)
            action_types: Liste de types d'actions à exporter (optionnel, None = tous)
        
        Returns:
            Nombre d'entrées exportées
        """
        entries = []
        
        if not self.actions_log.exists():
            return 0
        
        try:
            with open(self.actions_log, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        entry = json.loads(line)
                        entry_date = datetime.fromisoformat(entry["timestamp"])
                        
                        # Filtrer par date
                        if start_date and entry_date < start_date:
                            continue
                        if end_date and entry_date > end_date:
                            continue
                        
                        # Filtrer par type d'action
                        if action_types and entry.get("action_type") not in action_types:
                            continue
                        
                        entries.append(entry)
                    except json.JSONDecodeError:
                        continue  # Ignorer les lignes invalides
            
            # Écrire le fichier d'export
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(entries, f, indent=2, ensure_ascii=False)
            
            return len(entries)
        except Exception as e:
            print(f"[AUDIT ERROR] Failed to export logs: {e}", file=sys.stderr)
            return 0
    
    def get_log_stats(self) -> Dict[str, Any]:
        """
        Retourne des statistiques sur les logs
        
        Returns:
            Dict avec statistiques (total entries, par type, etc.)
        """
        stats = {
            "total_entries": 0,
            "by_action_type": {},
            "file_access_count": 0,
            "remote_access_count": 0,
            "prompts_count": 0,
        }
        
        if not self.actions_log.exists():
            return stats
        
        try:
            with open(self.actions_log, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        entry = json.loads(line)
                        stats["total_entries"] += 1
                        
                        action_type = entry.get("action_type", "unknown")
                        stats["by_action_type"][action_type] = stats["by_action_type"].get(action_type, 0) + 1
                        
                        if action_type in ["file_read", "file_write", "file_delete"]:
                            stats["file_access_count"] += 1
                        elif action_type in ["remote_access", "remote_access_revoked"]:
                            stats["remote_access_count"] += 1
                        elif action_type == "prompt_sent":
                            stats["prompts_count"] += 1
                    except json.JSONDecodeError:
                        continue
            
        except Exception as e:
            print(f"[AUDIT ERROR] Failed to get stats: {e}", file=sys.stderr)
        
        return stats


# Singleton
audit_service = AuditService()
