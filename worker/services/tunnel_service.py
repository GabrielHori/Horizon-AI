"""
Cloudflare Tunnel Service pour Horizon AI Desktop
================================================
Ce service gère l'accès distant sécurisé via Cloudflare Tunnel.
Philosophie LOCAL-FIRST : aucune donnée n'est stockée côté Cloudflare.

Architecture:
    [Téléphone / PC distant]
            ↓ HTTPS
    [Cloudflare Tunnel]
            ↓ localhost
    [Horizon AI - HTTP Server local]
            ↓
    [Ollama local]
"""

import os
import sys
import json
import secrets
import subprocess
import threading
import hashlib
import time
import urllib.request
import zipfile
import platform
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
import shutil

# Import crypto service pour chiffrement des tokens
try:
    from services.crypto_service import crypto_service
except ImportError:
    crypto_service = None

# Import audit service pour logging révocation (V2.1)
try:
    from services.audit_service import audit_service, ActionType
    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False
    audit_service = None
    ActionType = None


# URL de téléchargement de cloudflared
CLOUDFLARED_DOWNLOAD_URLS = {
    "windows_amd64": "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe",
    "windows_386": "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-386.exe",
    "darwin_amd64": "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz",
    "darwin_arm64": "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz",
    "linux_amd64": "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
}


@dataclass
class TunnelConfig:
    """Configuration du tunnel Cloudflare"""
    enabled: bool = False
    tunnel_url: str = ""
    auth_token: str = ""
    token_created_at: str = ""
    token_expires_hours: int = 24  # Token valide 24h par défaut
    rate_limit_requests: int = 60  # Requêtes max par minute
    rate_limit_window: int = 60  # Fenêtre en secondes
    allowed_ips: List[str] = None  # Liste blanche IP (vide = tous autorisés)
    http_port: int = 8765  # Port local pour le serveur HTTP
    
    def __post_init__(self):
        if self.allowed_ips is None:
            self.allowed_ips = []


class RateLimiter:
    """Limiteur de débit pour protéger contre les abus"""
    
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}
        self.lock = threading.Lock()
    
    def is_allowed(self, client_ip: str) -> bool:
        """Vérifie si une requête est autorisée pour cette IP"""
        with self.lock:
            now = time.time()
            
            # Nettoyer les anciennes entrées
            if client_ip in self.requests:
                self.requests[client_ip] = [
                    t for t in self.requests[client_ip] 
                    if now - t < self.window_seconds
                ]
            else:
                self.requests[client_ip] = []
            
            # Vérifier la limite
            if len(self.requests[client_ip]) >= self.max_requests:
                return False
            
            # Enregistrer cette requête
            self.requests[client_ip].append(now)
            return True
    
    def get_remaining(self, client_ip: str) -> int:
        """Retourne le nombre de requêtes restantes"""
        with self.lock:
            now = time.time()
            if client_ip not in self.requests:
                return self.max_requests
            
            valid_requests = [
                t for t in self.requests[client_ip]
                if now - t < self.window_seconds
            ]
            return max(0, self.max_requests - len(valid_requests))


