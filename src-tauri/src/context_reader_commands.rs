use tauri::{State, AppHandle, Wry};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::context_reader::{ContextReader, FileContent, ContextReaderConfig};
use crate::permission_manager::{PermissionManager, Permission};

/// Helper pour vérifier la permission (sans auto-grant)
/// En mode parano, la permission doit être explicitement accordée via l'UI
async fn ensure_permission(
    permission_state: &State<'_, Mutex<PermissionManager<Wry>>>,
    permission: Permission,
    context: &str,
) -> Result<(), String> {
    let mut manager = permission_state.lock().map_err(|e| e.to_string())?;
    
    // Vérifier si la permission existe
    if !manager.has_permission(&permission) {
        return Err(format!(
            "Permission {:?} is required for: {}. Please grant it via the Permission Manager UI.",
            permission, context
        ));
    }
    
    // En mode parano, consommer la permission (expire après usage)
    manager.check_and_consume_permission(&permission, context)?;
    
    Ok(())
}

#[tauri::command]
pub async fn read_file(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    permission_state: State<'_, Mutex<PermissionManager<Wry>>>,
    app: AppHandle<Wry>,
    file_path: String,
) -> Result<FileContent, String> {
    // Vérifier la permission de lecture
    ensure_permission(&permission_state, Permission::FileRead, &format!("Reading file: {}", file_path)).await?;

    let path = PathBuf::from(file_path);
    // Cloner le config avant le lock pour éviter de garder le MutexGuard pendant await
    let config = {
        let context_reader = context_state.lock().map_err(|e| e.to_string())?;
        context_reader.get_config()
    };
    
    // Créer un ContextReader temporaire avec la config clonée pour la validation
    let mut temp_reader = ContextReader::<Wry>::new(&app);
    temp_reader.update_config(config);
    
    temp_reader.read_file_with_permission(path).await
}

#[tauri::command]
pub async fn read_multiple_files(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    permission_state: State<'_, Mutex<PermissionManager<Wry>>>,
    app: AppHandle<Wry>,
    file_paths: Vec<String>,
) -> Result<Vec<FileContent>, String> {
    // Vérifier la permission de lecture
    let paths_str = file_paths.join(", ");
    ensure_permission(&permission_state, Permission::FileRead, &format!("Reading multiple files: {}", paths_str)).await?;

    let paths: Vec<PathBuf> = file_paths.into_iter().map(PathBuf::from).collect();
    let config = {
        let context_reader = context_state.lock().map_err(|e| e.to_string())?;
        context_reader.get_config()
    };
    
    let mut temp_reader = ContextReader::<Wry>::new(&app);
    temp_reader.update_config(config);
    
    temp_reader.read_multiple_files(paths).await
}

#[tauri::command]
pub async fn scan_directory(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    permission_state: State<'_, Mutex<PermissionManager<Wry>>>,
    directory_path: String,
    recursive: bool,
) -> Result<Vec<String>, String> {
    // Vérifier la permission de lecture pour scanner le dossier
    ensure_permission(&permission_state, Permission::FileRead, &format!("Scanning directory: {}", directory_path)).await?;

    let path = PathBuf::from(directory_path);
    let context_reader = context_state.lock().map_err(|e| e.to_string())?;

    let files = context_reader.scan_directory(&path, recursive)?;

    // Convert PathBuf to String for serialization
    Ok(files.into_iter().map(|p| p.to_string_lossy().into_owned()).collect())
}

#[tauri::command]
pub async fn get_context_config(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
) -> Result<ContextReaderConfig, String> {
    // La lecture de la config ne nécessite pas de permission
    let context_reader = context_state.lock().map_err(|e| e.to_string())?;
    Ok(context_reader.get_config())
}

#[tauri::command]
pub async fn set_context_scope(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    scope_path: String,
) -> Result<(), String> {
    // Le changement de scope ne nécessite pas de permission (c'est une configuration)
    let path = PathBuf::from(scope_path);
    let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
    context_reader.set_scope(path)
}

#[tauri::command]
pub async fn get_file_preview(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    app: AppHandle<Wry>,
    file_path: String,
    max_lines: Option<usize>,
) -> Result<serde_json::Value, String> {
    // Preview ne nécessite PAS de permission (toujours autorisé pour sécurité)
    // C'est une lecture partielle et limitée

    let path = PathBuf::from(file_path.clone());
    let max = max_lines.unwrap_or(50);
    
    let (config, confirmation_token) = {
        let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
        let config = context_reader.get_config();
        // Générer un token de confirmation
        let token = context_reader.generate_confirmation_token(&path);
        (config, token)
    };
    
    let mut temp_reader = ContextReader::<Wry>::new(&app);
    temp_reader.update_config(config);
    
    // Utiliser la nouvelle méthode qui lit seulement les premières lignes
    let preview = temp_reader.get_file_preview(path, max)?;
    
    // Retourner preview + token
    Ok(serde_json::json!({
        "preview": preview,
        "confirmation_token": confirmation_token
    }))
}

/// Lit un fichier complet après confirmation (nécessite permission + token)
#[tauri::command]
pub async fn read_file_confirmed(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    permission_state: State<'_, Mutex<PermissionManager<Wry>>>,
    app: AppHandle<Wry>,
    file_path: String,
    confirmation_token: String,
) -> Result<FileContent, String> {
    // 1. Vérifier la permission
    ensure_permission(
        &permission_state,
        Permission::FileRead,
        &format!("Reading file: {}", file_path),
    ).await?;

    let path = PathBuf::from(file_path.clone());
    
    // 2. Valider le token de confirmation
    {
        let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
        if !context_reader.validate_confirmation_token(&path, &confirmation_token) {
            return Err("Invalid or expired confirmation token. Please preview the file first.".to_string());
        }
    }
    
    // 3. Lire le fichier complet
    let config = {
        let context_reader = context_state.lock().map_err(|e| e.to_string())?;
        context_reader.get_config()
    };
    
    let mut temp_reader = ContextReader::<Wry>::new(&app);
    temp_reader.update_config(config);
    
    temp_reader.read_file_with_permission(path).await
}

#[tauri::command]
pub async fn update_context_config(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    new_config: ContextReaderConfig,
) -> Result<(), String> {
    // La mise à jour de la config ne nécessite pas de permission (c'est une configuration)
    let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
    context_reader.update_config(new_config);
    Ok(())
}

#[tauri::command]
pub async fn add_allowed_extension(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    extension: String,
) -> Result<(), String> {
    // L'ajout d'extension autorisée ne nécessite pas de permission (c'est une configuration)
    let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
    context_reader.add_allowed_extension(extension);
    Ok(())
}

#[tauri::command]
pub async fn remove_allowed_extension(
    context_state: State<'_, Mutex<ContextReader<Wry>>>,
    extension: String,
) -> Result<(), String> {
    // La suppression d'extension autorisée ne nécessite pas de permission (c'est une configuration)
    let mut context_reader = context_state.lock().map_err(|e| e.to_string())?;
    context_reader.remove_allowed_extension(&extension);
    Ok(())
}