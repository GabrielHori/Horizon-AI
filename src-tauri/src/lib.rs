mod python_bridge;
mod ollama_installer;
mod permission_manager;
mod permission_commands;
mod context_reader;
mod context_reader_commands;
mod window_manager;

use python_bridge::PythonBridge;
use tauri::{Manager, Wry, AppHandle, RunEvent};
use serde_json::Value;
use std::process::Command;
use std::sync::Mutex;
use permission_manager::PermissionManager;
use context_reader::ContextReader;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Flag pour masquer la fenêtre CMD sur Windows
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
async fn call_python(
    state: tauri::State<'_, PythonBridge<Wry>>, 
    cmd: String,
    payload: Value
) -> Result<Value, String> {
    state.send(cmd, payload).await
}

/// Vérifie si Ollama est installé
#[tauri::command]
fn check_ollama_installed() -> bool {
    ollama_installer::is_ollama_installed()
}

/// Installe Ollama automatiquement
#[tauri::command]
async fn install_ollama(app: AppHandle<Wry>) -> Result<(), String> {
    ollama_installer::download_and_install_ollama(&app).await
}

/// Démarre le service Ollama
#[tauri::command]
fn start_ollama() -> Result<(), String> {
    ollama_installer::start_ollama_service()
}

// ========================================
// COMMANDES DE FENÊTRE PERSONNALISÉES
// ========================================

/// Minimise la fenêtre
#[tauri::command]
async fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Maximise ou restaure la fenêtre
#[tauri::command]
async fn toggle_maximize(window: tauri::Window) -> Result<bool, String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

/// Ferme la fenêtre (et l'application)
#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Vérifie si la fenêtre est maximisée
#[tauri::command]
fn is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

/// Arrête le processus Ollama
fn stop_ollama() {
    #[cfg(windows)]
    {
        // Sur Windows, utiliser taskkill pour arrêter ollama.exe silencieusement
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        // Aussi arrêter ollama_llama_server si présent
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "ollama_llama_server.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    
    #[cfg(not(windows))]
    {
        let _ = Command::new("pkill")
            .arg("ollama")
            .output();
    }
    
    #[cfg(debug_assertions)]
    println!("🛑 Ollama: Service arrêté");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init()) 
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // --- 1. INITIALISATION DU PERMISSION MANAGER ---
            let mut permission_manager = PermissionManager::<Wry>::new(&app.handle())
                .expect("Failed to initialize PermissionManager");

            // V2.1 Phase 3 : Nettoyer les permissions expirées au démarrage
            let cleaned = permission_manager.cleanup_expired_permissions();
            if cleaned > 0 {
                #[cfg(debug_assertions)]
                println!("🧹 V2.1 Phase 3 : {} permission(s) expirée(s) nettoyée(s) au démarrage", cleaned);
            }

            // --- 2. INITIALISATION DU CONTEXT READER ---
            let context_reader = ContextReader::<Wry>::new(&app.handle());

            // --- 3. INITIALISATION DU BRIDGE ---
            // Cette étape lance le Python Worker et connecte les canaux
            let bridge = PythonBridge::<Wry>::new(&app.handle());

            // On rend le bridge, le permission manager et le context reader accessibles aux commandes Tauri via le State
            app.manage(bridge);
            app.manage(Mutex::new(permission_manager));
            app.manage(Mutex::new(context_reader));

            // ✅ DÉMARRER OLLAMA AU LANCEMENT (si installé)
            if ollama_installer::is_ollama_installed() {
                #[cfg(debug_assertions)]
                println!("🚀 Ollama: Démarrage automatique...");
                
                let _ = ollama_installer::start_ollama_service();
            }
            
            #[cfg(debug_assertions)]
            println!("🚀 Horizon AI: Backend, Bridge et PermissionManager initialisés correctement.");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            call_python,
            check_ollama_installed,
            install_ollama,
            start_ollama,
            minimize_window,
            toggle_maximize,
            close_window,
            is_maximized,
            permission_commands::request_permission,
            permission_commands::request_permission_with_scope,  // V2.1 Phase 3 : Nouvelle commande avec scope
            permission_commands::has_permission,
            permission_commands::has_permission_with_context,  // V2.1 Phase 3 : Vérification avec contexte (projectId)
            permission_commands::get_permission_logs,
            permission_commands::clear_permission_logs,
            permission_commands::export_permission_logs,
            permission_commands::get_parano_mode,
            permission_commands::set_parano_mode,
            context_reader_commands::read_file,
            context_reader_commands::read_multiple_files,
            context_reader_commands::read_file_confirmed,
            context_reader_commands::scan_directory,
            context_reader_commands::get_context_config,
            context_reader_commands::set_context_scope,
            context_reader_commands::get_file_preview,
            context_reader_commands::update_context_config,
            context_reader_commands::add_allowed_extension,
            context_reader_commands::remove_allowed_extension,
            window_manager::create_chat_window,
            window_manager::list_chat_windows,
            window_manager::close_chat_window,
            window_manager::update_chat_window_title,
            window_manager::move_window_to_screen,
            window_manager::get_available_screens
        ])
        .build(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Horizon AI");
    
    // ✅ GESTION DES ÉVÉNEMENTS DE FERMETURE
    app.run(|_app_handle, event| {
        match event {
            RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                #[cfg(debug_assertions)]
                println!("🛑 Horizon AI: Fermeture en cours...");
                
                // Arrêter Ollama proprement à la fermeture
                stop_ollama();
            }
            _ => {}
        }
    });
}
