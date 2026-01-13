use tauri::{Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl, Emitter};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatWindowInfo {
    pub window_id: String,
    pub chat_id: Option<String>,
    pub model: Option<String>,
    pub title: String,
}

/// Crée une nouvelle fenêtre de chat détachée
#[tauri::command]
pub async fn create_chat_window(
    app: tauri::AppHandle,
    chat_id: Option<String>,
    model: Option<String>,
) -> Result<ChatWindowInfo, String> {
    let window_id = format!("chat_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    
    let title = if let Some(m) = &model {
        format!("Chat - {}", m)
    } else {
        "Nouveau Chat".to_string()
    };

    let window = WebviewWindowBuilder::new(
        &app,
        &window_id,
        WebviewUrl::App("index.html".into())
    )
    .title(&title)
    .inner_size(1000.0, 750.0)
    .min_inner_size(500.0, 400.0)
    .max_inner_size(1920.0, 1080.0)
    .decorations(true)
    .resizable(true)
    .transparent(false)
    .center()
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    // Envoyer les données initiales à la fenêtre
    window.emit("chat-window-init", serde_json::json!({
        "chat_id": chat_id,
        "model": model,
        "window_id": window_id.clone()
    }))
    .map_err(|e| format!("Failed to emit init event: {}", e))?;

    Ok(ChatWindowInfo {
        window_id: window_id.clone(),
        chat_id,
        model,
        title,
    })
}

/// Liste toutes les fenêtres de chat ouvertes
#[tauri::command]
pub async fn list_chat_windows(app: tauri::AppHandle) -> Result<Vec<ChatWindowInfo>, String> {
    let windows = app.webview_windows();
    let mut chat_windows = Vec::new();

    for (label, _window) in windows {
        if label.starts_with("chat_") {
            if let Some(window) = app.get_webview_window(&label) {
                let title = window.title().unwrap_or_default();
                chat_windows.push(ChatWindowInfo {
                    window_id: label.clone(),
                    chat_id: None, // À récupérer depuis les métadonnées si nécessaire
                    model: None,
                    title,
                });
            }
        }
    }

    Ok(chat_windows)
}

/// Ferme une fenêtre de chat spécifique
#[tauri::command]
pub async fn close_chat_window(
    app: tauri::AppHandle,
    window_id: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
        Ok(())
    } else {
        Err(format!("Window {} not found", window_id))
    }
}

/// Met à jour le titre d'une fenêtre de chat
#[tauri::command]
pub async fn update_chat_window_title(
    window: WebviewWindow,
    title: String,
) -> Result<(), String> {
    window.set_title(&title).map_err(|e| format!("Failed to update title: {}", e))?;
    Ok(())
}

/// Déplace une fenêtre vers un écran spécifique (par index)
#[tauri::command]
pub async fn move_window_to_screen(
    window: WebviewWindow,
    _screen_index: usize,
) -> Result<(), String> {
    // Tauri 2.0 n'a pas encore d'API directe pour déplacer vers un écran spécifique
    // On peut utiliser les coordonnées pour positionner la fenêtre
    // Cette fonctionnalité nécessiterait des plugins supplémentaires ou des APIs système
    
    // Pour l'instant, on peut juste centrer la fenêtre
    if let Some(monitor) = window.current_monitor().ok().flatten() {
        let size = monitor.size();
        let scale_factor = monitor.scale_factor();
        let physical_size = window.inner_size().unwrap_or_default();
        
        let x = (size.width as f64 / scale_factor - physical_size.width as f64) / 2.0;
        let y = (size.height as f64 / scale_factor - physical_size.height as f64) / 2.0;
        
        window.set_position(tauri::LogicalPosition::new(x, y))
            .map_err(|e| format!("Failed to position window: {}", e))?;
    }
    
    Ok(())
}

/// Obtient les informations sur tous les écrans disponibles
#[tauri::command]
pub async fn get_available_screens(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let mut screens = Vec::new();
    
    if let Some(window) = app.get_webview_window("main") {
        if let Some(monitors) = window.available_monitors().ok() {
            for (index, monitor) in monitors.iter().enumerate() {
                screens.push(serde_json::json!({
                    "index": index,
                    "name": monitor.name().map(|s| s.clone()).unwrap_or_else(|| format!("Screen {}", index)),
                    "size": {
                        "width": monitor.size().width,
                        "height": monitor.size().height
                    },
                    "scale_factor": monitor.scale_factor(),
                    "position": {
                        "x": monitor.position().x,
                        "y": monitor.position().y
                    }
                }));
            }
        }
    }
    
    Ok(screens)
}
