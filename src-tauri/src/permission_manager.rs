use std::collections::HashMap;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Runtime, Emitter, Manager};
use chrono::{Utc, DateTime, Duration};
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::sync::{Mutex, Arc};

/// Permissions supportées
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    FileRead,
    FileWrite,
    CommandExecute,
    NetworkAccess,
    RemoteAccess,
    MemoryAccess,
    RepoAnalyze,  // V2.1 Phase 3 : Nouvelle permission pour analyse repository
}

/// Scope d'une permission (V2.1 Phase 3)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PermissionScope {
    Temporary { duration_minutes: i64 },  // Temporaire avec durée en minutes
    Session,  // Cette session uniquement
    Project { project_id: String },  // Ce projet uniquement
    Global,  // Globale (toujours active jusqu'à révocation explicite)
}

/// Entrée de permission avec métadonnées (V2.1 Phase 3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionEntry {
    pub permission: Permission,
    pub scope: PermissionScope,
    pub granted_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,  // None si scope = Session ou Global
    pub context: String,
    pub project_id: Option<String>,  // Pour isolation par projet
}

/// Log d'audit (V2.1 Phase 3 : Avec scope et projectId)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionLog {
    pub timestamp: DateTime<Utc>,
    pub permission: Permission,
    pub granted: bool,
    pub context: String,
    pub user_action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,  // V2.1 Phase 3 : Scope de la permission
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,  // V2.1 Phase 3 : ProjectId si scope = Project
}

/// Gestionnaire central (V2.1 Phase 3 : Support permissions temporaires par scope)
pub struct PermissionManager<R: Runtime> {
    // V2.1 Phase 3 : HashMap pour gérer plusieurs entrées par permission (scope, projet, etc.)
    // Clé : Permission, Valeur : Liste des entrées actives (avec scope, expiration, etc.)
    granted_permissions: HashMap<Permission, Vec<PermissionEntry>>,
    audit_logs: Vec<PermissionLog>,
    app_handle: AppHandle<R>,
    log_file: Arc<Mutex<File>>,
    parano_mode: bool, // Mode parano : permissions toujours explicites
}

/// Handle async SAFE
#[derive(Clone)]
pub struct PermissionAsyncHandle<R: Runtime> {
    app_handle: AppHandle<R>,
    log_file: Arc<Mutex<File>>,
}

impl<R: Runtime> PermissionManager<R> {
    pub fn new(app_handle: &AppHandle<R>) -> Result<Self, String> {
        let log_dir = app_handle
            .path()
            .app_log_dir()
            .map_err(|e| e.to_string())?;

        std::fs::create_dir_all(&log_dir)
            .map_err(|e| e.to_string())?;

        let log_path = log_dir.join("permission_audit.log");

        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .map_err(|e| e.to_string())?;

        Ok(Self {
            granted_permissions: HashMap::new(),  // V2.1 Phase 3 : HashMap au lieu de HashSet
            audit_logs: Vec::new(),
            app_handle: app_handle.clone(),
            log_file: Arc::new(Mutex::new(file)),
            parano_mode: true, // Mode parano activé par défaut
        })
    }

    /// Handle async à utiliser hors Mutex
    pub fn async_handle(&self) -> PermissionAsyncHandle<R> {
        PermissionAsyncHandle {
            app_handle: self.app_handle.clone(),
            log_file: self.log_file.clone(),
        }
    }

