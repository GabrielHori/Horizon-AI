"""
Rate Limiter Service pour Horizon AI V2
========================================
Limite le nombre de requêtes pour prévenir:
- Attaques par force brute
- Abus d'API
- Consommation excessive de ressources
- Comportements malveillants

SÉCURITÉ CRITIQUE - Protection contre les attaques
"""

import time
import sys
from typing import Dict, Tuple, Optional, Any
from collections import defaultdict, deque
import hashlib

class RateLimiter:
    """
    Système de rate limiting pour protéger les endpoints sensibles

    Usage:
        rate_limiter = RateLimiter()
        allowed, retry_after = rate_limiter.check_limit("tunnel_start", "192.168.1.1")
        if not allowed:
            return {"error": f"Too many requests. Try again in {retry_after} seconds"}
    """

    def __init__(self):
        # Configuration des limites (requêtes par minute)
        self.limits = {
            # Commandes sensibles - limites strictes
            "tunnel_start": 5,          # 5 tentatives par minute
            "tunnel_stop": 5,           # 5 tentatives par minute
            "tunnel_generate_token": 3, # 3 tokens par minute
            "analyze_repository": 3,    # 3 analyses par minute
            "grant_permission": 10,     # 10 permissions par minute

            # Commandes normales - limites raisonnables
            "default": 30,              # 30 requêtes par minute par défaut

            # Commandes critiques - limites très strictes
            "tunnel_validate_custom_token": 2, # 2 validations par minute
            "tunnel_set_custom_token": 2,      # 2 changements par minute
        }

        # Historique des requêtes par commande et IP
        # Structure: {command: {ip: deque(timestamps)}}
        self.request_history: Dict[str, Dict[str, deque]] = defaultdict(lambda: defaultdict(deque))

        # Liste de blocage temporaire (IP bloquées)
        # Structure: {ip: unblock_time}
        self.blocked_ips: Dict[str, float] = {}

        # Durée de blocage (en secondes)
        self.block_duration = 300  # 5 minutes

        # Fenêtre de temps pour le rate limiting (en secondes)
        self.time_window = 60  # 1 minute

    def check_limit(self, command: str, ip: str) -> Tuple[bool, Optional[int]]:
        """
        Vérifie si une requête est autorisée selon les limites de rate limiting

        Args:
            command: Nom de la commande
            ip: Adresse IP du client

        Returns:
            (allowed, retry_after_seconds) - retry_after est None si autorisé
        """
        # 1. Vérifier si l'IP est bloquée
        if ip in self.blocked_ips:
            unblock_time = self.blocked_ips[ip]
            remaining = max(0, unblock_time - time.time())
            if remaining > 0:
                return False, int(remaining)

            # Temps de blocage expiré, retirer de la liste
            del self.blocked_ips[ip]

        # 2. Déterminer la limite pour cette commande
        limit = self.limits.get(command, self.limits["default"])

        # 3. Nettoyer l'historique (supprimer les timestamps trop anciens)
        current_time = time.time()
        history = self.request_history[command][ip]

        # Supprimer les timestamps hors de la fenêtre de temps
        while history and history[0] < current_time - self.time_window:
            history.popleft()

        # 4. Vérifier si la limite est atteinte
        if len(history) >= limit:
            # Limite atteinte - bloquer temporairement l'IP
            self._block_ip(ip)
            return False, self.block_duration

        # 5. Ajouter la requête actuelle à l'historique
        history.append(current_time)

        return True, None

    def _block_ip(self, ip: str) -> None:
        """Bloque une IP temporairement"""
        self.blocked_ips[ip] = time.time() + self.block_duration
        print(f"[RATE LIMITER] IP {ip} blocked for {self.block_duration} seconds due to rate limiting", file=sys.stderr)

    def unblock_ip(self, ip: str) -> bool:
        """Débloque une IP manuellement

        Args:
            ip: Adresse IP à débloquer

        Returns:
            True si l'IP était bloquée et a été débloquée
        """
        if ip in self.blocked_ips:
            del self.blocked_ips[ip]
            print(f"[RATE LIMITER] IP {ip} manually unblocked", file=sys.stderr)
            return True
        return False

    def is_blocked(self, ip: str) -> bool:
        """Vérifie si une IP est bloquée

        Args:
            ip: Adresse IP à vérifier

        Returns:
            True si l'IP est bloquée
        """
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            # Temps expiré, nettoyer
            del self.blocked_ips[ip]
        return False

    def get_blocked_ips(self) -> Dict[str, int]:
        """Retourne la liste des IPs bloquées avec leur temps restant

        Returns:
            Dict {ip: seconds_remaining}
        """
        current_time = time.time()
        blocked = {}
        for ip, unblock_time in list(self.blocked_ips.items()):
            remaining = max(0, unblock_time - current_time)
            if remaining > 0:
                blocked[ip] = int(remaining)
            else:
                # Nettoyer les entrées expirées
                del self.blocked_ips[ip]
        return blocked

    def set_limit(self, command: str, limit: int) -> None:
        """Définit une limite personnalisée pour une commande

        Args:
            command: Nom de la commande
            limit: Nombre maximal de requêtes par minute
        """
        self.limits[command] = limit
        print(f"[RATE LIMITER] Limit for {command} set to {limit} requests/minute", file=sys.stderr)

    def reset_limits(self) -> None:
        """Réinitialise toutes les limites aux valeurs par défaut"""
        # Réinitialiser avec les valeurs par défaut
        self.limits = {
            "tunnel_start": 5,
            "tunnel_stop": 5,
            "tunnel_generate_token": 3,
            "analyze_repository": 3,
            "grant_permission": 10,
            "default": 30,
            "tunnel_validate_custom_token": 2,
            "tunnel_set_custom_token": 2,
        }
        print("[RATE LIMITER] All limits reset to defaults", file=sys.stderr)

    def get_limits(self) -> Dict[str, int]:
        """Retourne les limites actuelles

        Returns:
            Dict {command: limit}
        """
        return self.limits.copy()

    def clear_history(self) -> None:
        """Efface l'historique des requêtes"""
        self.request_history.clear()
        print("[RATE LIMITER] Request history cleared", file=sys.stderr)

    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du rate limiter

        Returns:
            Statistiques d'utilisation
        """
        return {
            "blocked_ips_count": len(self.get_blocked_ips()),
            "commands_tracked": len(self.request_history),
            "limits": self.get_limits(),
            "time_window": self.time_window,
            "block_duration": self.block_duration
        }

# Singleton global
rate_limiter = RateLimiter()
