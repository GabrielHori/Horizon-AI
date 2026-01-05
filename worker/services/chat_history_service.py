import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

class ChatHistoryService:
    def __init__(self, storage_path=None):
        # ✅ Utiliser AppData pour le stockage (évite les problèmes de permissions)
        if storage_path is None:
            if getattr(sys, 'frozen', False):
                # Mode PyInstaller : utiliser AppData pour les données utilisateur
                appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
                if appdata:
                    base_dir = Path(appdata) / "HorizonAI"
                else:
                    # Fallback: dossier utilisateur
                    base_dir = Path.home() / ".horizon-ai"
            else:
                # Mode développement : remonter depuis services/ vers la racine du projet
                base_dir = Path(__file__).resolve().parent.parent.parent
            
            storage_path = base_dir / "data" / "history"
        
        self.storage_path = Path(storage_path)
        if not self.storage_path.exists():
            self.storage_path.mkdir(parents=True, exist_ok=True)

    def list_conversations(self):
        """Récupère la liste de tous les chats (ID, titre, modèle)."""
        files = [f for f in os.listdir(self.storage_path) if f.endswith('.json')]
        history = []
        for f in files:
            try:
                with open(os.path.join(self.storage_path, f), 'r', encoding='utf-8') as j:
                    data = json.load(j)
                    history.append({
                        "id": data['id'], 
                        "title": data.get('title', 'Sans titre'),
                        "model": data.get('model', None),
                        "created_at": data.get('created_at', '')
                    })
            except: continue
        # Trier par date de création (plus récent en premier)
        return sorted(history, key=lambda x: x.get('created_at', ''), reverse=True)

    def get_messages(self, chat_id):
        """Charge les messages d'une conversation précise."""
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f).get('messages', [])
        return []

    def save_message(self, chat_id, role, content, model=None):
        """Sauvegarde un nouveau message."""
        if not chat_id: chat_id = str(uuid.uuid4())
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        
        data = {
            "id": chat_id, 
            "title": content[:30] if role == "user" else "New Chat",
            "model": model,
            "messages": [],
            "created_at": datetime.now().isoformat()
        }
        
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # Mettre à jour le modèle si fourni
        if model and not data.get('model'):
            data['model'] = model
        
        # Mettre à jour le titre avec le premier message utilisateur
        if role == "user" and (not data.get('title') or data['title'] == "New Chat"):
            data['title'] = content[:40] + ("..." if len(content) > 40 else "")
        
        data['messages'].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return chat_id

    def delete_conversation(self, chat_id):
        """Supprime une conversation."""
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        if os.path.exists(path):
            os.remove(path)
            return {"status": "success", "message": f"Conversation {chat_id} deleted"}
        return {"status": "error", "message": "Conversation not found"}

chat_history_service = ChatHistoryService()
