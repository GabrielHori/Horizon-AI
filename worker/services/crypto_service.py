"""
Crypto Service pour Horizon AI V2
==================================
Service de chiffrement/déchiffrement avec AES-256-GCM.

IMPORTANT - Philosophie LOCAL-FIRST:
- Toutes les clés sont stockées localement
- Aucune clé n'est envoyée à l'extérieur
- Chiffrement optionnel (l'utilisateur peut choisir)
"""

import os
import sys
import base64
import hashlib
from pathlib import Path
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class CryptoService:
    """
    Service de chiffrement/déchiffrement avec AES-256-GCM
    
    Utilise PBKDF2 pour dériver une clé à partir d'un mot de passe
    et AES-256-GCM pour le chiffrement authentifié.
    """
    
    def __init__(self):
        # Déterminer le chemin de base pour stocker les clés
        if getattr(sys, 'frozen', False):
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                self.base_dir = Path(appdata) / "HorizonAI"
            else:
                self.base_dir = Path.home() / ".horizon-ai"
        else:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        
        self.keys_dir = self.base_dir / "data" / "keys"
        self.keys_dir.mkdir(parents=True, exist_ok=True)
        
        # Clé maître (dérivée du mot de passe utilisateur)
        self._master_key: Optional[bytes] = None
    
    def _get_or_create_salt(self) -> bytes:
        """
        Récupère le salt existant ou en crée un nouveau.
        Le salt est stocké dans un fichier local pour persistance.
        
        Returns:
            Salt de 16 bytes
        """
        salt_file = self.keys_dir / "user_salt.bin"
        
        if salt_file.exists():
            # Lire le salt existant
            with open(salt_file, 'rb') as f:
                salt = f.read()
                if len(salt) == 16:
                    return salt
        
        # Générer un nouveau salt aléatoire (16 bytes = 128 bits)
        salt = os.urandom(16)
        
        # Sauvegarder le salt
        with open(salt_file, 'wb') as f:
            f.write(salt)
        
        return salt
    
    def set_password(self, password: str) -> bool:
        """
        Définit le mot de passe utilisateur et dérive la clé maître
        
        Args:
            password: Mot de passe utilisateur
        
        Returns:
            True si succès
        """
        if not password:
            return False
        
        # Récupérer ou créer le salt unique pour cet utilisateur
        salt = self._get_or_create_salt()
        
        # Dériver la clé maître avec PBKDF2 et le salt unique
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=100000,  # Nombre d'itérations pour ralentir les attaques brute-force
            backend=default_backend()
        )
        
        self._master_key = kdf.derive(password.encode('utf-8'))
        return True
    
    def _get_master_key(self) -> bytes:
        """Retourne la clé maître (lève une exception si non définie)"""
        if self._master_key is None:
            raise ValueError("Master key not set. Call set_password() first.")
        return self._master_key
    
    def encrypt(self, data: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """
        Chiffre des données avec AES-256-GCM
        
        Args:
            data: Données à chiffrer
            associated_data: Données associées (optionnel, pour authentification)
        
        Returns:
            Données chiffrées (nonce + ciphertext + tag) encodées en base64
        """
        if not data:
            return b''
        
        master_key = self._get_master_key()
        
        # Générer un nonce aléatoire (12 bytes pour GCM)
        nonce = os.urandom(12)
        
        # Créer l'objet AESGCM
        aesgcm = AESGCM(master_key)
        
        # Chiffrer
        ciphertext = aesgcm.encrypt(nonce, data, associated_data)
        
        # Combiner nonce + ciphertext (le tag est inclus dans ciphertext)
        encrypted = nonce + ciphertext
        
        # Encoder en base64 pour stockage
        return base64.b64encode(encrypted)
    
    def decrypt(self, encrypted_data: bytes, associated_data: Optional[bytes] = None) -> bytes:
        """
        Déchiffre des données avec AES-256-GCM
        
        Args:
            encrypted_data: Données chiffrées (base64 encodées)
            associated_data: Données associées (optionnel, doit correspondre à l'encryption)
        
        Returns:
            Données déchiffrées
        
        Raises:
            ValueError: Si le déchiffrement échoue (données corrompues ou clé incorrecte)
        """
        if not encrypted_data:
            return b''
        
        master_key = self._get_master_key()
        
        # Décoder depuis base64
        try:
            encrypted = base64.b64decode(encrypted_data)
        except Exception as e:
            raise ValueError(f"Invalid base64 data: {e}")
        
        # Extraire le nonce (12 premiers bytes)
        if len(encrypted) < 12:
            raise ValueError("Encrypted data too short")
        
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        
        # Créer l'objet AESGCM
        aesgcm = AESGCM(master_key)
        
        # Déchiffrer
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")
        
        return plaintext
    
    def encrypt_string(self, text: str, associated_data: Optional[str] = None) -> str:
        """
        Chiffre une chaîne de caractères
        
        Args:
            text: Texte à chiffrer
            associated_data: Données associées (optionnel)
        
        Returns:
            Texte chiffré (base64 encodé) sous forme de string
        """
        data = text.encode('utf-8')
        ad = associated_data.encode('utf-8') if associated_data else None
        encrypted = self.encrypt(data, ad)
        return encrypted.decode('utf-8')
    
    def decrypt_string(self, encrypted_text: str, associated_data: Optional[str] = None) -> str:
        """
        Déchiffre une chaîne de caractères
        
        Args:
            encrypted_text: Texte chiffré (base64 encodé)
            associated_data: Données associées (optionnel)
        
        Returns:
            Texte déchiffré
        """
        encrypted = encrypted_text.encode('utf-8')
        ad = associated_data.encode('utf-8') if associated_data else None
        decrypted = self.decrypt(encrypted, ad)
        return decrypted.decode('utf-8')
    
    def encrypt_json(self, data: dict, associated_data: Optional[str] = None) -> str:
        """
        Chiffre un dictionnaire JSON
        
        Args:
            data: Dictionnaire à chiffrer
            associated_data: Données associées (optionnel)
        
        Returns:
            JSON chiffré (base64 encodé) sous forme de string
        """
        import json
        json_str = json.dumps(data, ensure_ascii=False)
        return self.encrypt_string(json_str, associated_data)
    
    def decrypt_json(self, encrypted_json: str, associated_data: Optional[str] = None) -> dict:
        """
        Déchiffre un dictionnaire JSON
        
        Args:
            encrypted_json: JSON chiffré (base64 encodé)
            associated_data: Données associées (optionnel)
        
        Returns:
            Dictionnaire déchiffré
        """
        import json
        decrypted_str = self.decrypt_string(encrypted_json, associated_data)
        return json.loads(decrypted_str)
    
    def hash_password(self, password: str) -> str:
        """
        Hash un mot de passe avec SHA-256 (pour stockage, pas pour dérivation de clé)
        
        Args:
            password: Mot de passe à hasher
        
        Returns:
            Hash hexadécimal
        """
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """
        Vérifie un mot de passe contre un hash
        
        Args:
            password: Mot de passe à vérifier
            password_hash: Hash stocké
        
        Returns:
            True si le mot de passe correspond
        """
        return self.hash_password(password) == password_hash
    
    def clear_master_key(self):
        """Efface la clé maître de la mémoire (sécurité)"""
        if self._master_key:
            # Écraser la mémoire (approximation, Python ne garantit pas l'écrasement)
            self._master_key = b'\x00' * len(self._master_key)
        self._master_key = None


# Singleton
crypto_service = CryptoService()
