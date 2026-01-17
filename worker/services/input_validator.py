"""
Input Validator Service pour Horizon AI V2
==========================================
Valide les entrées utilisateur pour prévenir:
- Formats invalides
- Données malveillantes
- Payloads trop volumineux
- Valeurs hors limites

SÉCURITÉ CRITIQUE - Couche de validation supplémentaire
"""

import re
import sys
from typing import Tuple, Optional, Dict, Any
from ipaddress import ip_address, AddressValueError

class InputValidator:
    """
    Validateur d'entrées utilisateur pour les commandes sensibles

    Usage:
        validator = InputValidator()
        is_valid, error = validator.validate_token("abc123")
        if not is_valid:
            return {"error": error}
    """

    def __init__(self):
        # Configuration des limites
        self.max_payload_size = 1024 * 1024  # 1MB par défaut
        self.max_token_length = 128
        self.max_ip_length = 45  # IPv6 max length

    def validate_token(self, token: str, min_length: int = 8, max_length: Optional[int] = None) -> Tuple[bool, str]:
        """
        Valide un token d'authentification

        Args:
            token: Token à valider
            min_length: Longueur minimale requise
            max_length: Longueur maximale (utilise self.max_token_length si None)

        Returns:
            (is_valid, error_message)
        """
        if max_length is None:
            max_length = self.max_token_length

        # 1. Vérifier non vide
        if not token or not token.strip():
            return False, "Token cannot be empty"

        # 2. Vérifier longueur
        if len(token) < min_length:
            return False, f"Token too short (min {min_length} characters)"
        if len(token) > max_length:
            return False, f"Token too long (max {max_length} characters)"

        # 3. Vérifier caractères valides (alphanumérique + quelques symboles)
        if not re.match(r'^[a-zA-Z0-9\-_=+/.]+$', token):
            return False, "Token contains invalid characters"

        # 4. Vérifier entropie minimale (au moins 3 types de caractères différents)
        char_types = 0
        if re.search(r'[a-z]', token):
            char_types += 1
        if re.search(r'[A-Z]', token):
            char_types += 1
        if re.search(r'[0-9]', token):
            char_types += 1
        if re.search(r'[-_=+/.]', token):
            char_types += 1

        if char_types < 2:
            return False, "Token too weak (needs more character variety)"

        return True, ""

    def validate_ip_address(self, ip_str: str) -> Tuple[bool, str]:
        """
        Valide une adresse IP (IPv4 ou IPv6)

        Args:
            ip_str: Adresse IP à valider

        Returns:
            (is_valid, error_message)
        """
        # 1. Vérifier non vide
        if not ip_str or not ip_str.strip():
            return False, "IP address cannot be empty"

        # 2. Vérifier longueur raisonnable
        if len(ip_str) > self.max_ip_length:
            return False, "IP address too long"

        # 3. Vérifier format avec ipaddress
        try:
            ip = ip_address(ip_str)
            # Vérifier que ce n'est pas une adresse de loopback
            if ip.is_loopback:
                return False, "Loopback addresses are not allowed"
            # Vérifier que ce n'est pas une adresse multicast
            if ip.is_multicast:
                return False, "Multicast addresses are not allowed"
            # Vérifier que ce n'est pas une adresse réservée
            if ip.is_reserved:
                return False, "Reserved addresses are not allowed"
            return True, ""
        except AddressValueError:
            return False, "Invalid IP address format"
        except Exception as e:
            return False, f"IP validation error: {str(e)}"

    def validate_payload_size(self, payload: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Valide la taille d'un payload

        Args:
            payload: Payload à valider

        Returns:
            (is_valid, error_message)
        """
        try:
            # Convertir en JSON pour calculer la taille
            import json
            payload_str = json.dumps(payload)
            payload_size = len(payload_str.encode('utf-8'))

            if payload_size > self.max_payload_size:
                return False, f"Payload too large (max {self.max_payload_size} bytes, got {payload_size})"

            return True, ""
        except Exception as e:
            return False, f"Payload size validation error: {str(e)}"

    def validate_repo_path(self, path_str: str) -> Tuple[bool, str]:
        """
        Valide un chemin de repository (wrapper autour de path_validator)

        Args:
            path_str: Chemin à valider

        Returns:
            (is_valid, error_message)
        """
        try:
            from services.path_validator import path_validator
            return path_validator.is_safe_repo_path(path_str)
        except ImportError:
            # Fallback si path_validator pas disponible
            return self._basic_path_validation(path_str)
        except Exception as e:
            return False, f"Repository path validation error: {str(e)}"

    def _basic_path_validation(self, path_str: str) -> Tuple[bool, str]:
        """
        Validation basique de chemin (fallback)

        Args:
            path_str: Chemin à valider

        Returns:
            (is_valid, error_message)
        """
        # 1. Vérifier non vide
        if not path_str or not path_str.strip():
            return False, "Path cannot be empty"

        # 2. Vérifier longueur raisonnable
        if len(path_str) > 512:
            return False, "Path too long"

        # 3. Vérifier caractères dangereux
        dangerous_patterns = ['..', '~', '$', '!', '@', '#', '%', '^', '&', '*', '(', ')', '[', ']', '{', '}', '|', '\\', ';', ':', '"', "'", '<', '>', ',', '?']
        for pattern in dangerous_patterns:
            if pattern in path_str:
                return False, f"Path contains dangerous character: {pattern}"

        return True, ""

    def validate_model_name(self, model_name: str) -> Tuple[bool, str]:
        """
        Valide un nom de modèle Ollama

        Args:
            model_name: Nom du modèle à valider

        Returns:
            (is_valid, error_message)
        """
        # 1. Vérifier non vide
        if not model_name or not model_name.strip():
            return False, "Model name cannot be empty"

        # 2. Vérifier longueur raisonnable
        if len(model_name) > 100:
            return False, "Model name too long"

        # 3. Vérifier format valide (alphanumérique + quelques symboles)
        if not re.match(r'^[a-zA-Z0-9:._/-]+$', model_name):
            return False, "Model name contains invalid characters"

        # 4. Vérifier pas de path traversal
        if '..' in model_name or model_name.startswith('/') or model_name.startswith('\\'):
            return False, "Model name contains path traversal"

        return True, ""

    def set_max_payload_size(self, size_bytes: int) -> None:
        """
        Définit la taille maximale autorisée pour les payloads

        Args:
            size_bytes: Taille maximale en octets
        """
        self.max_payload_size = size_bytes
        print(f"[InputValidator] Max payload size set to {size_bytes} bytes", file=sys.stderr)

    def get_validation_stats(self) -> Dict[str, Any]:
        """
        Retourne les statistiques de configuration

        Returns:
            Dictionnaire avec les limites de validation
        """
        return {
            "max_payload_size": self.max_payload_size,
            "max_token_length": self.max_token_length,
            "max_ip_length": self.max_ip_length
        }

# Singleton global
input_validator = InputValidator()
