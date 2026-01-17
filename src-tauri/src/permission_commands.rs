use tauri::{State, Wry};
use std::sync::Mutex;
use std::path::PathBuf;
use serde_json;
use crate::permission_manager::{PermissionManager, Permission, PermissionScope};

fn parse_permission(permission: &str) -> Result<Permission, String> {
    match permission {
        "FileRead" => Ok(Permission::FileRead),
        "FileWrite" => Ok(Permission::FileWrite),
        "CommandExecute" => Ok(Permission::CommandExecute),
        "NetworkAccess" => Ok(Permission::NetworkAccess),
        "RemoteAccess" => Ok(Permission::RemoteAccess),
        "MemoryAccess" => Ok(Permission::MemoryAccess),
        "RepoAnalyze" => Ok(Permission::RepoAnalyze),  // V2.1 Phase 3 : Nouvelle permission
        _ => Err(format!("Unknown permission: {}", permission)),
    }
}

/// Commande legacy : request_permission sans scope (utilise Global)
#[tauri::command]
pub async fn request_permission(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
    context: String,
    _reason: String,
) -> Result<serde_json::Value, String> {
    // V2.1 Phase 3 : Utiliser request_permission_with_scope avec scope Global
    match request_permission_with_scope(
        state,
        permission,
        context.clone(),
        "global".to_string(),  // Scope par défaut = Global
        None,  // duration_minutes (non utilisé pour Global)
        None,  // project_id (non utilisé pour Global)
    ).await {
        Ok(result) => Ok(result),
        Err(err) => Ok(serde_json::json!({
            "error": true,
            "code": "PERMISSION_REQUEST_ERROR",
            "message": err,
            "context": context
        })),
    }
}

/// V2.1 Phase 3 : Commande avec support scope (temporaire/session/project)
#[tauri::command]
pub async fn request_permission_with_scope(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
    context: String,
    scope: String,  // "temporary", "session", "project", "global"
    duration_minutes: Option<i64>,  // Pour scope "temporary"
    project_id: Option<String>,  // Pour scope "project"
) -> Result<serde_json::Value, String> {
    // Parse permission
    let permission_enum = match parse_permission(&permission) {
        Ok(perm) => perm,
        Err(err) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "INVALID_PERMISSION",
                "message": err,
                "permission": permission,
                "context": context
            }));
        }
    };

    // Parser le scope (cloner project_id si nécessaire)
    let project_id_for_scope = project_id.clone();
    let permission_scope = match scope.as_str() {
        "temporary" => {
            let duration = duration_minutes.unwrap_or(60);  // Défaut: 60 minutes
            PermissionScope::Temporary { duration_minutes: duration }
        },
        "session" => PermissionScope::Session,
        "project" => {
            let pid = project_id_for_scope.ok_or_else(|| "project_id required for project scope".to_string())?;
            PermissionScope::Project { project_id: pid }
        },
        "global" | _ => PermissionScope::Global,
    };

    // 🔒 lock court
    let result = {
        let mut manager = match state.lock() {
            Ok(guard) => guard,
            Err(e) => {
                return Ok(serde_json::json!({
                    "error": true,
                    "code": "MUTEX_LOCK_ERROR",
                    "message": format!("Failed to acquire lock: {}", e),
                    "context": context
                }));
            }
        };

        // Nettoyer les permissions expirées avant d'ajouter une nouvelle
        manager.cleanup_expired_permissions();

        // En mode parano, toujours demander explicitement (pas d'auto-grant)
        // L'utilisateur doit accorder via l'UI (déjà fait avant l'appel de cette commande)
        let granted = true;  // Si cette commande est appelée, c'est que l'utilisateur a confirmé via UI

        let log = manager.prepare_permission_with_scope(
            permission_enum.clone(),
            &context,
            granted,
            permission_scope,
            project_id.clone(),  // Cloner ici aussi pour le log
        );

        (log, manager.async_handle())
    };

    // 🔓 mutex libéré ici
    match result.1.write_log(result.0).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "permission": permission,
            "scope": scope,
            "project_id": project_id,
            "context": context
        })),
        Err(err) => Ok(serde_json::json!({
            "error": true,
            "code": "LOG_WRITE_ERROR",
            "message": format!("Failed to write permission log: {}", err),
            "context": context
        })),
    }
}

