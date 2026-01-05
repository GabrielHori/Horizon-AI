import subprocess
import re
from typing import Generator
from services.monitoring_service import monitoring_service # ✅ Import pour les logs

# Regex pour supprimer les codes ANSI et les spinners
ANSI_ESCAPE = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])|\[[\d;]*[A-Za-z]|\x1b\[[^\x1b]*')
SPINNER_CHARS = set('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏')

def clean_line(line: str) -> str:
    """Nettoie les codes ANSI et les caractères de spinner"""
    # Supprimer les codes d'échappement ANSI
    cleaned = ANSI_ESCAPE.sub('', line)
    # Supprimer les caractères de spinner
    cleaned = ''.join(c for c in cleaned if c not in SPINNER_CHARS)
    # Supprimer les séquences courantes de terminal
    cleaned = cleaned.replace('[K', '').replace('[?25h', '').replace('[?25l', '')
    cleaned = cleaned.replace('[?2026l', '').replace('[?2026h', '').replace('[1G', '')
    cleaned = cleaned.replace('[A', '')
    return cleaned.strip()

class OllamaService:
    def __init__(self, base_url="http://127.0.0.1:11434"):
        self.base_url = base_url

    def pull_model_stream(self, model: str) -> Generator[dict, None, None]:
        monitoring_service.add_log(f"OLLAMA: Starting subprocess for {model}")
        
        process = subprocess.Popen(
            ["ollama", "pull", model],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="ignore",
            bufsize=1 # Line buffered
        )

        try:
            for line in process.stdout:
                # Nettoyer les codes ANSI et spinners
                line = clean_line(line)
                if not line: continue
                
                # Ignorer les lignes de spinner/animation
                if line in ['pulling manifest', 'verifying sha256 digest', '']:
                    continue

                # On envoie la ligne nettoyée dans les logs système pour la Console.jsx
                if "%" not in line:
                    monitoring_service.add_log(f"OLLAMA: {line}")

                # Extraire le pourcentage de progression
                percent = None
                if "%" in line:
                    try:
                        # Chercher un nombre suivi de %
                        match = re.search(r'(\d+)%', line)
                        if match:
                            percent = int(match.group(1))
                    except: pass

                yield {
                    "event": "progress",
                    "model": model,
                    "message": line,
                    "progress": percent
                }
            
            # ✅ Envoyer l'événement "done" AVANT de fermer le processus
            monitoring_service.add_log(f"SUCCESS: Model {model} pulled successfully.")
            yield {"event": "done", "model": model}
            
        finally:
            # ✅ CRITIQUE: Toujours fermer et attendre le processus pour éviter les zombies
            if process.stdout:
                process.stdout.close()
            process.wait()

    def delete_model(self, name: str) -> dict:
        """Supprime un modèle Ollama"""
        try:
            import ollama
            ollama.delete(name)
            monitoring_service.add_log(f"SUCCESS: Model {name} deleted.")
            return {"status": "success", "message": f"Model {name} deleted"}
        except Exception as e:
            monitoring_service.add_log(f"ERROR: Failed to delete {name}: {str(e)}")
            return {"status": "error", "message": str(e)}

ollama_service = OllamaService()
