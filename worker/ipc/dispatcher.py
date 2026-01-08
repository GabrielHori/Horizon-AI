import sys
import os
import json
import ollama

# Importation des services
try:
    from services.monitoring_service import monitoring_service
    from services.ollama_service import ollama_service
    from services.chat_history_service import chat_history_service
    from services.system_service import system_service
    from services.tunnel_service import tunnel_service
    from services.http_server import RemoteAccessServer
except ImportError as e:
    print(f"[Dispatcher Error] Services import failed: {e}", file=sys.stderr)

class CommandDispatcher:
    def __init__(self, ipc=None):
        self.ipc = ipc
        self.remote_server = None  # Serveur HTTP pour accès distant

    def dispatch(self, cmd, payload):
        # --- HEALTH CHECK ---
        if cmd == "health_check":
            return {"status": "healthy"}
        
        # --- SHUTDOWN (fermeture propre) ---
        if cmd == "shutdown":
            import sys
            print("🛑 Worker shutdown requested", file=sys.stderr)
            return {"status": "shutdown_acknowledged"}
        
        # --- SYSTÈME & MONITORING ---
        if cmd in ["get_system_stats", "get_monitoring"]:
            return monitoring_service.get_monitoring_info()
        
        if cmd == "set_startup":
            return system_service.manage_startup(payload.get("enable", False))

        # --- GESTION DES PARAMÈTRES (Settings) ---
        if cmd == "load_settings":
            return system_service.load_settings()

        if cmd == "save_settings":
            return system_service.save_settings(payload)

        # --- GESTION DES MODÈLES OLLAMA ---
        if cmd == "pull":
            model_name = payload.get("model")
            monitoring_service.add_log(f"INITIATING: Pulling model '{model_name}'...")
            return ollama_service.pull_model_stream(model_name)

        if cmd == "get_models":
            try:
                result = ollama.list()
                # ollama.list() peut retourner différents formats selon la version
                models = []
                if isinstance(result, dict):
                    models = result.get('models', [])
                elif hasattr(result, 'models'):
                    # Convertir les objets en dict si nécessaire
                    raw_models = result.models if result.models else []
                    for m in raw_models:
                        if hasattr(m, 'model'):
                            models.append({
                                "name": m.model if hasattr(m, 'model') else str(m),
                                "size": m.size if hasattr(m, 'size') else 0
                            })
                        elif hasattr(m, 'name'):
                            models.append({
                                "name": m.name,
                                "size": m.size if hasattr(m, 'size') else 0
                            })
                        elif isinstance(m, dict):
                            models.append(m)
                        else:
                            models.append({"name": str(m), "size": 0})
                return models  # Retourner directement la liste pour compatibilité frontend
            except Exception as e:
                monitoring_service.add_log(f"ERROR: get_models failed: {str(e)}")
                # Fallback avec subprocess
                try:
                    import subprocess
                    result = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')[1:]  # Skip header
                        models = []
                        for line in lines:
                            parts = line.split()
                            if parts:
                                models.append({"name": parts[0], "size": 0})
                        return models
                except:
                    pass
                return []

        if cmd == "delete_model":
            return ollama_service.delete_model(payload.get("name"))

        # --- CHAT & HISTORIQUE (REQUIS POUR AIChatPanel.jsx) ---
        if cmd == "list_conversations":
            # Renvoie directement la liste pour match avec AIChatPanel
            return chat_history_service.list_conversations()

        if cmd == "get_conversation_messages":
            chat_id = payload.get("chat_id")
            return chat_history_service.get_messages(chat_id)

        if cmd == "delete_conversation":
            chat_id = payload.get("chat_id")
            return chat_history_service.delete_conversation(chat_id)

        if cmd == "chat":
            model = payload.get("model")
            prompt = payload.get("prompt")
            chat_id = payload.get("chat_id") # Peut être None
            language = payload.get("language", "en")  # Langue de l'interface

            # 1. Sauvegarder le message utilisateur et récupérer/créer l'ID
            # On passe aussi le modèle pour l'associer à la conversation
            active_chat_id = chat_history_service.save_message(chat_id, "user", prompt, model=model)

            # 2. Définir le générateur pour le streaming
            def chat_stream():
                full_response = ""
                try:
                    # Récupérer tous les messages précédents pour le contexte
                    previous_messages = chat_history_service.get_messages(active_chat_id)
                    
                    # System prompt pour définir la langue de réponse
                    system_prompts = {
                        "fr": "Tu es un assistant IA utile et amical. Tu dois TOUJOURS répondre en français, peu importe la langue de la question. Sois concis et précis dans tes réponses.",
                        "en": "You are a helpful and friendly AI assistant. You must ALWAYS respond in English, regardless of the question's language. Be concise and precise in your answers."
                    }
                    
                    # Construire l'historique pour Ollama avec system prompt
                    messages_for_ollama = [
                        {
                            'role': 'system',
                            'content': system_prompts.get(language, system_prompts["en"])
                        }
                    ]
                    
                    # Ajouter les messages précédents
                    for msg in previous_messages:
                        messages_for_ollama.append({
                            'role': msg['role'],
                            'content': msg['content']
                        })
                    
                    # Appel à Ollama avec l'historique complet
                    for chunk in ollama.chat(model=model, messages=messages_for_ollama, stream=True):
                        token = chunk['message']['content']
                        full_response += token
                        # On renvoie le token au frontend via l'IPC
                        yield {"event": "token", "data": token, "chat_id": active_chat_id}
                    
                    # 3. Une fois fini, on sauvegarde la réponse de l'IA
                    chat_history_service.save_message(active_chat_id, "assistant", full_response, model=model)
                    yield {"event": "done", "chat_id": active_chat_id}
                
                except Exception as e:
                    monitoring_service.add_log(f"CHAT ERROR: {str(e)}")
                    yield {"event": "error", "message": str(e), "chat_id": active_chat_id}

            return chat_stream()

        # ============================================
        # --- ACCÈS DISTANT (CLOUDFLARE TUNNEL) ---
        # ============================================
        
        # Vérifie si cloudflared est installé
        if cmd == "tunnel_check_cloudflared":
            return tunnel_service.check_cloudflared_installed()
        
        # Installe cloudflared automatiquement
        if cmd == "tunnel_install_cloudflared":
            return tunnel_service.install_cloudflared()
        
        # Récupère la progression de l'installation
        if cmd == "tunnel_install_progress":
            return tunnel_service.get_install_progress()
        
        # Récupère le statut du tunnel
        if cmd == "tunnel_get_status":
            status = tunnel_service.get_status()
            # Ajouter le statut du serveur HTTP
            if self.remote_server:
                status["http_server"] = self.remote_server.get_status()
            else:
                status["http_server"] = {"running": False, "port": None}
            return status
        
        # Génère un nouveau token d'authentification
        if cmd == "tunnel_generate_token":
            expires_hours = payload.get("expires_hours", 24)
            return tunnel_service.generate_auth_token(expires_hours)
        
        # Démarre le tunnel et le serveur HTTP
        if cmd == "tunnel_start":
            http_port = payload.get("port", 8765)
            
            # 1. Démarrer le serveur HTTP local
            if not self.remote_server:
                self.remote_server = RemoteAccessServer(tunnel_service, self)
            
            http_result = self.remote_server.start(http_port)
            if not http_result.get("success"):
                return http_result
            
            # 2. Démarrer le tunnel Cloudflare
            tunnel_result = tunnel_service.start_tunnel(http_port)
            
            if not tunnel_result.get("success"):
                # Arrêter le serveur HTTP si le tunnel échoue
                self.remote_server.stop()
                return tunnel_result
            
            monitoring_service.add_log(f"🌐 Remote access enabled: {tunnel_result.get('url', 'starting...')}")
            
            return {
                "success": True,
                "tunnel_url": tunnel_result.get("url"),
                "http_port": http_port,
                "message": "Remote access enabled"
            }
        
        # Arrête le tunnel et le serveur HTTP
        if cmd == "tunnel_stop":
            # 1. Arrêter le tunnel
            tunnel_result = tunnel_service.stop_tunnel()
            
            # 2. Arrêter le serveur HTTP
            if self.remote_server:
                self.remote_server.stop()
            
            monitoring_service.add_log("🔒 Remote access disabled")
            
            return {
                "success": True,
                "message": "Remote access disabled"
            }
        
        # Récupère les données pour le QR code
        if cmd == "tunnel_get_qr":
            return tunnel_service.get_qr_data()
        
        # Gestion de la liste blanche IP
        if cmd == "tunnel_add_allowed_ip":
            ip = payload.get("ip")
            if not ip:
                return {"success": False, "error": "Missing 'ip' parameter"}
            return tunnel_service.add_allowed_ip(ip)
        
        if cmd == "tunnel_remove_allowed_ip":
            ip = payload.get("ip")
            if not ip:
                return {"success": False, "error": "Missing 'ip' parameter"}
            return tunnel_service.remove_allowed_ip(ip)
        
        # Valide un token (pour debug/test)
        if cmd == "tunnel_validate_token":
            token = payload.get("token")
            if not token:
                return {"valid": False, "reason": "No token provided"}
            return tunnel_service.validate_token(token)

        # Valide un token personnalisé (avant de le définir)
        if cmd == "tunnel_validate_custom_token":
            token = payload.get("token")
            if not token:
                return {"valid": False, "error": "Token is required"}
            return tunnel_service.validate_custom_token(token)

        # Définit un token personnalisé
        if cmd == "tunnel_set_custom_token":
            token = payload.get("token")
            if not token:
                return {"success": False, "error": "Token is required"}
            return tunnel_service.set_custom_token(token)

        # Récupère les données pour le QR code avec token intégré
        if cmd == "tunnel_get_qr_with_token":
            token = payload.get("token")
            if not token:
                return {"success": False, "error": "Token is required"}
            return tunnel_service.get_qr_data_with_token(token)

        raise ValueError(f"Unknown command: {cmd}")
