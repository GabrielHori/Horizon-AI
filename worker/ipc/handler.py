import json
import sys
import threading  # <--- AJOUT IMPORTANT

class IpcHandler:
    def __init__(self, stdin=None, stdout=None):
        # Utilise sys.stdin/stdout par défaut si rien n'est fourni
        self.stdin = stdin or sys.stdin
        self.stdout = stdout or sys.stdout
        self.lock = threading.Lock()  # <--- AJOUT IMPORTANT : Verrou pour éviter que les messages se mélangent

    def read_requests(self):
        """Lit les requêtes JSON envoyées par Rust sur stdin."""
        if self.stdin is None:
            print("DEBUG: Stdin est None, arrêt du lecteur.", file=sys.stderr)
            return

        try:
            for line in self.stdin:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    print(f"DEBUG: JSON invalide reçu: {line}", file=sys.stderr)
        except EOFError:
            pass
        
    def send_response(self, req_id, status, data=None):
        """Envoie une réponse structurée pour une commande synchrone."""
        response = {
            "id": req_id,
            "status": "ok" if status == "ok" else "error",
            "data": data
        }
        self.send_raw(response)

    def send_error(self, req_id, code, message):
        """Envoie une erreur structurée au frontend."""
        response = {
            "id": req_id,
            "status": "error",
            "error": {"code": code, "message": message}
        }
        self.send_raw(response)

    def send_raw(self, obj: dict):
        """Sérialise et envoie n'importe quel dictionnaire en JSON sur une seule ligne."""
        try:
            output = json.dumps(obj)
            # On utilise le lock pour s'assurer qu'aucun autre thread n'écrive en même temps
            with self.lock: 
                print(output, file=self.stdout, flush=True)
        except Exception as e:
            print(f"Erreur sérialisation: {e}", file=sys.stderr)
