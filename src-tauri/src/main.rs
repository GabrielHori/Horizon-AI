// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}

mod python_bridge;

use python_bridge::PythonBridge;
use tauri::{Manager, Wry};
use serde_json::Value;

#[tauri::command]
async fn call_python(
    state: tauri::State<'_, PythonBridge<Wry>>,
    cmd: String,
    payload: Value
) -> Result<Value, String> {
    // On délègue tout au bridge. Il génère l'ID, envoie à Python et attend la réponse.
    state.send(cmd, payload).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugins globaux (nécessaires pour que python_bridge.rs fonctionne correctement)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // --- 1. LANCEMENT DU SIDECAR (SUPPRIMÉ ICI) ---
            // Attention : NE PAS relancer le sidecar ici.
            // C'est PythonBridge::new() qui s'en charge dans python_bridge.rs.

            // --- 2. INITIALISATION DU BRIDGE ---
            // Cette étape lance le Python Worker et connecte les canaux
            let bridge = PythonBridge::<Wry>::new(app.handle());
            
            // On rend le bridge accessible aux commandes Tauri via le State
            app.manage(bridge);

            println!("🚀 Horizon AI: Backend et Bridge initialisés correctement.");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![call_python])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Horizon AI");
}