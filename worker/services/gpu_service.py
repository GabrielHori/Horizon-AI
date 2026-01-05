import pynvml as nvml
import sys
from typing import Dict, Any

class GPUService:
    def __init__(self):
        self.available = False
        try:
            nvml.nvmlInit()
            self.available = True
            print("DEBUG: NVML Initialisé avec succès", file=sys.stderr)
        except Exception as e:
            print(f"DEBUG: GPU Nvidia non détecté : {e}", file=sys.stderr)
            self.available = False

    def get_gpu_stats(self) -> Dict[str, Any]:
        if not self.available:
            return {
                "available": False,
                "name": "Générique / Intégré",
                "usage_percent": 0,
                "vram_used": 0,
                "vram_total": 0
            }

        try:
            handle = nvml.nvmlDeviceGetHandleByIndex(0)
            name_raw = nvml.nvmlDeviceGetName(handle)
            name = name_raw.decode("utf-8") if isinstance(name_raw, bytes) else name_raw
            
            utilization = nvml.nvmlDeviceGetUtilizationRates(handle)
            mem_info = nvml.nvmlDeviceGetMemoryInfo(handle)
            
            return {
                "available": True,
                "name": name,
                "usage_percent": utilization.gpu,
                "vram_used": mem_info.used // (1024**2),
                "vram_total": mem_info.total // (1024**2)
            }
        except Exception as e:
            return {"available": False, "name": "Erreur lecture GPU"}

gpu_service = GPUService()