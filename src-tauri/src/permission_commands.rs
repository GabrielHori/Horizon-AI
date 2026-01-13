use tauri::{State, Wry};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::permission_manager::{PermissionManager, Permission, PermissionLog, PermissionScope};

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
) -> Result<bool, String> {
    // V2.1 Phase 3 : Utiliser request_permission_with_scope avec scope Global
    request_permission_with_scope(
        state,
        permission,
        context,
        "global".to_string(),  // Scope par défaut = Global
        None,  // duration_minutes (non utilisé pour Global)
        None,  // project_id (non utilisé pour Global)
    ).await
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
) -> Result<bool, String> {
    let permission_enum = parse_permission(&permission)?;

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
    let (log, async_handle) = {
        let mut manager = state.lock().map_err(|e| e.to_string())?;

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
    async_handle.write_log(log).await?;

    Ok(true)
}

#[tauri::command]
pub async fn has_permission(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
) -> Result<bool, String> {
    let permission_enum = parse_permission(&permission)?;
    // Nettoyer les permissions expirées avant vérification
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.cleanup_expired_permissions();
    Ok(manager.has_permission(&permission_enum))
}

/// V2.1 Phase 3 : Vérifie une permission avec contexte (projectId pour isolation par projet)
#[tauri::command]
pub async fn has_permission_with_context(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    permission: String,
    project_id: Option<String>,
) -> Result<bool, String> {
    let permission_enum = parse_permission(&permission)?;
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    // Nettoyer les permissions expirées avant vérification
    manager.cleanup_expired_permissions();
    Ok(manager.has_permission_with_context(
        &permission_enum,
        project_id.as_deref(),
        None
    ))
}

#[tauri::command]
pub async fn get_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<Vec<PermissionLog>, String> {
    let manager = state.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_audit_logs())
}

#[tauri::command]
pub async fn clear_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.clear_audit_logs()
}

#[tauri::command]
pub async fn export_permission_logs(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    path: String,
) -> Result<(), String> {
    let manager = state.lock().map_err(|e| e.to_string())?;
    manager.export_audit_logs(PathBuf::from(path))
}

/// Récupère l'état du mode parano
#[tauri::command]
pub async fn get_parano_mode(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
) -> Result<bool, String> {
    let manager = state.lock().map_err(|e| e.to_string())?;
    Ok(manager.is_parano_mode())
}

/// Active/désactive le mode parano
#[tauri::command]
pub async fn set_parano_mode(
    state: State<'_, Mutex<PermissionManager<Wry>>>,
    enabled: bool,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.set_parano_mode(enabled);
    Ok(())
}
