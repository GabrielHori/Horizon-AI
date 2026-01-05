use std::process::Command;
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Runtime, Emitter};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Constante pour cacher la fenêtre sur Windows
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Vérifie si Ollama est installé sur le système
pub fn is_ollama_installed() -> bool {
    // Méthode 1: Vérifier si la commande ollama existe
    #[cfg(windows)]
    let result = Command::new("ollama")
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    #[cfg(not(windows))]
    let result = Command::new("ollama")
        .arg("--version")
        .output();
    
    if result.is_ok() {
        return true;
    }
    
    // Méthode 2: Vérifier les chemins d'installation courants sur Windows
    let common_paths = [
        r"C:\Program Files\Ollama\ollama.exe",
        r"C:\Users\Public\Ollama\ollama.exe",
    ];
    
    for path in common_paths {
        if PathBuf::from(path).exists() {
            return true;
        }
    }
    
    // Méthode 3: Vérifier dans AppData Local
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let ollama_path = PathBuf::from(&local_app_data).join("Programs").join("Ollama").join("ollama.exe");
        if ollama_path.exists() {
            return true;
        }
    }
    
    false
}

/// Télécharge et installe Ollama
pub async fn download_and_install_ollama<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let download_url = "https://ollama.com/download/OllamaSetup.exe";
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("OllamaSetup.exe");
    
    // Émettre un événement pour informer le frontend
    let _ = app.emit("ollama-install-status", serde_json::json!({
        "status": "downloading",
        "message": "Downloading Ollama..."
    }));
    
    // Télécharger l'installeur
    match download_file(download_url, &installer_path).await {
        Ok(_) => {
            let _ = app.emit("ollama-install-status", serde_json::json!({
                "status": "installing",
                "message": "Installing Ollama..."
            }));
        }
        Err(e) => {
            let _ = app.emit("ollama-install-status", serde_json::json!({
                "status": "error",
                "message": format!("Download failed: {}", e)
            }));
            return Err(format!("Failed to download Ollama: {}", e));
        }
    }
    
    // Exécuter l'installeur silencieusement
    // Note: OllamaSetup.exe supporte /S pour installation silencieuse
    let install_result = Command::new(&installer_path)
        .arg("/S")  // Silent install
        .status();
    
    // Nettoyer le fichier temporaire
    let _ = fs::remove_file(&installer_path);
    
    match install_result {
        Ok(status) if status.success() => {
            let _ = app.emit("ollama-install-status", serde_json::json!({
                "status": "success",
                "message": "Ollama installed successfully!"
            }));
            
            // Démarrer le service Ollama
            let _ = Command::new("ollama")
                .arg("serve")
                .spawn();
            
            Ok(())
        }
        Ok(_) => {
            let _ = app.emit("ollama-install-status", serde_json::json!({
                "status": "error",
                "message": "Installation failed"
            }));
            Err("Ollama installation failed".into())
        }
        Err(e) => {
            let _ = app.emit("ollama-install-status", serde_json::json!({
                "status": "error",
                "message": format!("Failed to run installer: {}", e)
            }));
            Err(format!("Failed to run Ollama installer: {}", e))
        }
    }
}

/// Télécharge un fichier depuis une URL
async fn download_file(url: &str, destination: &PathBuf) -> Result<(), String> {
    // Utiliser reqwest pour le téléchargement
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    fs::write(destination, bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

/// Vérifie si le service Ollama est en cours d'exécution
pub fn is_ollama_running() -> bool {
    // Essayer de se connecter à l'API Ollama via reqwest (plus simple que curl)
    // On utilise une version synchrone simple
    #[cfg(windows)]
    let result = Command::new("curl")
        .args(["-s", "-o", "nul", "-w", "%{http_code}", "http://localhost:11434/api/tags"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    #[cfg(not(windows))]
    let result = Command::new("curl")
        .args(["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:11434/api/tags"])
        .output();
    
    if let Ok(output) = result {
        let status = String::from_utf8_lossy(&output.stdout);
        return status.trim() == "200";
    }
    false
}

/// Démarre le service Ollama s'il n'est pas déjà en cours
pub fn start_ollama_service() -> Result<(), String> {
    if is_ollama_running() {
        return Ok(());
    }
    
    #[cfg(windows)]
    let spawn_result = Command::new("ollama")
        .arg("serve")
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
    
    #[cfg(not(windows))]
    let spawn_result = Command::new("ollama")
        .arg("serve")
        .spawn();
    
    spawn_result.map_err(|e| format!("Failed to start Ollama: {}", e))?;
    
    // Attendre un peu que le service démarre
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    Ok(())
}
