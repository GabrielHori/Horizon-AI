import sys
import os
import json
import ollama

# Importation des services
try:
    from services.monitoring_service import monitoring_service
    from services.ollama_service import ollama_service
    from services.airllm_manager import airllm_manager
    from services.chat_history_service import chat_history_service
    from services.system_service import system_service
    from services.tunnel_service import tunnel_service
    from services.http_server import RemoteAccessServer
    from services.prompt_builder_service import prompt_builder_service
    from services.search_service import search_service  # V2.1 : Recherche web
    from services.audit_service import audit_service, ActionType
    from services.project_service import project_service  # V2.1 : Service projets
    from services.path_validator import path_validator  # V2.1 : Validation path traversal
    from services.input_validator import input_validator  # V2.1 Phase 3 : Validation d'entrée stricte
    from services.rate_limiter import rate_limiter
    from services.licensing_service import licensing_service
    from services.feature_gates import feature_is_enabled  # V2.1 Phase 3 : Rate limiting pour sécurité
    from ipc.permission_guard import permission_guard  # V2.1 : Defense-in-depth permissions
except ImportError as e:
    print(f"[Dispatcher Error] Services import failed: {str(e)}", file=sys.stderr)
    project_service = None
    search_service = None
    input_validator = None
    rate_limiter = None
    licensing_service = None

