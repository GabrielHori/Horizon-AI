"""
File Storage Helper pour Horizon AI V2.1
========================================
Helper pour lecture/écriture de fichiers chiffrés avec gestion automatique.

Centralise le pattern répété dans chat_history_service, memory_service, project_service :
- Détection préfixe "ENC:"
- Déchiffrement automatique
- Chiffrement conditionnel (si crypto disponible)
- Gestion des erreurs

Usage:
    from services.file_storage_helper import FileStorageHelper
    
    # Lecture
    data = FileStorageHelper.read_encrypted_file(
        Path("file.json"),
        crypto_service,
        default={}
    )
    
    # Écriture
    FileStorageHelper.write_encrypted_file(
        Path("file.json"),
        {"key": "value"},
        crypto_service
    )
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Union


class FileStorageHelper:
    """
    Helper stateless pour lecture/écriture de fichiers JSON chiffrés
    
    Gère automatiquement :
    - Détection du chiffrement (préfixe "ENC:")
    - Déchiffrement si clé disponible
    - Chiffrement si crypto_service fourni avec clé
    - Fallback mode clair si pas de crypto
    - Gestion des erreurs avec logging
    """
    
    @staticmethod
    def read_encrypted_file(
        file_path: Union[Path, str],
        crypto_service: Any,
        default: Any = None
    ) -> Any:
        """
        Lit un fichier JSON potentiellement chiffré
        
        Args:
            file_path: Chemin du fichier (Path ou str)
            crypto_service: Instance de CryptoService (peut être None)
            default: Valeur par défaut si fichier inexistant ou erreur
            
        Returns:
            Données déchiffrées (dict ou list) ou default
            
        Exemples:
            >>> data = FileStorageHelper.read_encrypted_file(
            ...     Path("history/chat.json"),
            ...     crypto_service,
            ...     default={}
            ... )
            >>> # Si fichier chiffré et clé OK → retourne données déchiffrées
            >>> # Si fichier inexistant → retourne {}
            >>> # Si erreur déchiffrement → retourne {}
        """
        # Convertir en Path si nécessaire
        if isinstance(file_path, str):
            file_path = Path(file_path)
        
        # Vérifier existence
        if not file_path.exists():
            return default
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Vérifier si fichier vide
            if not content.strip():
                return default
            
            # Détection chiffrement (préfixe "ENC:")
            if content.startswith("ENC:"):
                # Fichier chiffré
                if not crypto_service:
                    print(f"[FileStorageHelper] Encrypted file but no crypto_service: {file_path}", file=sys.stderr)
                    return default
                
                if not getattr(crypto_service, '_master_key', None):
                    print(f"[FileStorageHelper] Encrypted file but no master key: {file_path}", file=sys.stderr)
                    return default
                
                try:
                    # Déchiffrer
                    encrypted_data = content[4:]  # Enlever préfixe "ENC:"
                    decrypted = crypto_service.decrypt_string(encrypted_data)
                    return json.loads(decrypted)
                except Exception as e:
                    print(f"[FileStorageHelper] Error decrypting file {file_path}: {e}", file=sys.stderr)
                    return default
            else:
                # Fichier en clair
                try:
                    return json.loads(content)
                except json.JSONDecodeError as e:
                    print(f"[FileStorageHelper] Invalid JSON in file {file_path}: {e}", file=sys.stderr)
                    return default
        
        except Exception as e:
            print(f"[FileStorageHelper] Error reading file {file_path}: {e}", file=sys.stderr)
            return default
    
    @staticmethod
    def write_encrypted_file(
        file_path: Union[Path, str],
        data: Union[Dict[str, Any], list],
        crypto_service: Any,
        indent: int = 2,
        force_plain: bool = False
    ) -> bool:
        """
        Écrit un fichier JSON avec chiffrement optionnel
        
        Args:
            file_path: Chemin du fichier (Path ou str)
            data: Données à écrire (dict ou list)
            crypto_service: Instance de CryptoService (peut être None)
            indent: Indentation JSON (défaut: 2)
            force_plain: Si True, écrit en clair même si crypto disponible
            
        Returns:
            True si succès, False si erreur
            
        Behavior:
            - Si crypto_service fourni ET clé disponible ET pas force_plain → chiffre
            - Sinon → écrit en clair
            
        Exemples:
            >>> # Avec chiffrement (si crypto_service a une clé)
            >>> success = FileStorageHelper.write_encrypted_file(
            ...     Path("chat.json"),
            ...     {"messages": []},
            ...     crypto_service
            ... )
            
            >>> # Force mode clair
            >>> success = FileStorageHelper.write_encrypted_file(
            ...     Path("config.json"),
            ...     {"setting": "value"},
            ...     crypto_service,
            ...     force_plain=True
            ... )
        """
        # Convertir en Path si nécessaire
        if isinstance(file_path, str):
            file_path = Path(file_path)
        
        try:
            # Créer dossiers parents si nécessaire
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Sérialiser en JSON
            json_data = json.dumps(data, indent=indent, ensure_ascii=False)
            
            # Déterminer si on doit chiffrer
            should_encrypt = (
                not force_plain and
                crypto_service is not None and
                getattr(crypto_service, '_master_key', None) is not None
            )
            
            if should_encrypt:
                # Mode chiffré
                try:
                    encrypted = crypto_service.encrypt_string(json_data)
                    content = "ENC:" + encrypted
                except Exception as e:
                    print(f"[FileStorageHelper] Error encrypting, falling back to plain: {e}", file=sys.stderr)
                    # Fallback: écrire en clair si chiffrement échoue
                    content = json_data
            else:
                # Mode clair
                content = json_data
            
            # Écrire dans le fichier
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        
        except Exception as e:
            print(f"[FileStorageHelper] Error writing file {file_path}: {e}", file=sys.stderr)
            return False
    
    @staticmethod
    def is_encrypted(file_path: Union[Path, str]) -> bool:
        """
        Vérifie si un fichier est chiffré (sans le lire entièrement)
        
        Args:
            file_path: Chemin du fichier
            
        Returns:
            True si fichier chiffré, False sinon
        """
        if isinstance(file_path, str):
            file_path = Path(file_path)
        
        if not file_path.exists():
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Lire juste les 4 premiers caractères
                prefix = f.read(4)
                return prefix == "ENC:"
        except Exception:
            return False


# Instance globale (pour cohérence avec autres services)
# Bien que ce soit une classe stateless, on fournit une instance
# pour faciliter l'import
file_storage_helper = FileStorageHelper()
