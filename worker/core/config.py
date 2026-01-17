import json
import os
from pathlib import Path
from typing import Dict, Any

# Définition des chemins
current_file = Path(__file__).resolve()
# G:\Desktop IA - Rust (Tauri) Python Worker\worker\core -> worker
worker_dir = current_file.parent.parent
# Racine du projet
root_dir = worker_dir.parent

# Chemin du fichier de configuration utilisateur
CONFIG_FILE = root_dir / "user_settings.json"

DEFAULT_SETTINGS = {
    "language": "en",
    "theme": "dark",
    "last_model": "llama3",
    "internet_access": False,
    "notifications": True
}

def load_user_settings() -> Dict[str, Any]:
    """Charge les paramètres depuis le fichier JSON"""
    if not CONFIG_FILE.exists():
        return DEFAULT_SETTINGS
    
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            user_data = json.load(f)
            # On fusionne avec les défauts pour garantir que toutes les clés existent
            return {**DEFAULT_SETTINGS, **user_data}
    except Exception:
        return DEFAULT_SETTINGS

def save_user_settings(settings: Dict[str, Any]) -> bool:
    """Sauvegarde les paramètres dans le fichier JSON"""
    try:
        # On récupère les réglages actuels pour ne pas tout écraser
        current = load_user_settings()
        current.update(settings)
        
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Erreur sauvegarde config: {e}")
        return False