class TunnelService:
    """
    Service de gestion du tunnel Cloudflare
    
    Fonctionnalités:
    - Installation automatique de cloudflared
    - Démarrage/arrêt du tunnel cloudflared
    - Génération et validation de tokens d'authentification
    - Rate limiting par IP
    - Liste blanche IP optionnelle
    """
    
    def __init__(self):
        # Chemins de configuration
        if getattr(sys, 'frozen', False):
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                self.config_dir = Path(appdata) / "HorizonAI" / "tunnel"
            else:
                self.config_dir = Path.home() / ".horizon-ai" / "tunnel"
        else:
            self.config_dir = Path(__file__).resolve().parent.parent.parent / "data" / "tunnel"
        
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.config_dir / "tunnel_config.json"
        self.token_file = self.config_dir / "auth_tokens.json"
        
        # Chemin de l'exécutable cloudflared installé localement
        if sys.platform == "win32":
            self.local_cloudflared = self.config_dir / "cloudflared.exe"
        else:
            self.local_cloudflared = self.config_dir / "cloudflared"
        
        # État du tunnel
        self.tunnel_process: Optional[subprocess.Popen] = None
        self.tunnel_url: str = ""
        self.is_running: bool = False
        
        # État de l'installation
        self.is_installing: bool = False
        self.install_progress: int = 0
        
        # Rate limiter
        self.rate_limiter = RateLimiter()
        
        # Charger la configuration
        self.config = self._load_config()
        
        # Événement pour le thread de monitoring
        self._stop_event = threading.Event()
        self._monitor_thread: Optional[threading.Thread] = None
    
    def _load_config(self) -> TunnelConfig:
        """Charge la configuration depuis le fichier (avec déchiffrement si nécessaire)"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Déchiffrer le token si chiffré (V2)
                    if data.get("auth_token") and crypto_service:
                        try:
                            # Vérifier si c'est un token chiffré (commence par un préfixe spécial)
                            encrypted_token = data.get("auth_token")
                            if encrypted_token.startswith("ENC:"):
                                # Token chiffré, déchiffrer
                                decrypted_token = crypto_service.decrypt_string(
                                    encrypted_token[4:],  # Enlever le préfixe "ENC:"
                                    associated_data="tunnel_auth_token"
                                )
                                data["auth_token"] = decrypted_token
                        except Exception as e:
                            print(f"[TunnelService] Erreur déchiffrement token: {e}", file=sys.stderr)
                            # En cas d'erreur, garder le token tel quel (compatibilité)
                    
                    return TunnelConfig(**data)
        except Exception as e:
            print(f"[TunnelService] Erreur chargement config: {e}", file=sys.stderr)
        
        return TunnelConfig()
    
    def _save_config(self) -> bool:
        """
        Sauvegarde la configuration (avec chiffrement systématique du token si crypto_service disponible)
        
        V2: Chiffrement systématique pour sécurité maximale
        """
        try:
            config_dict = asdict(self.config)
            
            # Chiffrer le token si disponible (V2 - systématique)
            if config_dict.get("auth_token"):
                # Si déjà chiffré (commence par "ENC:"), ne pas re-chiffrer
                if config_dict["auth_token"].startswith("ENC:"):
                    # Déjà chiffré, garder tel quel
                    pass
                elif crypto_service:
                    try:
                        # Vérifier que crypto_service a une clé maître configurée
                        if not crypto_service._master_key:
                            print("[TunnelService] Warning: CryptoService master key not set. Token saved unencrypted. Set password first.", file=sys.stderr)
                        else:
                            # Chiffrer le token hash
                            encrypted_token = crypto_service.encrypt_string(
                                config_dict["auth_token"],
                                associated_data="tunnel_auth_token"
                            )
                            # Ajouter un préfixe pour identifier les tokens chiffrés
                            config_dict["auth_token"] = f"ENC:{encrypted_token}"
                            print("[TunnelService] Token encrypted before saving", file=sys.stderr)
                    except Exception as e:
                        print(f"[TunnelService] Error encrypting token: {e}. Token saved unencrypted (compatibility).", file=sys.stderr)
                        # En cas d'erreur, sauvegarder en clair (rétrocompatibilité)
                else:
                    print("[TunnelService] Warning: CryptoService not available. Token saved unencrypted. Install crypto dependencies.", file=sys.stderr)
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, indent=4)
            return True
        except Exception as e:
            print(f"[TunnelService] Error saving config: {e}", file=sys.stderr)
            return False
    
    def _get_download_url(self) -> Optional[str]:
        """Retourne l'URL de téléchargement selon le système"""
        system = platform.system().lower()
        machine = platform.machine().lower()
        
        if system == "windows":
            if machine in ["amd64", "x86_64", "x64"]:
                return CLOUDFLARED_DOWNLOAD_URLS["windows_amd64"]
            else:
                return CLOUDFLARED_DOWNLOAD_URLS["windows_386"]
        elif system == "darwin":
            if machine == "arm64":
                return CLOUDFLARED_DOWNLOAD_URLS["darwin_arm64"]
            else:
                return CLOUDFLARED_DOWNLOAD_URLS["darwin_amd64"]
        elif system == "linux":
            return CLOUDFLARED_DOWNLOAD_URLS["linux_amd64"]
        
        return None
    

    def _fetch_remote_sha256(self, download_url: str) -> Optional[str]:
        """Best-effort fetch of a .sha256 file next to the download URL."""
        sha_url = f"{download_url}.sha256"
        try:
            request = urllib.request.Request(
                sha_url,
                headers={'User-Agent': 'HorizonAI/1.0'}
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read().decode('utf-8', errors='ignore').strip()
            if not content:
                return None
            return content.split()[0]
        except Exception as e:
            print(f"[TunnelService] Warning: checksum fetch failed: {e}", file=sys.stderr)
            return None

    def _calculate_sha256(self, file_path: Path) -> str:
        """Calculate SHA256 for a file."""
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _find_cloudflared(self) -> Optional[str]:
        """Trouve l'exécutable cloudflared"""
        # D'abord vérifier notre installation locale
        if self.local_cloudflared.exists():
            return str(self.local_cloudflared)
        
        # Chercher dans le PATH
        cloudflared = shutil.which("cloudflared")
        if cloudflared:
            return cloudflared
        
        # Chemins courants Windows
        common_paths = [
            Path(os.environ.get('LOCALAPPDATA', '')) / "cloudflared" / "cloudflared.exe",
            Path(os.environ.get('PROGRAMFILES', '')) / "cloudflared" / "cloudflared.exe",
            Path.home() / "cloudflared" / "cloudflared.exe",
        ]
        
        for path in common_paths:
            if path.exists():
                return str(path)
        
        return None
    
    def install_cloudflared(self) -> Dict[str, Any]:
        """
        Télécharge et installe cloudflared automatiquement
        
        L'exécutable est placé dans le dossier de configuration de l'application
        pour éviter les problèmes de permissions.
        """
        if self.is_installing:
            return {
                "success": False,
                "error": "Installation already in progress",
                "progress": self.install_progress
            }
        
        # Vérifier si déjà installé
        existing = self._find_cloudflared()
        if existing:
            return {
                "success": True,
                "message": "cloudflared is already installed",
                "path": existing
            }
        
        download_url = self._get_download_url()
        if not download_url:
            return {
                "success": False,
                "error": f"Unsupported platform: {platform.system()} {platform.machine()}"
            }
        
        self.is_installing = True
        self.install_progress = 0
        
        try:
            print(f"[TunnelService] Downloading cloudflared from {download_url}", file=sys.stderr)
            self.install_progress = 10
            
            # Créer une requête avec un User-Agent
            request = urllib.request.Request(
                download_url,
                headers={'User-Agent': 'HorizonAI/1.0'}
            )
            
            # Télécharger le fichier
            temp_file = self.config_dir / "cloudflared_download.tmp"
            
            with urllib.request.urlopen(request, timeout=120) as response:
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                block_size = 8192
                
                with open(temp_file, 'wb') as f:
                    while True:
                        block = response.read(block_size)
                        if not block:
                            break
                        f.write(block)
                        downloaded += len(block)
                        
                        if total_size > 0:
                            self.install_progress = 10 + int((downloaded / total_size) * 80)
            
            self.install_progress = 90
            print(f"[TunnelService] Download complete, size: {downloaded} bytes", file=sys.stderr)
            expected_sha256 = self._fetch_remote_sha256(download_url)
            if expected_sha256:
                actual_sha256 = self._calculate_sha256(temp_file)
                if actual_sha256.lower() != expected_sha256.lower():
                    try:
                        temp_file.unlink()
                    except FileNotFoundError:
                        pass
                    return {
                        "success": False,
                        "error": "Checksum verification failed for downloaded cloudflared"
                    }
            else:
                print("[TunnelService] Warning: No checksum available; proceeding without verification", file=sys.stderr)
            
            # Si c'est un .tgz (macOS), extraire
            if download_url.endswith('.tgz'):
                import tarfile
                with tarfile.open(temp_file, 'r:gz') as tar:
                    tar.extractall(path=self.config_dir)
                temp_file.unlink()
            else:
                # Renommer directement (Windows/Linux)
                if self.local_cloudflared.exists():
                    self.local_cloudflared.unlink()
                temp_file.rename(self.local_cloudflared)
            
            # Rendre exécutable (Unix)
            if sys.platform != "win32":
                os.chmod(self.local_cloudflared, 0o755)
            
            self.install_progress = 100
            
            # Vérifier l'installation
            result = self.check_cloudflared_installed()
            
            if result.get("installed"):
                print(f"[TunnelService] cloudflared installed successfully at {self.local_cloudflared}", file=sys.stderr)
                return {
                    "success": True,
                    "message": "cloudflared installed successfully",
                    "path": str(self.local_cloudflared),
                    "version": result.get("version")
                }
            else:
                return {
                    "success": False,
                    "error": "Installation completed but cloudflared verification failed"
                }
                
        except urllib.error.URLError as e:
            print(f"[TunnelService] Download error: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": f"Download failed: {str(e)}"
            }
        except Exception as e:
            print(f"[TunnelService] Installation error: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": f"Installation failed: {str(e)}"
            }
        finally:
            self.is_installing = False
            # Nettoyer le fichier temporaire
            temp_file = self.config_dir / "cloudflared_download.tmp"
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except:
                    pass
    
    def get_install_progress(self) -> Dict[str, Any]:
        """Retourne la progression de l'installation"""
        return {
            "installing": self.is_installing,
            "progress": self.install_progress
        }
    
    def check_cloudflared_installed(self) -> Dict[str, Any]:
        """Vérifie si cloudflared est installé"""
        cloudflared_path = self._find_cloudflared()
        
        if cloudflared_path:
            try:
                result = subprocess.run(
                    [cloudflared_path, "version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
                version = result.stdout.strip() or result.stderr.strip()
                return {
                    "installed": True,
                    "path": cloudflared_path,
                    "version": version
                }
            except Exception as e:
                return {
                    "installed": True,
                    "path": cloudflared_path,
                    "version": f"Unknown (error: {e})"
                }
        
        return {
            "installed": False,
            "path": None,
            "version": None,
            "can_auto_install": True,
            "install_instructions": self._get_install_instructions()
        }
    
    def _get_install_instructions(self) -> Dict[str, str]:
        """Instructions d'installation de cloudflared"""
        return {
            "windows": "winget install Cloudflare.cloudflared",
            "windows_manual": "https://github.com/cloudflare/cloudflared/releases",
            "auto_install": "Cliquez sur 'Installer' pour télécharger automatiquement",
            "description": "Cloudflared sera téléchargé et installé automatiquement"
        }
    
    def generate_auth_token(self, expires_hours: int = 24) -> Dict[str, Any]:
        """
        Génère un nouveau token d'authentification sécurisé
        
        Le token est:
        - Généré avec secrets.token_urlsafe (cryptographiquement sûr)
        - Haché avec SHA-256 avant stockage (on ne stocke jamais le token en clair)
        - Valide pour une durée limitée
        """
        # Générer un token sécurisé
        raw_token = secrets.token_urlsafe(32)  # 256 bits d'entropie
        
        # Hasher le token pour le stockage
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Mettre à jour la configuration
        self.config.auth_token = token_hash
        self.config.token_created_at = datetime.utcnow().isoformat()
        self.config.token_expires_hours = expires_hours
        self._save_config()
        
        return {
            "token": raw_token,  # Retourné une seule fois à l'utilisateur
            "expires_at": (datetime.utcnow() + timedelta(hours=expires_hours)).isoformat(),
            "expires_hours": expires_hours
        }
    
    def validate_custom_token(self, token: str) -> Dict[str, Any]:
        """
        Valide un token personnalisé

        Retourne:
        - valid: bool
        - error: str (si invalide)
        - suggestion: str (optionnel)
        """
        if not token:
            return {
                "valid": False,
                "error": "Token is required"
            }

        if len(token) < 8:
            return {
                "valid": False,
                "error": "Token must be at least 8 characters"
            }

        if len(token) > 32:
            return {
                "valid": False,
                "error": "Token must be less than 32 characters"
            }

        # Vérifier la complexité minimale
        has_upper = any(c.isupper() for c in token)
        has_lower = any(c.islower() for c in token)
        has_digit = any(c.isdigit() for c in token)

        if not (has_upper and has_lower and has_digit):
            return {
                "valid": False,
                "error": "Token must contain uppercase, lowercase, and digits",
                "suggestion": "Try adding numbers and mixed case"
            }

        return {
            "valid": True,
            "strength": "good" if len(token) >= 12 else "medium"
        }

    def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Valide un token d'authentification

        V2: Déchiffre le token stocké si nécessaire avant comparaison

        Retourne:
        - valid: bool
        - reason: str (si invalide)
        """
        if not token or not self.config.auth_token:
            return {"valid": False, "reason": "No token configured"}

        # Récupérer le token hash stocké (déchiffrer si nécessaire)
        stored_token_hash = self.config.auth_token
        
        # Si le token est chiffré (commence par "ENC:"), le déchiffrer
        if stored_token_hash.startswith("ENC:"):
            if not crypto_service:
                return {"valid": False, "reason": "Token encrypted but CryptoService not available"}
            
            try:
                if not crypto_service._master_key:
                    return {"valid": False, "reason": "Token encrypted but master key not configured"}
                
                # Déchiffrer le token hash stocké
                encrypted_data = stored_token_hash[4:]  # Enlever le préfixe "ENC:"
                stored_token_hash = crypto_service.decrypt_string(
                    encrypted_data,
                    associated_data="tunnel_auth_token"
                )
            except Exception as e:
                print(f"[TunnelService] Error decrypting token during validation: {e}", file=sys.stderr)
                return {"valid": False, "reason": "Token decryption failed"}

        # Hasher le token fourni par l'utilisateur
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Vérifier la correspondance
        if token_hash != stored_token_hash:
            return {"valid": False, "reason": "Invalid token"}

        # Vérifier l'expiration
        if self.config.token_created_at:
            try:
                created_at = datetime.fromisoformat(self.config.token_created_at)
                expires_at = created_at + timedelta(hours=self.config.token_expires_hours)

                if datetime.utcnow() > expires_at:
                    return {"valid": False, "reason": "Token expired"}

            except Exception:
                pass  # Si erreur de parsing, on accepte le token

        return {"valid": True}
    def set_custom_token(self, token: str) -> Dict[str, Any]:
        """
        Définit un token personnalisé

        Retourne:
        - success: bool
        - token: str (le token clair, retourné une seule fois)
        - error: str (si erreur)
        - suggestion: str (optionnel)
        """
        validation = self.validate_custom_token(token)
        if not validation.get('valid'):
            return {
                "success": False,
                "error": validation.get('error'),
                "suggestion": validation.get('suggestion')
            }

        # Hasher le token personnalisé (comme les tokens automatiques)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Mettre à jour la configuration
        self.config.auth_token = token_hash
        self.config.token_created_at = datetime.utcnow().isoformat()
        self._save_config()

        return {
            "success": True,
            "token": token,  # Retourner le token clair une seule fois
            "strength": validation.get('strength')
        }
    def get_qr_data_with_token(self, token: str) -> Dict[str, Any]:
        """
        Retourne les données pour générer un QR code avec token intégré

        Le QR code contient l'URL + token pour un accès direct
        """
        if not self.tunnel_url:
            return {
                "success": False,
                "error": "No tunnel URL available"
            }

        # Créer une URL avec le token intégré
        qr_url = f"{self.tunnel_url}?token={token}"

        qr_data = {
            "url": qr_url,
            "app": "Horizon AI",
            "version": "1.0",
            "direct_access": True
        }

        return {
            "success": True,
            "qr_content": json.dumps(qr_data),
            "url": qr_url,
            "instructions": "Scan this QR code for direct access"
        }
    
    def check_ip_allowed(self, client_ip: str) -> bool:
        """Vérifie si une IP est autorisée"""
        # Si la liste est vide, toutes les IP sont autorisées
        if not self.config.allowed_ips:
            return True
        
        # Toujours autoriser localhost
        if client_ip in ['127.0.0.1', '::1', 'localhost']:
            return True
        
        return client_ip in self.config.allowed_ips
    
    def add_allowed_ip(self, ip: str) -> Dict[str, Any]:
        """Ajoute une IP à la liste blanche"""
        if ip not in self.config.allowed_ips:
            self.config.allowed_ips.append(ip)
            self._save_config()
        
        return {"success": True, "allowed_ips": self.config.allowed_ips}
    
    def remove_allowed_ip(self, ip: str) -> Dict[str, Any]:
        """
        Retire une IP de la liste blanche
        
        V2.1 : Utilisé pour révocation rapide de sessions
        """
        if ip in self.config.allowed_ips:
            self.config.allowed_ips.remove(ip)
            self._save_config()
            
            # Logger la révocation (si audit_service disponible)
            if AUDIT_AVAILABLE and audit_service and ActionType:
                try:
                    audit_service.log_action(
                        ActionType.REMOTE_ACCESS_REVOKED,
                        {
                            "ip": ip,
                            "revoked_at": datetime.utcnow().isoformat(),
                            "reason": "IP removed from allowlist (session revocation)",
                            "user_action": "immediate_revocation"
                        }
                    )
                except Exception as e:
                    print(f"[TunnelService] Error logging revocation: {e}", file=sys.stderr)
        
        return {"success": True, "allowed_ips": self.config.allowed_ips}
    
    def start_tunnel(self, http_port: int = 8765) -> Dict[str, Any]:
        """
        Démarre le tunnel Cloudflare (Quick Tunnel - pas besoin de compte)
        
        Note: Quick Tunnel génère une URL temporaire sans authentification Cloudflare.
        Pour une utilisation en production, utilisez un tunnel nommé avec authentification.
        """
        if self.is_running:
            return {
                "success": False,
                "error": "Tunnel already running",
                "url": self.tunnel_url
            }
        
        cloudflared_path = self._find_cloudflared()
        if not cloudflared_path:
            return {
                "success": False,
                "error": "cloudflared not installed",
                "can_auto_install": True,
                "install_instructions": self._get_install_instructions()
            }
        
        try:
            self.config.http_port = http_port
            self._save_config()
            
            # Démarrer cloudflared en mode Quick Tunnel
            # Le tunnel pointe vers notre serveur HTTP local
            cmd = [
                cloudflared_path,
                "tunnel",
                "--url", f"http://localhost:{http_port}",
                "--no-autoupdate"
            ]
            
            # Créer le processus
            self.tunnel_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            
            # Lire l'output pour récupérer l'URL
            self._stop_event.clear()
            
            def read_output():
                """Thread pour lire la sortie et extraire l'URL"""
                try:
                    for line in self.tunnel_process.stdout:
                        line = line.strip()
                        print(f"[Cloudflared] {line}", file=sys.stderr)
                        
                        # Chercher l'URL du tunnel
                        if "trycloudflare.com" in line or ".cloudflare.dev" in line:
                            import re
                            url_match = re.search(r'https://[^\s]+', line)
                            if url_match:
                                self.tunnel_url = url_match.group(0)
                                self.config.tunnel_url = self.tunnel_url
                                self._save_config()
                                print(f"[TunnelService] URL détectée: {self.tunnel_url}", file=sys.stderr)
                        
                        if self._stop_event.is_set():
                            break
                            
                except Exception as e:
                    print(f"[TunnelService] Erreur lecture output: {e}", file=sys.stderr)
            
            self._monitor_thread = threading.Thread(target=read_output, daemon=True)
            self._monitor_thread.start()
            
            # Attendre un peu pour que l'URL soit disponible
            time.sleep(3)
            
            self.is_running = True
            self.config.enabled = True
            self._save_config()
            
            return {
                "success": True,
                "url": self.tunnel_url or "Initialisation en cours...",
                "http_port": http_port,
                "message": "Tunnel started successfully"
            }
            
        except Exception as e:
            self.is_running = False
            return {
                "success": False,
                "error": str(e)
            }
    
    def stop_tunnel(self) -> Dict[str, Any]:
        """Arrête le tunnel Cloudflare"""
        self._stop_event.set()
        
        if self.tunnel_process:
            try:
                self.tunnel_process.terminate()
                self.tunnel_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.tunnel_process.kill()
            except Exception as e:
                print(f"[TunnelService] Erreur arrêt tunnel: {e}", file=sys.stderr)
            
            self.tunnel_process = None
        
        self.is_running = False
        self.tunnel_url = ""
        self.config.enabled = False
        self.config.tunnel_url = ""
        self._save_config()
        
        return {
            "success": True,
            "message": "Tunnel stopped"
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Retourne le statut actuel du tunnel"""
        cloudflared_check = self.check_cloudflared_installed()
        
        return {
            "tunnel_running": self.is_running,
            "tunnel_url": self.tunnel_url,
            "cloudflared_installed": cloudflared_check.get("installed", False),
            "cloudflared_version": cloudflared_check.get("version"),
            "cloudflared_path": cloudflared_check.get("path"),
            "can_auto_install": cloudflared_check.get("can_auto_install", True),
            "http_port": self.config.http_port,
            "token_configured": bool(self.config.auth_token),
            "allowed_ips": self.config.allowed_ips,
            "rate_limit": {
                "max_requests": self.config.rate_limit_requests,
                "window_seconds": self.config.rate_limit_window
            },
            "installing": self.is_installing,
            "install_progress": self.install_progress
        }
    
    def get_qr_data(self) -> Dict[str, Any]:
        """
        Retourne les données pour générer un QR code d'accès
        
        Le QR code contient l'URL + instructions pour entrer le token
        """
        if not self.tunnel_url:
            return {
                "success": False,
                "error": "No tunnel URL available"
            }
        
        # On ne met PAS le token dans le QR code pour des raisons de sécurité
        # L'utilisateur doit entrer le token manuellement sur son appareil
        qr_data = {
            "url": self.tunnel_url,
            "app": "Horizon AI",
            "version": "1.0"
        }
        
        return {
            "success": True,
            "qr_content": json.dumps(qr_data),
            "url": self.tunnel_url,
            "instructions": "Scannez ce QR code puis entrez votre token d'accès"
        }
    
    def cleanup(self):
        """Nettoyage à la fermeture de l'application"""
        self.stop_tunnel()


# Singleton
tunnel_service = TunnelService()
