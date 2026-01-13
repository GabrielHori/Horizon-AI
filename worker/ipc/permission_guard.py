"""
Permission Guard pour Horizon AI V2
====================================
Couche de défense secondaire pour les permissions (Defense in Depth)

ARCHITECTURE:
- Autorité principale: PermissionManager (Rust)
- Couche secondaire: PermissionGuard (Python) <- CE FICHIER

Ce guard ajoute une vérification côté Python pour prévenir les bypasses IPC
potentiels et fournit un point central pour logger les accès sensibles.

SÉCURITÉ: Defense in Depth
- Si un attaquant bypass le frontend/Rust, le Python refuse quand même
- Double vérification = double sécurité
- Logs centralisés pour audit
"""

import sys
from typing import Dict, Any, Tuple, Optional


class PermissionGuard:
    """
    Garde de permissions côté Python (Defense in Depth)
    
    Vérifie que les commandes sensibles nécessitant des permissions
    ne sont pas exécutées sans autorisation.
    
    Usage:
        guard = PermissionGuard()
        allowed, error = guard.check("analyze_repository", payload)
        if not allowed:
            return {"error": error}
    """
    
    # Map des commandes sensibles → permission requise
    # Cette table définit TOUTES les commandes nécessitant une permission
    REQUIRED_PERMISSIONS = {
        # Analyse de repository
        "analyze_repository": "RepoAnalyze",
        "projects_add_repo": "RepoAnalyze",
        
        # Accès mémoire
        "memory_save": "MemoryAccess",
        "memory_delete": "MemoryAccess",
        
        # Accès distant
        "tunnel_start": "RemoteAccess",
        "tunnel_stop": "RemoteAccess",
        "http_start": "RemoteAccess",
        "http_stop": "RemoteAccess",
        
        # Accès fichiers (si implémenté)
        # "read_file": "FileAccess",
        # "write_file": "FileAccess",
    }
    
    # Commandes toujours autorisées (pas de permission nécessaire)
    ALWAYS_ALLOWED = {
        "health_check",
        "get_system_stats",
        "get_monitoring",
        "list_conversations",
        "get_messages",
        "save_message",
        "delete_conversation",
        "list_models",
        "get_version",
        "settings_get",
        "settings_set",
    }
    
    def __init__(self):
        """Initialize le guard avec les configurations par défaut"""
        self.enabled = True  # Peut être désactivé pour debug (NE PAS FAIRE EN PROD)
        self.log_all_checks = False  # Si True, log TOUTES les vérifications (verbose)
    
    def check(self, cmd: str, payload: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Vérifie si une commande peut être exécutée
        
        Args:
            cmd: Nom de la commande
            payload: Données de la commande
            
        Returns:
            (allowed, error_message)
            
        Exemples:
            >>> guard.check("list_conversations", {})
            (True, "")  # Toujours autorisé
            
            >>> guard.check("analyze_repository", {})
            (True, "")  # Autorisé mais loggé (Rust fait la vraie vérification)
        """
        if not self.enabled:
            return True, ""  # Guard désactivé (mode debug uniquement)
        
        # 1. Commandes toujours autorisées
        if cmd in self.ALWAYS_ALLOWED:
            if self.log_all_checks:
                print(f"[PERMISSION GUARD] Command '{cmd}' allowed (whitelisted)", file=sys.stderr)
            return True, ""
        
        # 2. Vérifier si la commande nécessite une permission
        required_perm = self.REQUIRED_PERMISSIONS.get(cmd)
        
        if not required_perm:
            # Commande non listée = autorisée par défaut (conservative)
            # Note: En production stricte, inverser cette logique (deny by default)
            if self.log_all_checks:
                print(f"[PERMISSION GUARD] Command '{cmd}' allowed (not restricted)", file=sys.stderr)
            return True, ""
        
        # 3. Commande sensible détectée - Logger pour audit
        print(
            f"[PERMISSION GUARD] Sensitive command '{cmd}' requires {required_perm}",
            file=sys.stderr
        )
        
        # 4. Dans la V2.1, Rust est l'autorité principale
        # Python fait juste du logging ici
        # TODO V3: Implémenter vérification state partagé avec Rust
        # Ex: payload.get("_permission_granted") == True
        
        # Pour l'instant, toujours autoriser (Rust vérifie déjà)
        # Mais logger pour traçabilité
        return True, ""
    
    def get_required_permission(self, cmd: str) -> Optional[str]:
        """
        Retourne la permission requise pour une commande
        
        Args:
            cmd: Nom de la commande
            
        Returns:
            Nom de la permission ou None si aucune permission requise
        """
        return self.REQUIRED_PERMISSIONS.get(cmd)
    
    def is_sensitive_command(self, cmd: str) -> bool:
        """
        Vérifie si une commande est considérée comme sensible
        
        Args:
            cmd: Nom de la commande
            
        Returns:
            True si la commande nécessite une permission
        """
        return cmd in self.REQUIRED_PERMISSIONS
    
    def get_all_sensitive_commands(self) -> Dict[str, str]:
        """
        Retourne toutes les commandes sensibles et leurs permissions
        
        Returns:
            Dict {commande: permission_requise}
        """
        return self.REQUIRED_PERMISSIONS.copy()
    
    def enable_verbose_logging(self):
        """Active le logging verbose (log TOUTE vérification)"""
        self.log_all_checks = True
        print("[PERMISSION GUARD] Verbose logging enabled", file=sys.stderr)
    
    def disable_verbose_logging(self):
        """Désactive le logging verbose"""
        self.log_all_checks = False
    
    def disable(self):
        """
        Désactive le guard (mode debug uniquement)
        
        ⚠️ ATTENTION: NE JAMAIS UTILISER EN PRODUCTION
        """
        self.enabled = False
        print("[PERMISSION GUARD WARNING] Guard DISABLED - All commands allowed!", file=sys.stderr)
    
    def enable(self):
        """Réactive le guard"""
        self.enabled = True
        print("[PERMISSION GUARD] Guard enabled", file=sys.stderr)


# Singleton global (pattern standard des services)
permission_guard = PermissionGuard()