    /// Prépare une permission avec scope (V2.1 Phase 3)
    pub fn prepare_permission_with_scope(
        &mut self,
        permission: Permission,
        context: &str,
        granted: bool,
        scope: PermissionScope,
        project_id: Option<String>,
    ) -> PermissionLog {
        let now = Utc::now();
        
        if granted {
            // Calculer l'expiration selon le scope
            let expires_at = match &scope {
                PermissionScope::Temporary { duration_minutes } => {
                    Some(now + Duration::minutes(*duration_minutes))
                },
                PermissionScope::Session => {
                    // Expiration à la fermeture de l'app (géré par nettoyage au démarrage)
                    None  // Session = jusqu'à redémarrage, donc pas d'expiration automatique
                },
                PermissionScope::Project { .. } => {
                    None  // Projet = jusqu'à révocation explicite
                },
                PermissionScope::Global => {
                    None  // Global = jusqu'à révocation explicite
                },
            };
            
            // Créer l'entrée de permission
            let entry = PermissionEntry {
                permission: permission.clone(),
                scope: scope.clone(),
                granted_at: now,
                expires_at,
                context: context.to_string(),
                project_id: project_id.clone(),
            };
            
            // Ajouter à la HashMap
            self.granted_permissions
                .entry(permission.clone())
                .or_insert_with(Vec::new)
                .push(entry);
        }

        let scope_str = match &scope {
            PermissionScope::Temporary { duration_minutes } => {
                Some(format!("temporary:{}min", duration_minutes))
            },
            PermissionScope::Session => Some("session".to_string()),
            PermissionScope::Project { project_id } => {
                Some(format!("project:{}", project_id))
            },
            PermissionScope::Global => Some("global".to_string()),
        };

        let log = PermissionLog {
            timestamp: now,
            permission,
            granted,
            context: context.to_string(),
            user_action: if granted {
                "User granted permission".into()
            } else {
                "User denied permission".into()
            },
            scope: scope_str.clone(),
            project_id,
        };

        self.audit_logs.push(log.clone());
        log
    }

    /// Prépare une permission (méthode legacy, utilise Global scope)
    pub fn prepare_permission(
        &mut self,
        permission: Permission,
        context: &str,
        granted: bool,
    ) -> PermissionLog {
        // V2.1 Phase 3 : Utiliser prepare_permission_with_scope avec scope Global
        self.prepare_permission_with_scope(
            permission,
            context,
            granted,
            PermissionScope::Global,
            None,
        )
    }

    /// Vérifie si une permission est accordée (V2.1 Phase 3 : Avec vérification scope + expiration)
    pub fn has_permission(&self, permission: &Permission) -> bool {
        self.has_permission_with_context(permission, None, None)
    }

    /// Vérifie si une permission est accordée avec contexte (V2.1 Phase 3 : Scope + ProjectId)
    pub fn has_permission_with_context(
        &self,
        permission: &Permission,
        project_id: Option<&str>,
        scope_filter: Option<&PermissionScope>,
    ) -> bool {
        if let Some(entries) = self.granted_permissions.get(permission) {
            let now = Utc::now();
            
            // Filtrer les entrées actives (non expirées)
            for entry in entries {
                // Vérifier expiration
                if let Some(expires_at) = entry.expires_at {
                    if now > expires_at {
                        continue; // Permission expirée
                    }
                }
                
                // Vérifier scope si filter fourni
                if let Some(filter) = scope_filter {
                    if &entry.scope != filter {
                        continue; // Scope différent
                    }
                }
                
                // Vérifier isolation par projet si project_id fourni
                if let Some(pid) = project_id {
                    match &entry.scope {
                        PermissionScope::Project { project_id: entry_pid } => {
                            if entry_pid != pid {
                                continue; // Projet différent
                            }
                        },
                        PermissionScope::Global | PermissionScope::Session | PermissionScope::Temporary { .. } => {
                            // Global/Session/Temporary s'appliquent à tous les projets
                        },
                    }
                }
                
                // Permission active trouvée
                return true;
            }
        }
        
        false
    }

    /// Retire une permission (pour expiration ou révocation) (V2.1 Phase 3)
    pub fn revoke_permission(&mut self, permission: &Permission, project_id: Option<&str>) -> bool {
        if let Some(entries) = self.granted_permissions.get_mut(permission) {
            let initial_len = entries.len();
            
            // Retirer les entrées correspondantes
            if let Some(pid) = project_id {
                // Retirer seulement les entrées du projet spécifié
                entries.retain(|e| {
                    match &e.scope {
                        PermissionScope::Project { project_id: entry_pid } => entry_pid != pid,
                        _ => true,  // Garder Global/Session/Temporary
                    }
                });
            } else {
                // Retirer toutes les entrées
                entries.clear();
            }
            
            let removed = initial_len > entries.len();
            
            // Si plus d'entrées, retirer la clé
            if entries.is_empty() {
                self.granted_permissions.remove(permission);
            }
            
            return removed;
        }
        
        false
    }

