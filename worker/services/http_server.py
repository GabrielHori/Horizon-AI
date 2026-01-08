"""
Serveur HTTP Local pour Accès Distant via Cloudflare Tunnel
==========================================================
Ce serveur HTTP léger gère les requêtes distantes de manière sécurisée.

IMPORTANT - Philosophie LOCAL-FIRST:
- Ce serveur ne stocke AUCUNE donnée
- Toutes les requêtes sont traitées localement
- Cloudflare ne fait que relayer le trafic HTTPS

Sécurité implémentée:
1. Authentification par token Bearer
2. Rate limiting par IP
3. Liste blanche IP optionnelle
4. Validation des entrées
5. Headers de sécurité
"""

import os
import sys
import json
import threading
import traceback
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, Optional, Callable
from pathlib import Path
import time


class SecureRequestHandler(BaseHTTPRequestHandler):
    """
    Handler HTTP sécurisé pour l'accès distant
    
    Toutes les requêtes passent par:
    1. Vérification IP (allowlist)
    2. Vérification rate limit
    3. Authentification token
    4. Dispatch vers le handler approprié
    """
    
    # Ces attributs seront définis par le serveur parent
    tunnel_service = None
    command_dispatcher = None
    web_dir = None
    
    def log_message(self, format, *args):
        """Override pour logger vers stderr de manière structurée"""
        print(f"[HTTP] {args[0]}", file=sys.stderr)
    
    def _get_client_ip(self) -> str:
        """Récupère l'IP du client (en tenant compte du proxy Cloudflare)"""
        # Cloudflare envoie l'IP réelle dans CF-Connecting-IP
        cf_ip = self.headers.get('CF-Connecting-IP')
        if cf_ip:
            return cf_ip
        
        # Fallback sur X-Forwarded-For
        forwarded = self.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        # Fallback sur l'IP directe
        return self.client_address[0]
    
    def _send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Envoie une réponse JSON avec les headers de sécurité"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        
        # Headers de sécurité
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        
        # CORS pour permettre l'accès depuis des clients web
        origin = self.headers.get('Origin', '*')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')
        
        self.end_headers()
        
        response_body = json.dumps(data, ensure_ascii=False)
        self.wfile.write(response_body.encode('utf-8'))
    
    def _send_html_response(self, html_content: str):
        """Envoie une réponse HTML"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))
    
    def _send_error_response(self, status_code: int, error: str, details: str = None):
        """Envoie une réponse d'erreur standardisée"""
        data = {
            "success": False,
            "error": error
        }
        if details:
            data["details"] = details
        
        self._send_json_response(status_code, data)
    
    def _authenticate(self) -> bool:
        """
        Vérifie l'authentification de la requête
        
        Le token doit être envoyé dans le header Authorization:
        Authorization: Bearer <token>
        """
        if not self.tunnel_service:
            return False
        
        auth_header = self.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            self._send_error_response(401, "Missing or invalid Authorization header", 
                                      "Use 'Authorization: Bearer <your_token>'")
            return False
        
        token = auth_header[7:]  # Enlever "Bearer "
        
        validation = self.tunnel_service.validate_token(token)
        
        if not validation.get('valid'):
            self._send_error_response(401, "Authentication failed", 
                                      validation.get('reason', 'Invalid token'))
            return False
        
        return True
    
    def _check_rate_limit(self, client_ip: str) -> bool:
        """Vérifie le rate limit pour cette IP"""
        if not self.tunnel_service:
            return True
        
        if not self.tunnel_service.rate_limiter.is_allowed(client_ip):
            remaining = self.tunnel_service.rate_limiter.get_remaining(client_ip)
            self._send_error_response(429, "Rate limit exceeded", 
                                      f"Too many requests. Try again later. Remaining: {remaining}")
            return False
        
        return True
    
    def _check_ip_allowed(self, client_ip: str) -> bool:
        """Vérifie si l'IP est dans la liste blanche"""
        if not self.tunnel_service:
            return True
        
        if not self.tunnel_service.check_ip_allowed(client_ip):
            self._send_error_response(403, "IP not allowed", 
                                      "Your IP address is not in the allowlist")
            return False
        
        return True
    
    def do_OPTIONS(self):
        """Gère les requêtes CORS preflight"""
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin', '*'))
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
    
    def do_GET(self):
        """Gère les requêtes GET"""
        client_ip = self._get_client_ip()
        
        # Vérifications de sécurité
        if not self._check_ip_allowed(client_ip):
            return
        if not self._check_rate_limit(client_ip):
            return
        
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)
        
        # Routes publiques (sans authentification)
        if path == '/health':
            self._handle_health()
            return
        
        # Serve web interface (page de login)
        if path == '/' or path == '/index.html':
            self._serve_web_interface()
            return
        
        # Routes protégées
        if not self._authenticate():
            return
        
        if path == '/api/status':
            self._handle_status()
        elif path == '/api/models':
            self._handle_models()
        elif path == '/api/conversations':
            self._handle_conversations()
        elif path.startswith('/api/conversations/') and '/messages' in path:
            # Extraire le chat_id: /api/conversations/{chat_id}/messages
            match = re.match(r'/api/conversations/([^/]+)/messages', path)
            if match:
                chat_id = match.group(1)
                self._handle_conversation_messages(chat_id)
            else:
                self._send_error_response(404, "Not found")
        else:
            self._send_error_response(404, "Not found", f"Unknown endpoint: {path}")
    
    def do_POST(self):
        """Gère les requêtes POST"""
        client_ip = self._get_client_ip()
        
        # Vérifications de sécurité
        if not self._check_ip_allowed(client_ip):
            return
        if not self._check_rate_limit(client_ip):
            return
        if not self._authenticate():
            return
        
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Lire le body
        content_length = int(self.headers.get('Content-Length', 0))
        body = {}
        
        if content_length > 0:
            try:
                raw_body = self.rfile.read(content_length)
                body = json.loads(raw_body.decode('utf-8'))
            except json.JSONDecodeError:
                self._send_error_response(400, "Invalid JSON body")
                return
            except Exception as e:
                self._send_error_response(400, f"Error reading body: {str(e)}")
                return
        
        # Router vers le handler approprié
        if path == '/api/chat':
            self._handle_chat(body)
        elif path == '/api/chat/stream':
            self._handle_chat_stream(body)
        else:
            self._send_error_response(404, "Not found", f"Unknown endpoint: {path}")
    
    # ========== HANDLERS ==========
    
    def _serve_web_interface(self):
        """Sert l'interface web de chat"""
        # Chercher le fichier index.html dans plusieurs emplacements possibles
        possible_paths = []
        
        if self.web_dir:
            possible_paths.append(self.web_dir / "index.html")
        
        # Mode développement - différents chemins possibles
        current_file = Path(__file__).resolve()
        possible_paths.extend([
            current_file.parent.parent / "web" / "index.html",  # worker/web/index.html
            current_file.parent.parent.parent / "worker" / "web" / "index.html",
            Path.cwd() / "worker" / "web" / "index.html",
        ])
        
        for index_path in possible_paths:
            if index_path.exists():
                try:
                    print(f"[HTTP] Serving web interface from: {index_path}", file=sys.stderr)
                    with open(index_path, 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    self._send_html_response(html_content)
                    return
                except Exception as e:
                    print(f"[HTTP] Error serving index.html from {index_path}: {e}", file=sys.stderr)
        
        print(f"[HTTP] Web interface not found, tried: {possible_paths}", file=sys.stderr)
        
        # Fallback: interface intégrée
        self._send_html_response("""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horizon AI - Remote Access</title>
    <style>
        body { font-family: system-ui; background: #0a0a0a; color: white; 
               display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; }
        .card { background: #111; border: 1px solid #222; border-radius: 16px; 
                padding: 32px; text-align: center; max-width: 400px; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        p { color: #888; font-size: 14px; }
        .badge { background: #10b98120; color: #10b981; padding: 4px 12px; 
                 border-radius: 20px; font-size: 12px; display: inline-block; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🤖 Horizon AI</h1>
        <p>Remote access is enabled</p>
        <div class="badge">✓ Connected</div>
        <p style="margin-top: 24px; font-size: 12px;">
            Use the API endpoints with your token to chat.
        </p>
    </div>
</body>
</html>
        """)
    
    def _handle_health(self):
        """Health check (public)"""
        self._send_json_response(200, {
            "status": "healthy",
            "timestamp": time.time(),
            "service": "horizon-ai"
        })
    
    def _handle_status(self):
        """Statut détaillé du système"""
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        try:
            # Récupérer les stats système
            stats = self.command_dispatcher.dispatch("get_system_stats", {})
            
            self._send_json_response(200, {
                "success": True,
                "data": stats
            })
        except Exception as e:
            self._send_error_response(500, f"Error getting status: {str(e)}")
    
    def _handle_models(self):
        """Liste des modèles disponibles"""
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        try:
            models = self.command_dispatcher.dispatch("get_models", {})
            
            self._send_json_response(200, {
                "success": True,
                "models": models
            })
        except Exception as e:
            self._send_error_response(500, f"Error getting models: {str(e)}")
    
    def _handle_conversations(self):
        """Liste des conversations"""
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        try:
            conversations = self.command_dispatcher.dispatch("list_conversations", {})
            
            self._send_json_response(200, {
                "success": True,
                "conversations": conversations
            })
        except Exception as e:
            self._send_error_response(500, f"Error getting conversations: {str(e)}")
    
    def _handle_conversation_messages(self, chat_id: str):
        """Récupère les messages d'une conversation"""
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        try:
            messages = self.command_dispatcher.dispatch("get_conversation_messages", {"chat_id": chat_id})
            
            self._send_json_response(200, {
                "success": True,
                "messages": messages
            })
        except Exception as e:
            self._send_error_response(500, f"Error getting messages: {str(e)}")
    
    def _handle_chat(self, body: Dict[str, Any]):
        """
        Chat non-streaming (réponse complète)
        
        Body attendu:
        {
            "model": "llama3.2:3b",
            "prompt": "Hello!",
            "chat_id": null (optionnel)
        }
        """
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        model = body.get('model')
        prompt = body.get('prompt')
        chat_id = body.get('chat_id')
        language = body.get('language', 'en')
        
        if not model:
            self._send_error_response(400, "Missing 'model' parameter")
            return
        
        if not prompt:
            self._send_error_response(400, "Missing 'prompt' parameter")
            return
        
        try:
            # Dispatcher vers la commande chat
            result = self.command_dispatcher.dispatch("chat", {
                "model": model,
                "prompt": prompt,
                "chat_id": chat_id,
                "language": language
            })
            
            # Si c'est un générateur (streaming), on collecte tout
            if hasattr(result, "__iter__") and not isinstance(result, (dict, list)):
                full_response = ""
                final_chat_id = chat_id
                
                for event in result:
                    if event.get("event") == "token":
                        full_response += event.get("data", "")
                        if not final_chat_id:
                            final_chat_id = event.get("chat_id")
                    elif event.get("event") == "done":
                        final_chat_id = event.get("chat_id", final_chat_id)
                    elif event.get("event") == "error":
                        self._send_error_response(500, event.get("message", "Chat error"))
                        return
                
                self._send_json_response(200, {
                    "success": True,
                    "response": full_response,
                    "chat_id": final_chat_id
                })
            else:
                self._send_json_response(200, {
                    "success": True,
                    "data": result
                })
                
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self._send_error_response(500, f"Chat error: {str(e)}")
    
    def _handle_chat_stream(self, body: Dict[str, Any]):
        """
        Chat avec streaming (Server-Sent Events)
        
        Body attendu:
        {
            "model": "llama3.2:3b",
            "prompt": "Hello!",
            "chat_id": null (optionnel)
        }
        """
        if not self.command_dispatcher:
            self._send_error_response(500, "Dispatcher not available")
            return
        
        model = body.get('model')
        prompt = body.get('prompt')
        chat_id = body.get('chat_id')
        language = body.get('language', 'en')
        
        if not model:
            self._send_error_response(400, "Missing 'model' parameter")
            return
        
        if not prompt:
            self._send_error_response(400, "Missing 'prompt' parameter")
            return
        
        try:
            # Configurer la réponse SSE
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin', '*'))
            self.end_headers()
            
            # Dispatcher vers la commande chat
            result = self.command_dispatcher.dispatch("chat", {
                "model": model,
                "prompt": prompt,
                "chat_id": chat_id,
                "language": language
            })
            
            # Streamer les événements
            if hasattr(result, "__iter__") and not isinstance(result, (dict, list)):
                for event in result:
                    event_type = event.get("event", "message")
                    
                    # Format SSE
                    sse_data = f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
                    self.wfile.write(sse_data.encode('utf-8'))
                    self.wfile.flush()
                    
                    if event_type == "done" or event_type == "error":
                        break
            
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            error_event = f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            try:
                self.wfile.write(error_event.encode('utf-8'))
                self.wfile.flush()
            except:
                pass


class RemoteAccessServer:
    """
    Serveur HTTP pour l'accès distant sécurisé
    
    Ce serveur est démarré/arrêté en tandem avec le tunnel Cloudflare.
    """
    
    def __init__(self, tunnel_service, command_dispatcher):
        self.tunnel_service = tunnel_service
        self.command_dispatcher = command_dispatcher
        self.server: Optional[HTTPServer] = None
        self.server_thread: Optional[threading.Thread] = None
        self.is_running = False
        
        # Déterminer le chemin du dossier web
        if getattr(sys, 'frozen', False):
            # Mode exécutable
            base_path = Path(sys.executable).parent
            self.web_dir = base_path / "web"
        else:
            # Mode développement
            self.web_dir = Path(__file__).resolve().parent.parent / "web"
    
    def start(self, port: int = 8765) -> Dict[str, Any]:
        """Démarre le serveur HTTP"""
        if self.is_running:
            return {"success": False, "error": "Server already running"}
        
        try:
            # Configurer le handler avec nos services
            handler = SecureRequestHandler
            handler.tunnel_service = self.tunnel_service
            handler.command_dispatcher = self.command_dispatcher
            handler.web_dir = self.web_dir
            
            # Créer le serveur
            self.server = HTTPServer(('127.0.0.1', port), handler)
            
            # Démarrer dans un thread séparé
            self.server_thread = threading.Thread(target=self._run_server, daemon=True)
            self.server_thread.start()
            
            self.is_running = True
            
            print(f"[HTTP Server] Started on port {port}", file=sys.stderr)
            print(f"[HTTP Server] Web dir: {self.web_dir}", file=sys.stderr)
            
            return {
                "success": True,
                "port": port,
                "message": f"HTTP server started on localhost:{port}"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_server(self):
        """Boucle du serveur"""
        try:
            self.server.serve_forever()
        except Exception as e:
            print(f"[HTTP Server] Error: {e}", file=sys.stderr)
        finally:
            self.is_running = False
    
    def stop(self) -> Dict[str, Any]:
        """Arrête le serveur HTTP"""
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception as e:
                print(f"[HTTP Server] Error stopping: {e}", file=sys.stderr)
            
            self.server = None
        
        self.is_running = False
        
        print("[HTTP Server] Stopped", file=sys.stderr)
        
        return {"success": True, "message": "HTTP server stopped"}
    
    def get_status(self) -> Dict[str, Any]:
        """Retourne le statut du serveur"""
        return {
            "running": self.is_running,
            "port": self.server.server_port if self.server else None
        }
