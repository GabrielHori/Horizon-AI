import sys
import os
import threading
import time
import json
from pathlib import Path

# Fix imports
current_file = Path(__file__).resolve()
worker_dir = current_file.parent
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

if sys.platform == "win32":
    if sys.stdin:
        sys.stdin.reconfigure(encoding="utf-8")
    if sys.stdout:
        sys.stdout.reconfigure(encoding="utf-8")

try:
    from ipc.handler import IpcHandler
    from ipc.dispatcher import CommandDispatcher
except ImportError as e:
    print(f"ERREUR D'IMPORT DANS MAIN : {e}", file=sys.stderr)
    sys.exit(1)


def start_ollama_background():
    import subprocess
    try:
        subprocess.Popen(
            ["ollama", "serve"],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as e:
        print(f"Impossible de démarrer Ollama: {e}", file=sys.stderr)


class Worker:
    def __init__(self):
        self.ipc = IpcHandler(sys.stdin, sys.stdout)

        # ✅ ON PASSE IPC AU DISPATCHER
        self.dispatcher = CommandDispatcher(ipc=self.ipc)

        self.running = True

    def _monitor_loop(self):
        """Envoie les stats système toutes les 2s"""
        while self.running:
            try:
                if self.dispatcher and hasattr(self.dispatcher, 'dispatch'):
                    stats = self.dispatcher.dispatch("get_system_stats", {})
                    self.ipc.send_response("SYSTEM_STATS", "ok", data=stats)
                else:
                    print(
                        "[MONITOR WARN] Dispatcher non initialisé ou méthode 'dispatch' manquante.",
                        file=sys.stderr
                    )
            except Exception as e:
                print(f"[MONITOR ERROR] Échec de récupération des stats : {e}", file=sys.stderr)

            time.sleep(2)

    def _handle_stream(self, req_id, generator):
        """Émet un stream d'événements IPC"""
        try:
            for event in generator:
                event["id"] = req_id
                self.ipc.send_raw(event)
        except Exception as e:
            error_event = {
                "id": req_id,
                "error": str(e),
                "done": True
            }
            try:
                self.ipc.send_raw(error_event)
            except:
                pass

    def run(self):
        print("🚀 HorizonAI Worker started", file=sys.stderr)

        threading.Thread(
            target=start_ollama_background,
            daemon=True
        ).start()

        threading.Thread(
            target=self._monitor_loop,
            daemon=True
        ).start()

        try:
            for request in self.ipc.read_requests():
                req_id = request.get("id")
                cmd = request.get("cmd")
                payload = request.get("payload", {})

                if not req_id or not cmd:
                    continue

                try:
                    result = self.dispatcher.dispatch(cmd, payload)

                    # 🔥 STREAM
                    if hasattr(result, "__iter__") and not isinstance(result, (dict, list)):
                        threading.Thread(
                            target=self._handle_stream,
                            args=(req_id, result),
                            daemon=True
                        ).start()

                        self.ipc.send_response(
                            req_id,
                            "ok",
                            data={"status": "streaming_started"}
                        )

                    else:
                        self.ipc.send_response(req_id, "ok", data=result)

                except Exception as e:
                    self.ipc.send_error(req_id, "CMD_ERR", str(e))

        except EOFError:
            pass
        finally:
            self.running = False


if __name__ == "__main__":
    Worker().run()