    /// Nettoie les permissions expirées (appelé périodiquement) (V2.1 Phase 3)
    pub fn cleanup_expired_permissions(&mut self) -> usize {
        let now = Utc::now();
        let mut cleaned_count = 0;
        
        // Nettoyer les entrées expirées
        for (_permission, entries) in self.granted_permissions.iter_mut() {
            entries.retain(|entry| {
                if let Some(expires_at) = entry.expires_at {
                    if now > expires_at {
                        cleaned_count += 1;
                        return false;  // Retirer entrée expirée
                    }
                }
                true  // Garder entrée active
            });
        }
        
        // Retirer les permissions sans entrées actives
        self.granted_permissions.retain(|_, entries| !entries.is_empty());
        
        cleaned_count
    }

    pub fn get_audit_logs(&self) -> Vec<PermissionLog> {
        self.audit_logs.clone()
    }

    pub fn clear_audit_logs(&mut self) -> Result<(), String> {
        let file = self.log_file.lock().map_err(|e| e.to_string())?;
        file.set_len(0).map_err(|e| e.to_string())?;
        self.audit_logs.clear();
        Ok(())
    }

    pub fn export_audit_logs(&self, path: PathBuf) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&self.audit_logs)
            .map_err(|e| e.to_string())?;
        std::fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Active/désactive le mode parano
    pub fn set_parano_mode(&mut self, enabled: bool) {
        self.parano_mode = enabled;
    }

    /// Vérifie si le mode parano est activé
    pub fn is_parano_mode(&self) -> bool {
        self.parano_mode
    }

    /// V2.1 Phase 3 : Vérifie et consomme la permission avec contexte (scope + projectId)
    pub fn check_and_consume_permission_with_context(
        &mut self,
        permission: &Permission,
        context: &str,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        // Nettoyer les permissions expirées avant vérification
        self.cleanup_expired_permissions();
        
        // Vérifier si permission accordée avec le bon contexte
        if !self.has_permission_with_context(permission, project_id, None) {
            return Err(format!(
                "Permission {:?} is required for: {}{}",
                permission,
                context,
                project_id.map(|pid| format!(" (project: {})", pid)).unwrap_or_default()
            ));
        }

        // En mode parano, consommer la permission (expire après usage)
        if self.parano_mode {
            // Retirer seulement l'entrée correspondante au contexte (projectId)
            self.revoke_permission(permission, project_id);
            
            let log = PermissionLog {
                timestamp: Utc::now(),
                permission: permission.clone(),
                granted: false,
                context: context.to_string(),
                user_action: "Permission consumed (parano mode)".into(),
                scope: project_id.map(|pid| format!("project:{}", pid)),
                project_id: project_id.map(String::from),
            };
            self.audit_logs.push(log.clone());
            // Ne pas logger dans le fichier ici car c'est une consommation interne
        }

        Ok(())
    }

    /// En mode parano, vérifie et consomme la permission (expire après usage)
    /// En mode normal, vérifie seulement
    /// V2.1 Phase 3 : Utilise maintenant check_and_consume_permission_with_context
    pub fn check_and_consume_permission(
        &mut self,
        permission: &Permission,
        context: &str,
    ) -> Result<(), String> {
        // V2.1 Phase 3 : Sans contexte projet (scope Global/Session)
        self.check_and_consume_permission_with_context(permission, context, None)
    }
}

impl<R: Runtime> PermissionAsyncHandle<R> {
    pub async fn write_log(&self, log: PermissionLog) -> Result<(), String> {
        let json = serde_json::to_string(&log)
            .map_err(|e| e.to_string())?;

        let mut file = self.log_file.lock()
            .map_err(|e| e.to_string())?;

        writeln!(file, "{}", json)
            .map_err(|e| e.to_string())?;

        self.app_handle
            .emit("permission-log", log)
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
