import psutil
import shutil
import os
import datetime
from typing import Dict, Any
from services.gpu_service import gpu_service

class MonitoringService:
    def __init__(self):
        # Initialisation avec un log de bienvenue
        self.logs = [f"INFO: HorizonAI Core System started at {datetime.datetime.now().strftime('%H:%M:%S')}"]

    def add_log(self, message: str):
        """Ajoute un log avec horodatage."""
        # Ignorer les logs répétitifs de spinner/progression
        if any(skip in message for skip in ['verifying sha256', 'pulling manifest', '⠋', '⠙', '⠹']):
            return
        
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        
        # Éviter les doublons consécutifs
        if self.logs and self.logs[-1] == log_entry:
            return
            
        self.logs.append(log_entry)
        # On garde les 100 derniers logs pour ne pas saturer la mémoire
        if len(self.logs) > 100:
            self.logs.pop(0)

    def get_monitoring_info(self) -> Dict[str, Any]:
        cpu_usage = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        
        try:
            disk = shutil.disk_usage(os.getenv('SystemDrive', 'C:'))
            disk_percent = round((disk.used / disk.total) * 100, 1)
        except:
            disk_percent = 0

        gpu_stats = gpu_service.get_gpu_stats()

        return {
            "cpu": { "usage_percent": cpu_usage },
            "ram": { "usage_percent": mem.percent },
            "gpu": gpu_stats,
            "vramUsed": gpu_stats["vram_used"],
            "vramTotal": gpu_stats["vram_total"],
            "disk": { "usage_percent": disk_percent },
            "cores": psutil.cpu_count(logical=False),
            "threads": psutil.cpu_count(logical=True),
            "logs": self.logs  # ✅ IMPORTANT: Ta Console.jsx attend cette clé !
        }

monitoring_service = MonitoringService()
