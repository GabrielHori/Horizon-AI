"""
Tests pour Crypto Service
=========================
Vérifie que le chiffrement/déchiffrement fonctionne correctement.
"""

import sys
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.crypto_service import crypto_service


class TestCryptoService:
    """Tests pour le service de chiffrement"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        # Définir un mot de passe de test
        crypto_service.set_password("test_password_123")
    
    def teardown_method(self):
        """Cleanup après chaque test"""
        # Effacer la clé maître
        crypto_service.clear_master_key()
    
    def test_encrypt_decrypt_bytes(self):
        """Test chiffrement/déchiffrement de bytes"""
        original_data = b"Hello, World! This is a test message."
        
        # Chiffrer
        encrypted = crypto_service.encrypt(original_data)
        assert encrypted != original_data
        assert len(encrypted) > len(original_data)  # Base64 augmente la taille
        
        # Déchiffrer
        decrypted = crypto_service.decrypt(encrypted)
        assert decrypted == original_data
    
    def test_encrypt_decrypt_string(self):
        """Test chiffrement/déchiffrement de string"""
        original_text = "Hello, World! This is a test message with émojis 🚀"
        
        # Chiffrer
        encrypted = crypto_service.encrypt_string(original_text)
        assert encrypted != original_text
        assert isinstance(encrypted, str)
        
        # Déchiffrer
        decrypted = crypto_service.decrypt_string(encrypted)
        assert decrypted == original_text
    
    def test_encrypt_decrypt_with_associated_data(self):
        """Test chiffrement avec associated_data"""
        original_text = "Sensitive data"
        associated_data = "file_path:/test/secret.txt"
        
        # Chiffrer avec associated_data
        encrypted = crypto_service.encrypt_string(original_text, associated_data)
        
        # Déchiffrer avec le même associated_data (doit fonctionner)
        decrypted = crypto_service.decrypt_string(encrypted, associated_data)
        assert decrypted == original_text
        
        # Déchiffrer avec un associated_data différent (doit échouer)
        try:
            wrong_decrypted = crypto_service.decrypt_string(encrypted, "wrong_data")
            assert False, "Should have raised ValueError"
        except ValueError:
            pass  # Attendu
    
    def test_encrypt_decrypt_json(self):
        """Test chiffrement/déchiffrement de JSON"""
        original_data = {
            "name": "Test User",
            "email": "test@example.com",
            "preferences": {
                "language": "fr",
                "theme": "dark"
            }
        }
        
        # Chiffrer
        encrypted = crypto_service.encrypt_json(original_data)
        assert isinstance(encrypted, str)
        
        # Déchiffrer
        decrypted = crypto_service.decrypt_json(encrypted)
        assert decrypted == original_data
        assert decrypted["name"] == "Test User"
        assert decrypted["preferences"]["language"] == "fr"
    
    def test_different_passwords_produce_different_keys(self):
        """Test que différents mots de passe produisent des clés différentes"""
        crypto_service.set_password("password1")
        encrypted1 = crypto_service.encrypt_string("test")
        
        crypto_service.clear_master_key()
        crypto_service.set_password("password2")
        encrypted2 = crypto_service.encrypt_string("test")
        
        # Les données chiffrées doivent être différentes
        assert encrypted1 != encrypted2
    
    def test_same_password_produces_same_decryption(self):
        """Test que le même mot de passe permet de déchiffrer"""
        crypto_service.set_password("test_password")
        encrypted = crypto_service.encrypt_string("secret message")
        
        # Changer de mot de passe puis revenir
        crypto_service.clear_master_key()
        crypto_service.set_password("different_password")
        try:
            crypto_service.decrypt_string(encrypted)
            assert False, "Should have failed with different password"
        except ValueError:
            pass  # Attendu
        
        # Revenir au bon mot de passe
        crypto_service.clear_master_key()
        crypto_service.set_password("test_password")
        decrypted = crypto_service.decrypt_string(encrypted)
        assert decrypted == "secret message"
    
    def test_hash_password(self):
        """Test hashage de mot de passe"""
        password = "test_password_123"
        hash1 = crypto_service.hash_password(password)
        hash2 = crypto_service.hash_password(password)
        
        # Même mot de passe = même hash
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 produit 64 caractères hex
    
    def test_verify_password(self):
        """Test vérification de mot de passe"""
        password = "test_password_123"
        password_hash = crypto_service.hash_password(password)
        
        # Vérifier avec le bon mot de passe
        assert crypto_service.verify_password(password, password_hash) == True
        
        # Vérifier avec un mauvais mot de passe
        assert crypto_service.verify_password("wrong_password", password_hash) == False
    
    def test_empty_data(self):
        """Test avec données vides"""
        # Bytes vides
        encrypted = crypto_service.encrypt(b"")
        decrypted = crypto_service.decrypt(encrypted)
        assert decrypted == b""
        
        # String vide
        encrypted = crypto_service.encrypt_string("")
        decrypted = crypto_service.decrypt_string(encrypted)
        assert decrypted == ""
    
    def test_large_data(self):
        """Test avec grandes quantités de données"""
        # Créer une grande chaîne (1MB)
        large_data = "A" * (1024 * 1024)
        
        encrypted = crypto_service.encrypt_string(large_data)
        decrypted = crypto_service.decrypt_string(encrypted)
        
        assert decrypted == large_data
        assert len(decrypted) == len(large_data)


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