#[tauri::command]
pub async fn has_permission(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
) -> Result<serde_json::Value, String> {
    let permission_enum = match parse_permission(&permission) {
        Ok(perm) => perm,
        Err(err) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "INVALID_PERMISSION",
                "message": err,
                "permission": permission
            }));
        }
    };

    let mut manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
                "permission": permission
            }));
        }
    };

    // Nettoyer les permissions expirées avant vérification
    manager.cleanup_expired_permissions();
    let has_perm = manager.has_permission(&permission_enum);

    Ok(serde_json::json!({
        "success": true,
        "has_permission": has_perm,
        "permission": permission
    }))
}

/// V2.1 Phase 3 : Vérifie une permission avec contexte (projectId pour isolation par projet)
#[tauri::command]
pub async fn has_permission_with_context(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
    project_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let permission_enum = match parse_permission(&permission) {
        Ok(perm) => perm,
        Err(err) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "INVALID_PERMISSION",
                "message": err,
                "permission": permission,
                "project_id": project_id
            }));
        }
    };

    let mut manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
                "permission": permission,
                "project_id": project_id
            }));
        }
    };

    // Nettoyer les permissions expirées avant vérification
    manager.cleanup_expired_permissions();
    let has_perm = manager.has_permission_with_context(
        &permission_enum,
        project_id.as_deref(),
        None
    );

    Ok(serde_json::json!({
        "success": true,
        "has_permission": has_perm,
        "permission": permission,
        "project_id": project_id
    }))
}

#[tauri::command]
pub async fn get_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<serde_json::Value, String> {
    let manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
            }));
        }
    };

    Ok(serde_json::json!({
        "success": true,
        "logs": manager.get_audit_logs()
    }))
}

#[tauri::command]
pub async fn clear_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<serde_json::Value, String> {
    let mut manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
            }));
        }
    };

    match manager.clear_audit_logs() {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Permission logs cleared successfully"
        })),
        Err(err) => Ok(serde_json::json!({
            "error": true,
            "code": "CLEAR_LOGS_ERROR",
            "message": format!("Failed to clear permission logs: {}", err),
        })),
    }
}

#[tauri::command]
pub async fn export_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    path: String,
) -> Result<serde_json::Value, String> {
    let manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
            }));
        }
    };

    match manager.export_audit_logs(PathBuf::from(path.clone())) {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Permission logs exported successfully",
            "path": path
        })),
        Err(err) => Ok(serde_json::json!({
            "error": true,
            "code": "EXPORT_LOGS_ERROR",
            "message": format!("Failed to export permission logs: {}", err),
            "path": path
        })),
    }
}

/// Récupère l'état du mode parano
#[tauri::command]
pub async fn get_parano_mode(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<serde_json::Value, String> {
    let manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
            }));
        }
    };

    Ok(serde_json::json!({
        "success": true,
        "parano_mode": manager.is_parano_mode()
    }))
}

/// Active/désactive le mode parano
#[tauri::command]
pub async fn set_parano_mode(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    enabled: bool,
) -> Result<serde_json::Value, String> {
    let mut manager = match state.lock() {
        Ok(guard) => guard,
        Err(e) => {
            return Ok(serde_json::json!({
                "error": true,
                "code": "MUTEX_LOCK_ERROR",
                "message": format!("Failed to acquire lock: {}", e),
            }));
        }
    };

    manager.set_parano_mode(enabled);
    Ok(serde_json::json!({
        "success": true,
        "parano_mode": enabled,
        "message": if enabled {
            "Parano mode enabled successfully"
        } else {
            "Parano mode disabled successfully"
        }
    }))
}
