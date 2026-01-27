from __future__ import annotations

import copy
import threading
from typing import Dict, Any

# État licence minimal en mémoire. À remplacer par une synchro Tauri -> worker (snapshot signé).
DEFAULT_STATUS: Dict[str, Any] = {
    "plan": "free",
    "state": "free",
    "entitlements": [],
    "expires_at": None,
    "last_verified_at": None,
    "grace_days": None,
    "device_fingerprint": None,
    "error": None,
}


class LicensingService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._status: Dict[str, Any] = copy.deepcopy(DEFAULT_STATUS)

    def get_status_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._status)

    def update_snapshot(self, snapshot: Dict[str, Any]) -> None:
        if not isinstance(snapshot, dict):
            return
        with self._lock:
            merged = copy.deepcopy(DEFAULT_STATUS)
            merged.update(snapshot)
            self._status = merged

    def mark_error(self, message: str) -> None:
        with self._lock:
            self._status["state"] = "error"
            self._status["error"] = message


licensing_service = LicensingService()
