"""
Path Validator Service pour Horizon AI V2
==========================================
Valide les chemins fournis par l'utilisateur pour prévenir:
- Path traversal (../../etc)
- Accès aux dossiers système sensibles
- Accès sans permissions
- Liens symboliques malveillants

SÉCURITÉ CRITIQUE - Ne pas modifier sans review
"""

from pathlib import Path
import os
import sys
from typing import Tuple


class PathValidator:
    """
    Validateur de chemins pour prévenir path traversal et accès non autorisés
    
    Usage:
        validator = PathValidator()
        is_safe, error = validator.is_safe_repo_path("/path/to/repo")
        if not is_safe:
            return {"error": error}
    """
    
    def __init__(self):
        # Chemins système interdits (détectés automatiquement selon OS)
        self.forbidden_paths = self._get_forbidden_paths()
        
        # Extensions de fichiers interdites pour analyse
        self.forbidden_extensions = {
            '.exe', '.dll', '.so', '.dylib',  # Exécutables
            '.sys', '.drv',  # Drivers système
        }
    
    def _get_forbidden_paths(self) -> list[Path]:
        """Retourne les chemins système interdits selon l'OS"""
        forbidden = []
        
        if sys.platform == "win32":
            # Windows - Chemins système critiques
            system_root = os.environ.get("SYSTEMROOT", "C:\\Windows")
            forbidden.extend([
                Path(system_root),
                Path("C:\\Windows"),
                Path("C:\\Program Files"),
                Path("C:\\Program Files (x86)"),
                Path("C:\\ProgramData"),
            ])
            
            # AppData système (pas utilisateur)
            # Note: AppData utilisateur est OK pour projets perso
            system_appdata = os.environ.get("ALLUSERSPROFILE")
            if system_appdata:
                forbidden.append(Path(system_appdata))
                
        else:
            # Unix-like (Linux/Mac) - Chemins système critiques
            forbidden.extend([
                Path("/etc"),
                Path("/sys"),
                Path("/proc"),
                Path("/dev"),
                Path("/bin"),
                Path("/sbin"),
                Path("/usr/bin"),
                Path("/usr/sbin"),
                Path("/boot"),
                Path("/root"),
                Path("/var/log"),
            ])
        
        return forbidden
    
    def is_safe_repo_path(self, path_str: str) -> Tuple[bool, str]:
        """
        Valide qu'un chemin est safe pour analyse repository
        
        Args:
            path_str: Chemin fourni par l'utilisateur
            
        Returns:
            (is_safe, error_message)
            
        Exemples:
            >>> validator.is_safe_repo_path("C:/Users/Me/Projects/myapp")
            (True, "")
            
            >>> validator.is_safe_repo_path("../../../../../../Windows")
            (False, "Access to system directory Windows is forbidden")
        """
        try:
            # 1. Vérifier que le chemin n'est pas vide
            if not path_str or not path_str.strip():
                return False, "Path cannot be empty"
            
            # 2. Résoudre le chemin absolu (neutralise .. et symlinks)
            # resolve() suit les liens symboliques et résout les chemins relatifs
            try:
                path = Path(path_str).resolve(strict=False)
            except (OSError, ValueError) as e:
                return False, f"Invalid path format: {str(e)}"
            
            # 3. Vérifier existence
            if not path.exists():
                return False, "Path does not exist"
            
            # 4. Vérifier que c'est un dossier
            if not path.is_dir():
                return False, "Path must be a directory"
            
            # 5. Vérifier chemins système interdits
            for forbidden in self.forbidden_paths:
                try:
                    # Si path est sous-dossier de forbidden → interdit
                    # relative_to() lève ValueError si path n'est pas sous forbidden
                    path.relative_to(forbidden)
                    return False, f"Access to system directory '{forbidden.name}' is forbidden for security reasons"
                except ValueError:
                    # path n'est pas dans forbidden, continuer
                    pass
            
            # 6. Vérifier permissions lecture
            if not os.access(path, os.R_OK):
                return False, "No read permission on this directory"
            
            # 7. Vérifier que le dossier n'est pas vide (évite erreurs analyse)
            try:
                # Tenter de lister au moins 1 fichier
                next(path.iterdir())
            except StopIteration:
                return False, "Directory is empty"
            except PermissionError:
                return False, "Permission denied to list directory contents"
            
            # 8. Vérifier la profondeur (sécurité contre analyse massive)
            # Limite à 20 niveaux de profondeur max
            try:
                parts = path.parts
                if len(parts) > 20:
                    return False, "Path too deep (max 20 levels)"
            except Exception:
                pass  # Optionnel, ne pas bloquer sur cette vérification
            
            # ✅ Toutes les validations passées
            return True, ""
            
        except Exception as e:
            # Catch-all pour erreurs inattendues
            print(f"[PathValidator ERROR] Unexpected error validating path: {e}", file=sys.stderr)
            return False, f"Path validation failed: {str(e)}"
    
    def get_safe_display_path(self, path_str: str, max_length: int = 60) -> str:
        """
        Retourne une version safe du chemin pour affichage (tronque si trop long)
        
        Args:
            path_str: Chemin à afficher
            max_length: Longueur maximale
            
        Returns:
            Chemin tronqué pour affichage
        """
        if len(path_str) <= max_length:
            return path_str
        
        # Tronquer au milieu pour garder début et fin
        half = (max_length - 3) // 2
        return f"{path_str[:half]}...{path_str[-half:]}"


# Singleton global (pattern standard des services)
path_validator = PathValidator()
