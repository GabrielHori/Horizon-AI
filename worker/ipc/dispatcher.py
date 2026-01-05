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
except ImportError as e:
    print(f"[Dispatcher Error] Services import failed: {e}", file=sys.stderr)

class CommandDispatcher:
    def __init__(self, ipc=None):
        self.ipc = ipc

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

        raise ValueError(f"Unknown command: {cmd}")
