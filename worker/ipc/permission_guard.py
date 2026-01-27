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
        "get_repo_summary": "RepoAnalyze",
        "detect_tech_debt": "RepoAnalyze",
        "projects_add_repo": "RepoAnalyze",

        # Acces memoire
        "memory_save": "MemoryAccess",
        "memory_get": "MemoryAccess",
        "memory_list": "MemoryAccess",
        "memory_delete": "MemoryAccess",
        "memory_clear_session": "MemoryAccess",
        "memory_set_crypto_password": "MemoryAccess",

        # Acces distant
        "tunnel_install_cloudflared": "RemoteAccess",
        "tunnel_generate_token": "RemoteAccess",
        "tunnel_start": "RemoteAccess",
        "tunnel_stop": "RemoteAccess",
        "tunnel_get_qr": "RemoteAccess",
        "tunnel_add_allowed_ip": "RemoteAccess",
        "tunnel_remove_allowed_ip": "RemoteAccess",
        "tunnel_validate_token": "RemoteAccess",
        "tunnel_validate_custom_token": "RemoteAccess",
        "tunnel_set_custom_token": "RemoteAccess",
        "tunnel_set_named_tunnel": "RemoteAccess",
        "tunnel_get_qr_with_token": "RemoteAccess",
        "http_start": "RemoteAccess",
        "http_stop": "RemoteAccess",

        # Systeme
        "set_startup": "CommandExecute",

        # Acces fichiers (si implemente)
        # "read_file": "FileAccess",
        # "write_file": "FileAccess",
    }

    # Commandes toujours autorisées (pas de permission nécessaire)
    ALWAYS_ALLOWED = {
        "health_check",
        "cancel_chat",
        "shutdown",
        "tunnel_check_cloudflared",
        "tunnel_install_progress",
        "tunnel_get_status",
        "get_system_stats",
        "get_monitoring",
        "load_settings",
        "save_settings",
        "pull",
        "get_models",
        "delete_model",
        "list_conversations",
        "get_conversation_messages",
        "get_conversation_metadata",
        "delete_conversation",
        "chat_history_set_crypto_password",
        "chat",
        "grant_permission",
        "revoke_permission",
        "has_permission",
        "rate_limiter_is_blocked",
        "rate_limiter_get_blocked",
        "rate_limiter_set_limit",
        "rate_limiter_get_limits",
        "rate_limiter_reset",
        "rate_limiter_get_stats",
        "update_conversation_project",
        "projects_list",
        "projects_get",
        "projects_create",
        "projects_update",
        "projects_delete",
        "projects_remove_repo",
        "projects_get_or_create_orphan",
        "airllm_list_models",
        "airllm_status",
        "airllm_enable",
        "airllm_reload",
        "airllm_disable",
        "airllm_set_active_model",
    }

    def __init__(self):
        """Initialize le guard avec les configurations par défaut"""
        self.enabled = True  # Peut être désactivé pour debug (NE PAS FAIRE EN PROD)
        self.log_all_checks = False  # Si True, log TOUTES les vérifications (verbose)
        self.granted_permissions = set()  # Cache des permissions accordées
        self.permission_cache = {}  # Cache des vérifications de permissions
    
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
            (False, "Permission RepoAnalyze required")  # Refusé si pas de permission
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
            # Commande non listee = refus par defaut (deny by default)
            error_msg = f"Unknown or disallowed command: {cmd}"
            print(f"[PERMISSION GUARD DENIED] {error_msg}", file=sys.stderr)
            return False, error_msg

        # 3. Commande sensible détectée - Logger pour audit
        print(
            f"[PERMISSION GUARD] Sensitive command '{cmd}' requires {required_perm}",
            file=sys.stderr
        )

        # 4. Verifier la permission dans le cache
        permission_granted = False
        cache_key = f"{required_perm}"
        if cache_key in self.granted_permissions:
            permission_granted = True

        if not permission_granted:
            # Permission non accordée - Refuser l'accès
            error_msg = f"Permission {required_perm} required for command {cmd}"
            print(f"[PERMISSION GUARD DENIED] {error_msg}", file=sys.stderr)
            return False, error_msg

        # 5. Permission accordée - Autoriser et logger
        print(f"[PERMISSION GUARD GRANTED] Command '{cmd}' with permission {required_perm}", file=sys.stderr)
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

    def grant_permission(self, permission: str) -> None:
        """
        Accorde une permission explicitement (appelé par le système de permissions principal)

        Args:
            permission: Nom de la permission à accorder
        """
        cache_key = f"{permission}"
        self.granted_permissions.add(cache_key)
        print(f"[PERMISSION GUARD] Permission granted: {permission}", file=sys.stderr)

    def revoke_permission(self, permission: str) -> None:
        """
        Révoque une permission explicitement

        Args:
            permission: Nom de la permission à révoquer
        """
        cache_key = f"{permission}"
        if cache_key in self.granted_permissions:
            self.granted_permissions.remove(cache_key)
        print(f"[PERMISSION GUARD] Permission revoked: {permission}", file=sys.stderr)

    def clear_all_permissions(self) -> None:
        """Efface toutes les permissions accordées"""
        self.granted_permissions.clear()
        print("[PERMISSION GUARD] All permissions cleared", file=sys.stderr)

    def has_permission(self, permission: str) -> bool:
        """
        Vérifie si une permission a été accordée

        Args:
            permission: Nom de la permission à vérifier

        Returns:
            True si la permission a été accordée
        """
        cache_key = f"{permission}"
        return cache_key in self.granted_permissions


# Singleton global (pattern standard des services)
permission_guard = PermissionGuard()
