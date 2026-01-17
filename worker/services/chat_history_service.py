import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

# Import crypto service pour chiffrement optionnel
try:
    from services.crypto_service import CryptoService
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    CryptoService = None

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
        
        # Service de chiffrement (optionnel)
        self.crypto_service: Optional[CryptoService] = None
        if CRYPTO_AVAILABLE:
            try:
                self.crypto_service = CryptoService()
            except Exception:
                pass  # CryptoService non disponible, continuer sans chiffrement
    
    def set_crypto_password(self, password: str) -> bool:
        """
        Configure le mot de passe pour le chiffrement des conversations
        
        Args:
            password: Mot de passe utilisateur
            
        Returns:
            True si configuré avec succès
        """
        if not self.crypto_service:
            return False
        
        try:
            return self.crypto_service.set_password(password)
        except Exception:
            return False

    def list_conversations(self):
        """
        Récupère la liste de tous les chats (ID, titre, modèle).
        
        V2: Gère les conversations chiffrées et non chiffrées.
        """
        files = [f for f in os.listdir(self.storage_path) if f.endswith('.json')]
        history = []
        for filename in files:
            try:
                file_path = os.path.join(self.storage_path, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Détecter si chiffré
                is_encrypted = content.startswith("ENC:")
                
                if is_encrypted:
                    if not self.crypto_service or not self.crypto_service._master_key:
                        # Ne pas afficher les conversations chiffrées si pas de clé
                        continue
                    
                    try:
                        encrypted_data = content[4:]
                        decrypted = self.crypto_service.decrypt_string(encrypted_data)
                        data = json.loads(decrypted)
                    except Exception as e:
                        # Erreur de déchiffrement, ignorer cette conversation
                        print(f"[ChatHistoryService] Error decrypting conversation {filename}: {e}", file=sys.stderr)
                        continue
                else:
                    data = json.loads(content) if content.strip() else {}
                
                history.append({
                    "id": data.get('id', filename.replace('.json', '')), 
                    "title": data.get('title', 'Sans titre'),
                    "model": data.get('model', None),
                    "projectId": data.get('projectId'),  # V2.1 : Lien projet
                    "created_at": data.get('created_at', ''),
                    "updated_at": data.get('updated_at', ''),
                    "message_count": len(data.get('messages', []) or []),
                    "encrypted": is_encrypted
                })
            except Exception as e:
                # Ignorer les fichiers corrompus
                print(f"[ChatHistoryService] Error reading conversation {filename}: {e}", file=sys.stderr)
                continue
        
        # Trier par date de création (plus récent en premier)
        return sorted(history, key=lambda x: x.get('updated_at') or x.get('created_at') or '', reverse=True)

    def get_messages(self, chat_id):
        """
        Charge les messages d'une conversation précise.
        
        V2: Déchiffre automatiquement si le fichier est chiffré.
        """
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        if not os.path.exists(path):
            return []
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Détecter si chiffré (préfixe "ENC:")
            if content.startswith("ENC:"):
                if not self.crypto_service or not self.crypto_service._master_key:
                    # Pas de clé, on ne peut pas déchiffrer
                    print(f"[ChatHistoryService] Warning: Conversation {chat_id} is encrypted but master key not set", file=sys.stderr)
                    return []
                
                try:
                    encrypted_data = content[4:]  # Enlever "ENC:"
                    decrypted = self.crypto_service.decrypt_string(encrypted_data)
                    data = json.loads(decrypted)
                    return data.get('messages', [])
                except Exception as e:
                    print(f"[ChatHistoryService] Error decrypting conversation {chat_id}: {e}", file=sys.stderr)
                    return []
            else:
                # Données en clair
                data = json.loads(content) if content.strip() else {}
                return data.get('messages', [])
        except Exception as e:
            print(f"[ChatHistoryService] Error reading conversation {chat_id}: {e}", file=sys.stderr)
            return []

    def save_message(self, chat_id, role, content, model=None, encrypt=False, project_id=None):
        """
        Sauvegarde un nouveau message.
        
        V2: Support chiffrement optionnel avec AES-256-GCM.
        V2.1: Support project_id pour lier la conversation à un projet.
        
        Args:
            chat_id: ID de la conversation
            role: Rôle du message ("user" ou "assistant")
            content: Contenu du message
            model: Modèle utilisé (optionnel)
            encrypt: Si True, chiffre la conversation (nécessite crypto_service avec master key)
            project_id: ID du projet lié (V2.1, optionnel)
        
        Returns:
            chat_id: ID de la conversation
        """
        if not chat_id: chat_id = str(uuid.uuid4())
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        
        data = {
            "id": chat_id, 
            "title": content[:30] if role == "user" else "New Chat",
            "model": model,
            "projectId": project_id,  # V2.1 : Lien projet
            "messages": [],
            "created_at": datetime.now().isoformat()
        }
        
        # Charger les données existantes (déchiffrer si nécessaire)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                
                # Détecter si chiffré
                if file_content.startswith("ENC:"):
                    if not self.crypto_service or not self.crypto_service._master_key:
                        print(f"[ChatHistoryService] Warning: Cannot decrypt existing conversation {chat_id}. Master key not set.", file=sys.stderr)
                        # Créer une nouvelle conversation
                    else:
                        try:
                            encrypted_data = file_content[4:]
                            decrypted = self.crypto_service.decrypt_string(encrypted_data)
                            data = json.loads(decrypted)
                            encrypt = True  # Conserver le chiffrement si déjà chiffré
                        except Exception as e:
                            print(f"[ChatHistoryService] Error decrypting conversation {chat_id}: {e}", file=sys.stderr)
                            # Créer une nouvelle conversation
                else:
                    data = json.loads(file_content) if file_content.strip() else data
            except Exception as e:
                print(f"[ChatHistoryService] Error reading conversation {chat_id}: {e}", file=sys.stderr)
        
        # Mettre à jour le modèle si fourni
        if model and not data.get('model'):
            data['model'] = model
        
        # Mettre à jour projectId si fourni (V2.1)
        if project_id is not None:
            data['projectId'] = project_id
        
        # Mettre à jour le titre avec le premier message utilisateur
        if role == "user" and (not data.get('title') or data['title'] == "New Chat"):
            data['title'] = content[:40] + ("..." if len(content) > 40 else "")
        
        data['messages'].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        data['updated_at'] = datetime.now().isoformat()
        
        # Sauvegarder (chiffrer si demandé et possible)
        json_data = json.dumps(data, indent=4, ensure_ascii=False)
        
        if encrypt and self.crypto_service and self.crypto_service._master_key:
            try:
                # Chiffrer avec AES-256-GCM
                encrypted = self.crypto_service.encrypt_string(json_data)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write("ENC:" + encrypted)
            except Exception as e:
                print(f"[ChatHistoryService] Error encrypting conversation {chat_id}: {e}. Saving unencrypted.", file=sys.stderr)
                # En cas d'erreur, sauvegarder en clair
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4)
        else:
            # Sauvegarder en clair
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
    
    def get_conversation_count_by_project(self, project_id: str) -> int:
        """
        Compte le nombre de conversations liées à un projet (V2.1)
        
        Args:
            project_id: UUID du projet
            
        Returns:
            Nombre de conversations liées à ce projet
        """
        try:
            conversations = self.list_conversations()
            count = sum(1 for conv in conversations if conv.get('projectId') == project_id)
            return count
        except Exception as e:
            print(f"[ChatHistoryService] Error counting conversations for project {project_id}: {e}", file=sys.stderr)
            return 0
    
    def list_conversations_by_project(self, project_id: str):
        """
        Liste toutes les conversations d'un projet (V2.1)
        
        Args:
            project_id: UUID du projet
            
        Returns:
            Liste des conversations filtrées par project_id
        """
        try:
            all_conversations = self.list_conversations()
            return [conv for conv in all_conversations if conv.get('projectId') == project_id]
        except Exception as e:
            print(f"[ChatHistoryService] Error listing conversations for project {project_id}: {e}", file=sys.stderr)
            return []
    
    def update_conversation_project(self, chat_id: str, project_id: Optional[str]) -> bool:
        """
        Met à jour le projectId d'une conversation (V2.1)
        
        Args:
            chat_id: ID de la conversation
            project_id: Nouveau projectId (None pour retirer le lien)
            
        Returns:
            True si mis à jour, False sinon
        """
        path = os.path.join(self.storage_path, f"{chat_id}.json")
        if not os.path.exists(path):
            return False
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Détecter si chiffré
            is_encrypted = content.startswith("ENC:")
            if is_encrypted:
                if not self.crypto_service or not self.crypto_service._master_key:
                    return False
                encrypted_data = content[4:]
                decrypted = self.crypto_service.decrypt_string(encrypted_data)
                data = json.loads(decrypted)
                should_encrypt = True
            else:
                data = json.loads(content) if content.strip() else {}
                should_encrypt = False
            
            # Mettre à jour projectId
            data['projectId'] = project_id
            data['updated_at'] = datetime.now().isoformat()
            
            # Sauvegarder
            json_data = json.dumps(data, indent=4, ensure_ascii=False)
            
            if should_encrypt and self.crypto_service and self.crypto_service._master_key:
                encrypted = self.crypto_service.encrypt_string(json_data)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write("ENC:" + encrypted)
            else:
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4)
            
            return True
        except Exception as e:
            print(f"[ChatHistoryService] Error updating conversation project: {e}", file=sys.stderr)
            return False

chat_history_service = ChatHistoryService()
