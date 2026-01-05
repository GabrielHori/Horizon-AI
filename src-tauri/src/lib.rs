mod python_bridge;
mod ollama_installer;

use python_bridge::PythonBridge;
use tauri::{Manager, Wry, AppHandle};
use serde_json::Value;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init()) 
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // --- LOGIQUE DE L'AUDIT ---
            // On ne lance plus le sidecar ici manuellement avec .sidecar("backend").spawn()
            // car cela crée un premier processus Python orphelin.
            // C'est le PythonBridge::new() qui va s'en charger de manière encapsulée.

            // Initialisation unique du Bridge
            // Le bridge va démarrer le sidecar une seule fois à l'intérieur de son constructeur
            let bridge = PythonBridge::<Wry>::new(&app.handle());
            
            // On enregistre l'état pour que call_python puisse y accéder
            app.manage(bridge); 
            
            #[cfg(debug_assertions)]
            println!("🚀 Horizon AI: Système de communication initialisé (Single Instance)");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            call_python,
            check_ollama_installed,
            install_ollama,
            start_ollama
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Horizon AI");
}