class CommandDispatcher:
    def __init__(self, ipc=None):
        self.ipc = ipc
        self.remote_server = None  # Serveur HTTP pour accès distant
        self.active_chat_id = None  # 🔧 CORRECTION: ID du chat actif pour cancellation
        self.cancel_streaming = False  # 🔧 CORRECTION: Flag pour stopper le streaming

    def _create_error_response(self, error_code, error_message, context=None, details=None):
        """Crée une réponse d'erreur standardisée compatible avec le frontend"""
        response = {
            "error": True,
            "code": error_code,
            "message": error_message
        }
        if context:
            response["context"] = context
        if details:
            response["details"] = details
        return response

    def _create_success_response(self, data=None, message=None):
        """Crée une réponse de succès standardisée"""
        response = {"success": True}
        if data is not None:
            response["data"] = data
        if message:
            response["message"] = message
        return response

    def dispatch(self, cmd, payload):
        # ✅ PERMISSION GUARD (Defense in Depth - V2.1)
        # Vérification secondaire des permissions côté Python
        # (Rust PermissionManager reste l'autorité principale)
        allowed, error = permission_guard.check(cmd, payload)
        if not allowed:
            print(f"[SECURITY] Permission denied by Python guard: {cmd} - {error}", file=sys.stderr)
            return self._create_error_response("PERMISSION_DENIED", f"Permission denied: {error}", cmd)

        # ✅ V2.1 Phase 3: Validation de la taille du payload (sécurité DoS)
        # Vérifier que le payload n'est pas trop volumineux
        if input_validator:
            is_valid, error = input_validator.validate_payload_size(payload)
            if not is_valid:
                print(f"[SECURITY] Oversized payload blocked: {len(str(payload))} bytes - {error}", file=sys.stderr)
                return self._create_error_response("PAYLOAD_TOO_LARGE", error, cmd)

        # ✅ V2.1 Phase 3: RATE LIMITING (Protection contre les attaques par force brute)
        # Vérifier les limites de requêtes pour les commandes sensibles
        if rate_limiter:
            # Obtenir un identifiant client (IP ou session ID)
            # Note: Dans Tauri, l'IP n'est pas directement disponible, donc on utilise un client_id du payload
            # ou un identifiant de session. Pour l'instant, utiliser une combinaison commande+session.
            client_id = payload.get("client_id", "unknown")

            # Pour les commandes sensibles, appliquer le rate limiting
            if cmd in rate_limiter.get_limits():
                allowed, retry_after = rate_limiter.check_limit(cmd, client_id)
                if not allowed:
                    print(f"[SECURITY] Rate limit exceeded for {cmd} from {client_id}. Blocked for {retry_after} seconds", file=sys.stderr)
                    return self._create_error_response(
                        "RATE_LIMIT_EXCEEDED",
                        f"Too many requests. Please try again in {retry_after} seconds",
                        cmd
                    )
        
        ent_status = licensing_service.get_status_snapshot() if licensing_service else None

        # --- HEALTH CHECK ---
        if cmd == "health_check":
            return {"status": "healthy"}
        
        # 🔧 CORRECTION URGENTE: Commande pour stopper le streaming
        if cmd == "cancel_chat":
            chat_id = payload.get("chat_id")
            if chat_id == self.active_chat_id:
                self.cancel_streaming = True
                print(f"🛑 Streaming cancelled for chat_id: {chat_id}", file=sys.stderr)
                return {"success": True, "message": "Streaming cancelled"}
            return {"success": False, "error": "No active chat or wrong chat_id"}
        
        # --- SHUTDOWN (fermeture propre) ---
        if cmd == "shutdown":
            print("🛑 Worker shutdown requested", file=sys.stderr)
            try:
                airllm_manager.disable()
            except Exception:
                pass
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

        if cmd == "web_search_available":
            available = False
            try:
                if search_service and hasattr(search_service, "is_available"):
                    available = bool(search_service.is_available())
            except Exception:
                available = False
            return {"available": available}

        # --- GESTION DES MODÈLES OLLAMA ---
        if cmd == "pull":
            model_name = payload.get("model")
            monitoring_service.add_log(f"INITIATING: Pulling model '{model_name}'...")
            return ollama_service.pull_model_stream(model_name)

        if cmd == "get_models":
            try:
                # Utilisation directe de la CLI 'ollama list' (Prouvé fonctionnel sur ce système)
                import subprocess

                # Création flag pour cacher fenêtre sur Windows
                creation_flags = 0x08000000 if sys.platform == 'win32' else 0

                result = subprocess.run(
                    ["ollama", "list"],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='ignore',
                    creationflags=creation_flags,
                    timeout=10
                )

                if result.returncode != 0:
                     monitoring_service.add_log(f"ERROR: Ollama CLI returned code {result.returncode}")
                     return self._create_error_response("OLLAMA_CLI_ERROR", f"CLI Error: {result.stderr}")

                # Parsing de la sortie textuelle (NAME ID SIZE MODIFIED)
                models = []
                lines = result.stdout.strip().split('\n')

                # Ignorer l'en-tête
                start_index = 0
                if len(lines) > 0 and "NAME" in lines[0].upper() and "ID" in lines[0].upper():
                    start_index = 1

                for line in lines[start_index:]:
                    parts = line.split()
                    if len(parts) >= 1:
                        # parts[0] = nom (ex: deepseek-r1:7b)
                        # parts[2] = taille + unit (ex: 4.7 GB)
                        name = parts[0]
                        size_bytes = 0

                        # 🔧 CORRECTION: Parsing amélioré de la taille
                        # Format attendu : "4.7 GB" ou "4.7GB"
                        if len(parts) >= 3:
                            try:
                                import re
                                size_value = None
                                size_unit = None
                                if len(parts) >= 4:
                                    if re.match(r'^[0-9.]+$', parts[2]) and re.match(r'^[A-Za-z]+$', parts[3]):
                                        size_value = float(parts[2])
                                        size_unit = parts[3].upper()
                                if size_value is None:
                                    size_clean = parts[2]
                                    if len(parts) >= 4:
                                        size_clean = f"{parts[2]}{parts[3]}"
                                    size_clean = size_clean.replace(' ', '')
                                    match = re.match(r'^([0-9.]+)([A-Za-z]+)$', size_clean)
                                    if match:
                                        size_value = float(match.group(1))
                                        size_unit = match.group(2).upper()
                                if size_unit and size_value is not None:
                                    if size_unit.endswith('IB'):
                                        size_unit = size_unit.replace('IB', 'B')
                                    if size_unit == 'K':
                                        size_unit = 'KB'
                                    elif size_unit == 'M':
                                        size_unit = 'MB'
                                    elif size_unit == 'G':
                                        size_unit = 'GB'
                                    elif size_unit == 'T':
                                        size_unit = 'TB'
                                    unit_multipliers = {
                                        'B': 1,
                                        'KB': 1024,
                                        'MB': 1024 * 1024,
                                        'GB': 1024 * 1024 * 1024,
                                        'TB': 1024 * 1024 * 1024 * 1024
                                    }
                                    if size_unit in unit_multipliers:
                                        size_bytes = int(size_value * unit_multipliers[size_unit])
                            except Exception as e:
                                print(f"[DEBUG] Failed to parse size: {str(e)}", file=sys.stderr)
                                size_bytes = 0
                        # On retourne un objet simple avec les champs attendus par le frontend
                        models.append({
                            "name": name,
                            "size": size_bytes,  # Taille en bytes pour le frontend
                            "details": {"format": "gguf", "family": "llama", "parameter_size": "7B", "quantization_level": "Q4_0"}
                        })

                # 🔧 CORRECTION: Logger les modèles trouvés pour debug
                print(f"[DEBUG] Found {len(models)} models: {', '.join([m['name'] for m in models])}", file=sys.stderr)

                # 🔧 CORRECTION CRITIQUE: Retourner directement le tableau pour compatibilité frontend
                # Le ModelManager attend un tableau, pas un objet {success: true, data: models}
                return models

            except Exception as e:
                monitoring_service.add_log(f"ERROR: get_models subprocess failed: {str(e)}")
                return self._create_error_response("MODEL_LIST_ERROR", f"Failed to list models via CLI: {str(e)}")

        if cmd == "delete_model":
            return ollama_service.delete_model(payload.get("name"))

        # --- AIRLLM (Python sidecar) ---
        if cmd == "airllm_list_models":
            return airllm_manager.list_models()

        if cmd == "airllm_status":
            return airllm_manager.get_status()

        if cmd == "airllm_enable":
            return airllm_manager.enable(payload.get("model"))

        if cmd == "airllm_reload":
            return airllm_manager.reload(payload.get("model"))

        if cmd == "airllm_disable":
            return airllm_manager.disable()

        if cmd == "airllm_set_active_model":
            return airllm_manager.reload(payload.get("model"))

        # --- CHAT & HISTORIQUE (REQUIS POUR AIChatPanel.jsx) ---
        if cmd == "list_conversations":
            # Renvoie directement la liste pour match avec AIChatPanel
            return chat_history_service.list_conversations()

        if cmd == "get_conversation_messages":
            chat_id = payload.get("chat_id")
            return chat_history_service.get_messages(chat_id)
        
        # V2.1 : Récupérer les métadonnées d'une conversation (y compris projectId)
        if cmd == "get_conversation_metadata":
            chat_id = payload.get("chat_id")
            if not chat_id:
                return {"success": False, "error": "chat_id is required"}
            
            try:
                # Charger le fichier de conversation pour récupérer les métadonnées
                path = os.path.join(chat_history_service.storage_path, f"{chat_id}.json")
                if not os.path.exists(path):
                    return {"success": False, "error": "Conversation not found"}
                
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Détecter si chiffré
                is_encrypted = content.startswith("ENC:")
                if is_encrypted:
                    if not chat_history_service.crypto_service or not chat_history_service.crypto_service._master_key:
                        return {"success": False, "error": "Conversation encrypted but no key"}
                    encrypted_data = content[4:]
                    decrypted = chat_history_service.crypto_service.decrypt_string(encrypted_data)
                    data = json.loads(decrypted)
                else:
                    data = json.loads(content) if content.strip() else {}
                
                return {
                    "success": True,
                    "metadata": {
                        "id": data.get("id"),
                        "title": data.get("title"),
                        "model": data.get("model"),
                        "projectId": data.get("projectId"),  # V2.1
                        "created_at": data.get("created_at"),
                        "updated_at": data.get("updated_at"),
                        "message_count": len(data.get("messages", [])),
                        "encrypted": is_encrypted
                    }
                }
            except Exception as e:
                return {"success": False, "error": str(e)}

        if cmd == "delete_conversation":
            chat_id = payload.get("chat_id")
            return chat_history_service.delete_conversation(chat_id)

        # --- CHIFFREMENT CHAT HISTORY (V2) ---
        if cmd == "chat_history_set_crypto_password":
            password = payload.get("password")
            if not password:
                return {"success": False, "error": "password is required"}
            success = chat_history_service.set_crypto_password(password)
            return {"success": success}

        if cmd == "chat":
            model = payload.get("model")
            provider = payload.get("provider", "ollama")
            max_tokens = payload.get("max_tokens", 256)
            temperature = payload.get("temperature", 0.7)
            prompt = payload.get("prompt")
            chat_id = payload.get("chat_id") # Peut être None
            project_id = payload.get("project_id")  # V2.1 : ID du projet lié
            language = payload.get("language", "en")  # Langue de l'interface
            web_query = payload.get("web_query")
            web_max_results = payload.get("web_max_results", 5)
            context_files = payload.get("context_files", [])  # NOUVEAU: Fichiers de contexte
            memory_keys = payload.get("memory_keys", [])  # NOUVEAU: Clés de mémoire
            repo_context = payload.get("repo_context")  # NOUVEAU: Contexte repository

            # 1. Sauvegarder le message utilisateur et récupérer/créer l'ID
            # On passe aussi le modèle et project_id pour l'associer à la conversation (V2.1)
            active_chat_id = chat_history_service.save_message(
                chat_id, "user", prompt, 
                model=model, 
                project_id=project_id
            )

            # 2. Définir le générateur pour le streaming
            def chat_stream():
                # 🔧 CORRECTION: Réinitialiser le flag de cancellation
                self.cancel_streaming = False
                self.active_chat_id = active_chat_id
                
                full_response = ""
                try:
                    # Récupérer tous les messages précédents pour le contexte
                    previous_messages = chat_history_service.get_messages(active_chat_id)
                    
                    # Récupérer les mémoires pertinentes (V2.1 Sprint 2.2 : mémoire projet automatique)
                    memory_entries = []
                    
                    # V2.1 Sprint 2.2 : Charger automatiquement les memoryKeys du projet si project_id fourni
                    project_memory_keys = []
                    if project_id and project_service:
                        try:
                            project = project_service.get_project(project_id)
                            if project and project.memoryKeys:
                                project_memory_keys = project.memoryKeys
                        except Exception as e:
                            print(f"[Dispatcher] Error loading project memory keys: {e}", file=sys.stderr)
                    
                    # Combiner memory_keys (manuels, type "user") + memoryKeys projet (type "project")
                    all_memory_keys = list(set(memory_keys + project_memory_keys))  # Déduplication
                    
                    if all_memory_keys:
                        try:
                            from services.memory_service import memory_service
                            # Convertir en sets pour vérification efficace
                            project_keys_set = set(project_memory_keys)
                            user_keys_set = set(memory_keys)
                            
                            for key in all_memory_keys:
                                entry = None
                                
                                # Essayer d'abord mémoire projet si project_id fourni et que la clé est dans project.memoryKeys
                                if project_id and key in project_keys_set:
                                    entry = memory_service.get_memory("project", key, project_id=project_id)
                                
                                # Si pas trouvé en mémoire projet, essayer mémoire user
                                if not entry and key in user_keys_set:
                                    entry = memory_service.get_memory("user", key)
                                
                                if entry:
                                    memory_entries.append({"key": key, "value": entry})
                        except ImportError:
                            pass  # memory_service pas disponible
                    
                    # Construire le prompt avec PromptBuilder (V2)
                    web_context = None
                    if web_query:
                        if not search_service:
                            raise Exception("Web search service unavailable")

                        settings = system_service.load_settings() if system_service else {}
                        if not settings.get("internetAccess", False):
                            raise Exception("Internet access disabled in settings")

                        try:
                            max_results = int(web_max_results)
                        except Exception:
                            max_results = 5

                        if max_results < 1 or max_results > 10:
                            max_results = 5

                        web_context = search_service.search_web(web_query, max_results=max_results)

                    prompt_obj = prompt_builder_service.build_prompt(
                        user_message=prompt,
                        chat_history=previous_messages,
                        context_files=context_files,
                        memory_entries=memory_entries,
                        repo_context=repo_context,
                        web_context=web_context,
                        language=language,
                    )
                    
                    # Convertir en format Ollama
                    messages_for_ollama = prompt_obj.to_ollama_messages()
                    
                    # Logger l'envoi du prompt (audit trail)
                    audit_service.log_action(
                        ActionType.PROMPT_SENT,
                        {
                            "prompt_id": prompt_obj.prompt_id,
                            "model": model,
                            "project_id": project_id,  # V2.1 : Inclure project_id dans log
                            "user_message_length": len(prompt),
                            "context_files_count": len(context_files),
                            "memory_keys_count": len(all_memory_keys),  # V2.1 : Inclure memoryKeys projet
                            "memory_keys_user_count": len(memory_keys),
                            "memory_keys_project_count": len(project_memory_keys),  # V2.1 : Compte séparé
                            "components_count": len(prompt_obj.components),
                        }
                    )
                    
                    # Émettre le prompt string au frontend (pour affichage UI)
                    prompt_string = prompt_obj.to_string()
                    yield {
                        "event": "prompt_preview",
                        "data": prompt_string,
                        "prompt_id": prompt_obj.prompt_id,
                        "prompt_dict": prompt_obj.to_dict()
                    }
                    
                    target_model = model if provider == "ollama" else f"airllm:{model}"
                    if provider == "airllm":
                        result = airllm_manager.generate(
                            prompt_string,
                            {"max_tokens": max_tokens, "temperature": temperature},
                        )
                    
                        if not result.get("ok"):
                            raise Exception(result.get("error") or "AirLLM generation failed")
                    
                        generated = result.get("text") or ""
                        chunk_size = 80
                        for i in range(0, len(generated), chunk_size):
                            if self.cancel_streaming:
                                break
                            token = generated[i:i+chunk_size]
                            full_response += token
                            yield {"event": "token", "data": token, "chat_id": active_chat_id}
                    
                        chat_history_service.save_message(
                            active_chat_id, "assistant", full_response, 
                            model=target_model,
                            project_id=project_id
                        )
                        yield {"event": "done", "chat_id": active_chat_id}
                    
                    else:
                        # Appel à Ollama avec l'historique complet
                        for chunk in ollama.chat(model=model, messages=messages_for_ollama, stream=True):
                            # 🔧 CORRECTION: Vérifier si l'utilisateur a annulé
                            if self.cancel_streaming:
                                print(f"[Dispatcher] Streaming cancelled by user for chat_id: {active_chat_id}", file=sys.stderr)
                                yield {"event": "cancelled", "chat_id": active_chat_id, "message": "Streaming stopped by user"}
                                break
                    
                            token = chunk['message']['content']
                            full_response += token
                            # On renvoie le token au frontend via l'IPC
                            yield {"event": "token", "data": token, "chat_id": active_chat_id}
                    
                        # 3. Une fois fini, on sauvegarde la réponse de l'IA (avec project_id pour conserver le lien)
                        chat_history_service.save_message(
                            active_chat_id, "assistant", full_response, 
                            model=model,
                            project_id=project_id  # V2.1 : Conserver le lien projet
                        )
                        yield {"event": "done", "chat_id": active_chat_id}
                
                except Exception as e:
                    monitoring_service.add_log(f"CHAT ERROR: {str(e)}")
                    yield {"event": "error", "message": str(e), "chat_id": active_chat_id}
                
                finally:
                    # 🔧 CORRECTION: Nettoyer l'état de cancellation
                    self.cancel_streaming = False
                    self.active_chat_id = None

            return chat_stream()

        # ============================================
        # --- ACCÈS DISTANT (CLOUDFLARE TUNNEL) ---
        # ============================================
        
        # Vérifie si cloudflared est installé
        if cmd in ["tunnel_start", "tunnel_generate_token", "tunnel_add_allowed_ip", "tunnel_remove_allowed_ip", "tunnel_get_qr"]:
            if licensing_service and "feature_is_enabled" in globals() and feature_is_enabled:
                if not feature_is_enabled("remote_access", ent_status or {}):
                    return self._create_error_response("LICENSE_REQUIRED", "Remote access requires Pro plan", cmd)

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
            # ✅ V2.1 Phase 3: Validation des paramètres
            if expires_hours is not None and (expires_hours < 1 or expires_hours > 720):  # 1h min, 30 jours max
                return {"success": False, "error": "expires_hours must be between 1 and 720"}
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
            # ✅ V2.1 Phase 3: Validation stricte de l'adresse IP
            if input_validator:
                is_valid, error = input_validator.validate_ip_address(ip)
                if not is_valid:
                    print(f"[SECURITY] Invalid IP address blocked: {ip} - {error}", file=sys.stderr)
                    return {"success": False, "error": f"Invalid IP address: {error}"}
            return tunnel_service.add_allowed_ip(ip)

        if cmd == "tunnel_remove_allowed_ip":
            ip = payload.get("ip")
            if not ip:
                return {"success": False, "error": "Missing 'ip' parameter"}
            # ✅ V2.1 Phase 3: Validation stricte de l'adresse IP
            if input_validator:
                is_valid, error = input_validator.validate_ip_address(ip)
                if not is_valid:
                    print(f"[SECURITY] Invalid IP address blocked: {ip} - {error}", file=sys.stderr)
                    return {"success": False, "error": f"Invalid IP address: {error}"}
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

        # Configure un tunnel nommé pour un domaine personnalisé
        if cmd == "tunnel_set_named_tunnel":
            enabled = payload.get("enabled", True)
            custom_domain = payload.get("custom_domain", "")
            tunnel_name = payload.get("tunnel_name", "")
            credentials_file = payload.get("credentials_file", "")
            return tunnel_service.set_named_tunnel_config(
                enabled=enabled,
                custom_domain=custom_domain,
                tunnel_name=tunnel_name,
                credentials_file=credentials_file
            )

        # Récupère les données pour le QR code avec token intégré
        if cmd == "tunnel_get_qr_with_token":
            token = payload.get("token")
            if not token:
                return {"success": False, "error": "Token is required"}
            return tunnel_service.get_qr_data_with_token(token)

        # --- GESTION DE LA MÉMOIRE (Phase 2) ---
        try:
            from services.memory_service import memory_service
        except ImportError:
            memory_service = None

        if memory_service:
            # Sauvegarder une entrée de mémoire
            if cmd == "memory_save":
                memory_type = payload.get("memory_type")  # "user", "project", "session"
                key = payload.get("key")
                value = payload.get("value")
                project_id = payload.get("project_id")
                metadata = payload.get("metadata")
                
                if not memory_type or not key:
                    return {"success": False, "error": "memory_type and key are required"}
                
                success = memory_service.save_memory(
                    memory_type=memory_type,
                    key=key,
                    value=value,
                    project_id=project_id,
                    metadata=metadata
                )
                
                return {"success": success}
            
            # Récupérer une entrée de mémoire
            if cmd == "memory_get":
                memory_type = payload.get("memory_type")
                key = payload.get("key")
                project_id = payload.get("project_id")
                
                if not memory_type or not key:
                    return {"success": False, "error": "memory_type and key are required"}
                
                value = memory_service.get_memory(
                    memory_type=memory_type,
                    key=key,
                    project_id=project_id
                )
                
                return {"success": value is not None, "value": value}
            
            # Lister toutes les entrées d'un type
            if cmd == "memory_list":
                memory_type = payload.get("memory_type")
                project_id = payload.get("project_id")
                
                if not memory_type:
                    return {"success": False, "error": "memory_type is required"}
                
                entries = memory_service.list_memories(
                    memory_type=memory_type,
                    project_id=project_id
                )
                
                return {"success": True, "entries": entries}
            
            # Supprimer une entrée de mémoire
            if cmd == "memory_delete":
                memory_type = payload.get("memory_type")
                key = payload.get("key")
                project_id = payload.get("project_id")
                
                if not memory_type or not key:
                    return {"success": False, "error": "memory_type and key are required"}
                
                success = memory_service.delete_memory(
                    memory_type=memory_type,
                    key=key,
                    project_id=project_id
                )
                
                return {"success": success}
            
            # Vider la mémoire de session
            if cmd == "memory_clear_session":
                success = memory_service.clear_session_memory()
                return {"success": success}
            
            # Configurer le mot de passe pour le chiffrement
            if cmd == "memory_set_crypto_password":
                password = payload.get("password")
                if not password:
                    return {"success": False, "error": "password is required"}
                
                success = memory_service.set_crypto_password(password)
                return {"success": success}

        # --- ANALYSE DE REPOSITORY (Phase 2) ---
        # Analyser un repository
        if cmd == "analyze_repository":
            try:
                from services.repo_analyzer_service import repo_analyzer_service
            except ImportError as e:
                return {"success": False, "error": f"Service not available: {str(e)}"}
            except Exception as e:
                return {"success": False, "error": f"Service error: {str(e)}"}
            
            if repo_analyzer_service:
                repo_path = payload.get("repo_path")
                max_depth = payload.get("max_depth", 10)
                max_files = payload.get("max_files", 1000)
                
                if not repo_path:
                    return {"success": False, "error": "repo_path is required"}
                
                # ✅ VALIDATION PATH TRAVERSAL (Sécurité critique)
                is_safe, error = path_validator.is_safe_repo_path(repo_path)
                if not is_safe:
                    # Logger la tentative pour audit de sécurité
                    print(f"[SECURITY] Path traversal attempt blocked: {repo_path} - {error}", file=sys.stderr)
                    if audit_service:
                        audit_service.log_action(
                            ActionType.FILE_READ,
                            {
                                "blocked": True,
                                "reason": "path_traversal_denied",
                                "attempted_path": repo_path,
                                "error": error
                            }
                        )
                    return {"success": False, "error": f"Invalid repository path: {error}"}
                
                try:
                    analysis = repo_analyzer_service.analyze_repository(
                        repo_path=repo_path,
                        max_depth=max_depth,
                        max_files=max_files
                    )
                    
                    # Convertir en dict pour JSON
                    from dataclasses import asdict
                    try:
                        analysis_dict = asdict(analysis)
                    except Exception:
                        # Fallback si asdict échoue
                        analysis_dict = {
                            "repo_path": analysis.repo_path,
                            "structure": analysis.structure,
                            "stack": analysis.stack,
                            "summary": analysis.summary,
                            "tech_debt": analysis.tech_debt,
                            "analyzed_at": analysis.analyzed_at,
                            "file_count": analysis.file_count,
                            "total_size": analysis.total_size
                        }
                    
                    return {
                        "success": True,
                        "analysis": analysis_dict
                    }
                except Exception as e:
                    import traceback
                    error_details = traceback.format_exc()
                    # Logger l'erreur sans utiliser sys.stderr (qui peut ne pas être disponible)
                    try:
                        print(f"[Dispatcher] Repo analysis error: {error_details}")
                    except:
                        pass
                    return {"success": False, "error": str(e)}
            else:
                return {"success": False, "error": "repo_analyzer_service is None"}
        
        # Obtenir uniquement le résumé
        if cmd == "get_repo_summary":
            try:
                from services.repo_analyzer_service import repo_analyzer_service
            except ImportError as e:
                return {"success": False, "error": f"Service not available: {str(e)}"}
            
            if not repo_analyzer_service:
                return {"success": False, "error": "repo_analyzer_service is None"}
            
            repo_path = payload.get("repo_path")
            if not repo_path:
                return {"success": False, "error": "repo_path is required"}
            
            try:
                analysis = repo_analyzer_service.analyze_repository(repo_path)
                return {
                    "success": True,
                    "summary": analysis.summary
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        # Détecter uniquement les dettes techniques
        if cmd == "detect_tech_debt":
            try:
                from services.repo_analyzer_service import repo_analyzer_service
            except ImportError as e:
                return {"success": False, "error": f"Service not available: {str(e)}"}
            
            if not repo_analyzer_service:
                return {"success": False, "error": "repo_analyzer_service is None"}
            
            repo_path = payload.get("repo_path")
            max_files = payload.get("max_files", 1000)
            
            if not repo_path:
                return {"success": False, "error": "repo_path is required"}
            
            try:
                analysis = repo_analyzer_service.analyze_repository(
                    repo_path=repo_path,
                    max_files=max_files
                )
                return {
                    "success": True,
                    "tech_debt": analysis.tech_debt
                }
            except Exception as e:
                return {"success": False, "error": str(e)}

        # --- GESTION DES PERMISSIONS (V2.1 Phase 3) ---
        # Accorder une permission explicitement (appelé par le système de permissions principal)
        if cmd == "grant_permission":
            permission_name = payload.get("permission")
            if not permission_name:
                return {"success": False, "error": "permission is required"}

            try:
                permission_guard.grant_permission(permission_name)
                print(f"[PERMISSION MANAGEMENT] Permission {permission_name} granted via explicit command", file=sys.stderr)
                return {"success": True, "message": f"Permission {permission_name} granted"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Révoquer une permission explicitement
        if cmd == "revoke_permission":
            permission_name = payload.get("permission")
            if not permission_name:
                return {"success": False, "error": "permission is required"}

            try:
                permission_guard.revoke_permission(permission_name)
                print(f"[PERMISSION MANAGEMENT] Permission {permission_name} revoked via explicit command", file=sys.stderr)
                return {"success": True, "message": f"Permission {permission_name} revoked"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Vérifier si une permission est accordée
        if cmd == "has_permission":
            permission_name = payload.get("permission")
            if not permission_name:
                return {"success": False, "error": "permission is required"}

            try:
                has_perm = permission_guard.has_permission(permission_name)
                return {"success": True, "has_permission": has_perm}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # --- GESTION DU RATE LIMITING (V2.1 Phase 3) ---
        # Vérifier si une IP est bloquée
        if cmd == "rate_limiter_is_blocked":
            client_id = payload.get("client_id")
            if not client_id:
                return {"success": False, "error": "client_id is required"}

            try:
                if rate_limiter:
                    is_blocked = rate_limiter.is_blocked(client_id)
                    return {"success": True, "is_blocked": is_blocked}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Obtenir la liste des IPs bloquées
        if cmd == "rate_limiter_get_blocked":
            try:
                if rate_limiter:
                    blocked_ips = rate_limiter.get_blocked_ips()
                    return {"success": True, "blocked_ips": blocked_ips}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Définir une limite personnalisée pour une commande
        if cmd == "rate_limiter_set_limit":
            command = payload.get("command")
            limit = payload.get("limit")
            if not command or limit is None:
                return {"success": False, "error": "command and limit are required"}

            try:
                if rate_limiter:
                    rate_limiter.set_limit(command, limit)
                    return {"success": True, "message": f"Limit for {command} set to {limit} requests/minute"}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Obtenir les limites actuelles
        if cmd == "rate_limiter_get_limits":
            try:
                if rate_limiter:
                    limits = rate_limiter.get_limits()
                    return {"success": True, "limits": limits}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Réinitialiser toutes les limites
        if cmd == "rate_limiter_reset":
            try:
                if rate_limiter:
                    rate_limiter.reset_limits()
                    return {"success": True, "message": "All rate limits reset to defaults"}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # Obtenir les statistiques du rate limiter
        if cmd == "rate_limiter_get_stats":
            try:
                if rate_limiter:
                    stats = rate_limiter.get_stats()
                    return {"success": True, "stats": stats}
                return {"success": False, "error": "Rate limiter not available"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        # --- GESTION DES CONVERSATIONS PROJETS (V2.1) ---
        if chat_history_service:
            # Mettre à jour le projectId d'une conversation
            if cmd == "update_conversation_project":
                chat_id = payload.get("chat_id")
                project_id = payload.get("project_id")  # Peut être None pour retirer le lien

                if not chat_id:
                    return {"success": False, "error": "chat_id is required"}

                try:
                    success = chat_history_service.update_conversation_project(chat_id, project_id)
                    return {"success": success}
                except Exception as e:
                    return {"success": False, "error": str(e)}

        # --- GESTION DES PROJETS (V2.1) ---
        if project_service:
            # Lister tous les projets
            if cmd == "projects_list":
                try:
                    projects = project_service.list_projects()
                    return {
                        "success": True,
                        "projects": [p.to_dict() for p in projects]
                    }
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Récupérer un projet par ID
            if cmd == "projects_get":
                project_id = payload.get("project_id")
                if not project_id:
                    return {"success": False, "error": "project_id is required"}
                
                try:
                    project = project_service.get_project(project_id)
                    if project:
                        return {"success": True, "project": project.to_dict()}
                    else:
                        return {"success": False, "error": "Project not found"}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Créer un nouveau projet
            if cmd == "projects_create":
                name = payload.get("name")
                if not name:
                    return {"success": False, "error": "name is required"}
                
                try:
                    project = project_service.create_project(
                        name=name,
                        description=payload.get("description"),
                        scopePath=payload.get("scopePath"),
                        permissions=payload.get("permissions")
                    )
                    return {"success": True, "project": project.to_dict()}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Mettre à jour un projet
            if cmd == "projects_update":
                project_id = payload.get("project_id")
                if not project_id:
                    return {"success": False, "error": "project_id is required"}
                
                updates = payload.get("updates", {})
                if not updates:
                    return {"success": False, "error": "updates is required"}
                
                try:
                    project = project_service.update_project(project_id, updates)
                    if project:
                        return {"success": True, "project": project.to_dict()}
                    else:
                        return {"success": False, "error": "Project not found"}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Supprimer un projet
            if cmd == "projects_delete":
                project_id = payload.get("project_id")
                if not project_id:
                    return {"success": False, "error": "project_id is required"}
                
                try:
                    success = project_service.delete_project(project_id)
                    return {"success": success}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Ajouter un repository à un projet
            if cmd == "projects_add_repo":
                project_id = payload.get("project_id")
                repo_path = payload.get("repo_path")
                
                if not project_id or not repo_path:
                    return {"success": False, "error": "project_id and repo_path are required"}
                
                # ✅ VALIDATION PATH TRAVERSAL (Sécurité critique)
                is_safe, error = path_validator.is_safe_repo_path(repo_path)
                if not is_safe:
                    print(f"[SECURITY] Path traversal attempt blocked in projects_add_repo: {repo_path} - {error}", file=sys.stderr)
                    if audit_service:
                        audit_service.log_action(
                            ActionType.FILE_READ,
                            {
                                "blocked": True,
                                "reason": "path_traversal_denied",
                                "attempted_path": repo_path,
                                "project_id": project_id,
                                "error": error
                            }
                        )
                    return {"success": False, "error": f"Invalid repository path: {error}"}
                
                try:
                    project = project_service.add_repo_to_project(
                        project_id=project_id,
                        repo_path=repo_path,
                        analysis=payload.get("analysis")
                    )
                    if project:
                        return {"success": True, "project": project.to_dict()}
                    else:
                        return {"success": False, "error": "Project not found"}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # Retirer un repository d'un projet
            if cmd == "projects_remove_repo":
                project_id = payload.get("project_id")
                repo_path = payload.get("repo_path")
                
                if not project_id or not repo_path:
                    return {"success": False, "error": "project_id and repo_path are required"}
                
                try:
                    project = project_service.remove_repo_from_project(
                        project_id=project_id,
                        repo_path=repo_path
                    )
                    if project:
                        return {"success": True, "project": project.to_dict()}
                    else:
                        return {"success": False, "error": "Project not found"}
                except Exception as e:
                    return {"success": False, "error": str(e)}
            
            # V2.1 Sprint 2.2 : Récupérer ou créer projet "Orphelin"
            if cmd == "projects_get_or_create_orphan":
                language = payload.get("language", "fr")
                try:
                    orphan_project = project_service.get_or_create_orphan_project(language)
                    return {"success": True, "project": orphan_project.to_dict()}
                except Exception as e:
                    return {"success": False, "error": str(e)}

        raise ValueError(f"Unknown command: {cmd}")
