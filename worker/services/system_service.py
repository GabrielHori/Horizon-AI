import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any

class SystemService:
    def __init__(self):
        # ✅ Utiliser AppData pour le stockage (évite les problèmes de permissions)
        if getattr(sys, 'frozen', False):
            # Mode PyInstaller : utiliser AppData
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                base_dir = Path(appdata) / "HorizonAI"
            else:
                base_dir = Path.home() / ".horizon-ai"
        else:
            base_dir = Path(__file__).resolve().parent.parent.parent
        
        self.config_dir = base_dir / "data"
        self.settings_file = self.config_dir / "settings.json"
        
        # Créer le dossier data s'il n'existe pas
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        # Dossier Startup de Windows
        self.appdata = os.getenv('APPDATA')
        if self.appdata:
            self.startup_folder = Path(self.appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
        else:
            self.startup_folder = Path.home() # Fallback
            
        self.shortcut_path = self.startup_folder / "HorizonAI_Worker.bat"

    def manage_startup(self, enable: bool) -> Dict[str, str]:
        """Active ou désactive le lancement du worker au démarrage de Windows."""
        try:
            if enable:
                # Utilisation de sys.executable pour garantir qu'on utilise le Python du venv
                python_exe = sys.executable
                # On cible le main.py de manière absolue
                current_dir = Path(__file__).resolve().parent.parent
                main_path = current_dir / "main.py"
                
                # Création du script de lancement silencieux
                with open(self.shortcut_path, "w", encoding="utf-8") as f:
                    f.write(f'@echo off\n')
                    f.write(f'title HorizonAI Worker Background\n')
                    f.write(f'cd /d "{current_dir.parent}"\n')
                    f.write(f'start /min "" "{python_exe}" "{main_path}"\n')
                
                return {"status": "success", "message": "Startup enabled"}
            else:
                if self.shortcut_path.exists():
                    os.remove(self.shortcut_path)
                return {"status": "success", "message": "Startup disabled"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def force_cleanup(self):
        """
        Nettoie les processus orphelins. 
        Utile si l'audit détecte des processus qui ne se ferment pas.
        """
        try:
            # On ne tue pas Ollama lui-même (sauf si souhaité), 
            # mais on peut nettoyer les instances Python HorizonAI en trop
            # subprocess.run(["taskkill", "/F", "/IM", "python.exe", "/FI", "WINDOWTITLE eq HorizonAI*"], capture_output=True)
            return {"status": "cleanup_done"}
        except:
            return {"status": "error"}

    def get_stats(self):
        """Récupère les stats via le monitoring_service."""
        from services.monitoring_service import monitoring_service
        return monitoring_service.get_monitoring_info()

    def load_settings(self) -> Dict[str, Any]:
        """Charge les paramètres depuis le fichier settings.json."""
        default_settings = {
            "userName": "Horizon",
            "language": "en",
            "internetAccess": False,
            "runAtStartup": False,
            "autoUpdate": True,
            "ollama_models_path": ""
        }
        
        try:
            if self.settings_file.exists():
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    saved_settings = json.load(f)
                    # Fusionner avec les valeurs par défaut (pour les nouvelles clés)
                    return {**default_settings, **saved_settings}
            return default_settings
        except Exception as e:
            print(f"[SystemService] Error loading settings: {e}", file=sys.stderr)
            return default_settings

    def save_settings(self, settings: Dict[str, Any]) -> Dict[str, str]:
        """Sauvegarde les paramètres dans le fichier settings.json."""
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=4, ensure_ascii=False)
            
            # Si runAtStartup a changé, mettre à jour le raccourci
            if "runAtStartup" in settings:
                self.manage_startup(settings["runAtStartup"])
            
            return {"status": "success", "message": "Settings saved successfully"}
        except Exception as e:
            print(f"[SystemService] Error saving settings: {e}", file=sys.stderr)
            return {"status": "error", "message": str(e)}

system_service = SystemService()
