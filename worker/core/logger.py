import logging
import sys
from pathlib import Path

# Dossier pour les logs à la racine du projet
current_file = Path(__file__).resolve()
LOG_DIR = current_file.parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "worker.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stderr) # Important pour voir les logs dans la console Rust
    ]
)

logger = logging.getLogger("HorizonAI")