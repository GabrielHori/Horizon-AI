import json
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Dict, Optional, Any

from services.monitoring_service import monitoring_service

SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0


class AirLLMManager:
    """
    Manages the AirLLM sidecar process and provides a generate API.
    Only one sidecar instance is maintained at a time.
    """

    def __init__(self):
        self.status = "OFF"
        self.model_id: Optional[str] = None
        self.process: Optional[subprocess.Popen] = None
        self.reader_thread: Optional[threading.Thread] = None
        self.ready_event = threading.Event()
        self.status_lock = threading.Lock()
        self.pending: Dict[str, Dict[str, Any]] = {}
        self.pending_lock = threading.Lock()
        self.gen_lock = threading.Lock()  # Serialise generations (UI spam safe)
        self.last_error: Optional[str] = None
        self.loading_started_at: Optional[float] = None
        self.ready_since: Optional[float] = None
        self.load_timeout_seconds = 600  # 10 minutes
        self.generation_timeout_seconds = 180
        self.curated_models = [
            {
                "id": "meta-llama/Llama-2-7b-chat-hf",
                "label": "Llama-2-7B-Chat (HF)",
                "provider": "airllm",
            },
            {
                "id": "mistralai/Mistral-7B-Instruct-v0.2",
                "label": "Mistral-7B-Instruct v0.2",
                "provider": "airllm",
            },
            {
                "id": "Qwen/Qwen2.5-7B-Instruct",
                "label": "Qwen2.5-7B-Instruct",
                "provider": "airllm",
            },
        ]

    # ------------------------------
    # Internal helpers
    # ------------------------------
    def _sidecar_path(self) -> Path:
        return Path(__file__).resolve().parent / "airllm_sidecar.py"

    def _reset_state(self, new_status: str = "OFF"):
        self.status = new_status
        self.ready_event.clear()
        self.last_error = None

    def _start_reader(self):
        def _reader():
            try:
                if not self.process or not self.process.stdout:
                    return
                for line in self.process.stdout:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        payload = json.loads(line)
                    except Exception:
                        monitoring_service.add_log(f"AIRLLM: Unparseable output: {line}")
                        continue
                    self._handle_message(payload)
            except Exception as exc:
                monitoring_service.add_log(f"AIRLLM reader error: {exc}")
            finally:
                self._handle_process_exit()

        self.reader_thread = threading.Thread(target=_reader, daemon=True)
        self.reader_thread.start()

    def _handle_message(self, payload: Dict[str, Any]):
        if payload.get("type") == "status":
            status = payload.get("status", "").upper()
            with self.status_lock:
                self.status = status
                if status == "READY":
                    self.ready_since = time.time()
                    self.ready_event.set()
                    monitoring_service.add_log(
                        f"AIRLLM: Model ready ({payload.get('model')})"
                    )
                elif status == "ERROR":
                    self.last_error = payload.get("error")
                    self.ready_event.set()
                    monitoring_service.add_log(
                        f"AIRLLM ERROR: {self.last_error or 'unknown'}"
                    )
        elif "id" in payload:
            req_id = payload["id"]
            with self.pending_lock:
                pending = self.pending.get(req_id)
            if pending:
                pending["response"] = payload
                pending["event"].set()

    def _handle_process_exit(self):
        with self.status_lock:
            # Already turned off via disable()
            if self.status == "OFF":
                return
            if self.status != "READY":
                self.last_error = self.last_error or "AirLLM process exited"
            self.status = "ERROR" if self.last_error else "OFF"
            self.ready_event.set()
        # Fail all pending requests
        with self.pending_lock:
            for pending in self.pending.values():
                pending["response"] = {
                    "id": pending.get("id"),
                    "ok": False,
                    "error": self.last_error or "AirLLM process exited",
                }
                pending["event"].set()
            self.pending.clear()

    def _watch_load_timeout(self, model_id: str):
        if not self.ready_event.wait(timeout=self.load_timeout_seconds):
            monitoring_service.add_log(
                f"AIRLLM: Load timeout after {self.load_timeout_seconds}s"
            )
            self.last_error = f"Load timeout for {model_id}"
            self.disable()

    def _send(self, payload: Dict[str, Any]) -> bool:
        try:
            if not self.process or not self.process.stdin:
                return False
            line = json.dumps(payload, ensure_ascii=False) + "\n"
            self.process.stdin.write(line)
            self.process.stdin.flush()
            return True
        except Exception as exc:
            self.last_error = str(exc)
            monitoring_service.add_log(f"AIRLLM write failed: {exc}")
            self.disable()
            return False

    # ------------------------------
    # Public API
    # ------------------------------
    def list_models(self):
        return {"models": self.curated_models, "active": self.model_id, "status": self.status}

    def enable(self, model_id: Optional[str] = None):
        model_to_load = model_id or self.model_id or self.curated_models[0]["id"]

        with self.status_lock:
            if self.status == "LOADING":
                return {"success": False, "error": "Already loading", "status": self.status}
            if self.status == "READY" and self.model_id == model_to_load:
                return {"success": True, "status": self.status, "model": self.model_id}

        self.disable()  # Ensure only one instance

        sidecar = self._sidecar_path()
        if not sidecar.exists():
            msg = f"Sidecar script missing: {sidecar}"
            monitoring_service.add_log(f"AIRLLM ERROR: {msg}")
            self.last_error = msg
            self.status = "ERROR"
            return {"success": False, "error": msg}

        cmd = [sys.executable, str(sidecar), "--model", model_to_load]

        try:
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                bufsize=1,
                creationflags=SUBPROCESS_FLAGS,
            )
        except Exception as exc:
            self.last_error = str(exc)
            self.status = "ERROR"
            monitoring_service.add_log(f"AIRLLM start failed: {exc}")
            return {"success": False, "error": str(exc)}

        self._reset_state(new_status="LOADING")
        self.model_id = model_to_load
        self.loading_started_at = time.time()
        self.ready_since = None
        monitoring_service.add_log(f"AIRLLM: Loading model {model_to_load}")

        self._start_reader()
        threading.Thread(
            target=self._watch_load_timeout, args=(model_to_load,), daemon=True
        ).start()

        return {"success": True, "status": self.status, "model": self.model_id, "pid": self.process.pid}

    def reload(self, model_id: Optional[str] = None):
        return self.enable(model_id)

    def disable(self):
        with self.status_lock:
            if self.process:
                try:
                    self.process.terminate()
                except Exception:
                    pass
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None
            self._reset_state(new_status="OFF")
            self.ready_event.set()
            self.loading_started_at = None
            self.ready_since = None
            self.model_id = None
        with self.pending_lock:
            self.pending.clear()
        monitoring_service.add_log("AIRLLM: Sidecar stopped")
        return {"success": True, "status": self.status}

    def get_status(self):
        with self.status_lock:
            return {
                "status": self.status,
                "model": self.model_id,
                "ready_since": self.ready_since,
                "loading_since": self.loading_started_at,
                "error": self.last_error,
                "pid": self.process.pid if self.process else None,
                "inflight": len(self.pending),
            }

    def generate(self, prompt: str, opts: Optional[Dict[str, Any]] = None):
        opts = opts or {}
        with self.status_lock:
            if self.status != "READY":
                return {
                    "ok": False,
                    "error": f"AirLLM not ready (status={self.status})",
                }

        acquired = self.gen_lock.acquire(timeout=1.0)
        if not acquired:
            return {"ok": False, "error": "AirLLM is busy"}

        req_id = str(uuid.uuid4())
        payload = {
            "id": req_id,
            "type": "generate",
            "prompt": prompt,
            "max_tokens": opts.get("max_tokens", 256),
            "temperature": opts.get("temperature", 0.7),
        }

        event = threading.Event()
        with self.pending_lock:
            self.pending[req_id] = {"event": event, "response": None, "id": req_id}

        try:
            if not self._send(payload):
                return {"ok": False, "error": self.last_error or "Send failed"}

            if not event.wait(timeout=self.generation_timeout_seconds):
                with self.pending_lock:
                    self.pending.pop(req_id, None)
                self.last_error = "Generation timeout"
                monitoring_service.add_log("AIRLLM: Generation timeout")
                return {"ok": False, "error": "Generation timeout"}

            with self.pending_lock:
                response = self.pending.pop(req_id, {}).get("response")

            if not response:
                return {"ok": False, "error": "Empty response from AirLLM"}
            return response
        finally:
            self.gen_lock.release()


airllm_manager = AirLLMManager()
