use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tokio::sync::{mpsc, Mutex, oneshot};
use tokio::time::{timeout, Duration};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize)]
struct PyRequest {
    id: String,
    cmd: String,
    payload: Value,
}

#[derive(Deserialize, Debug, Clone)]
struct PyResponse {
    id: String,
    status: String,
    data: Option<Value>,
    error: Option<Value>,
}

pub struct PythonBridge<R: Runtime> {
    tx_command: mpsc::Sender<String>,
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<PyResponse>>>>,
    #[allow(dead_code)]
    app_handle: AppHandle<R>,
    // ✅ Channel pour signaler l'arrêt du worker
    shutdown_tx: mpsc::Sender<()>,
}

impl<R: Runtime> PythonBridge<R> {
    pub fn new(app: &AppHandle<R>) -> Self {
        let (tx_command, mut rx_command) = mpsc::channel::<String>(100);
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        let pending: Arc<Mutex<HashMap<String, oneshot::Sender<PyResponse>>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let pending_reader = pending.clone();
        let app_emit = app.clone();

        // ==========================================================
        // DÉMARRAGE DU WORKER (SIDECAR OU DEV MODE)
        // ==========================================================
        // En mode DEV: utilise python ../worker/main.py
        // En mode BUILD: utilise le sidecar backend.exe compilé
        
        #[cfg(debug_assertions)]
        let (mut rx_sidecar, mut child) = {
            #[cfg(windows)]
            let primary_cmd = "pythonw";
            #[cfg(not(windows))]
            let primary_cmd = "python";

            let spawn_primary = app
                .shell()
                .command(primary_cmd)
                .args(["../worker/main.py"])
                .spawn();

            #[cfg(windows)]
            let spawn_primary = spawn_primary.or_else(|_| {
                app.shell()
                    .command("python")
                    .args(["../worker/main.py"])
                    .spawn()
            });

            spawn_primary.expect("Failed to spawn python worker. Check if python is in PATH.")
        };
        
        #[cfg(not(debug_assertions))]
        let (mut rx_sidecar, mut child) = app
            .shell()
            .sidecar("backend")
            .expect("Failed to create sidecar command")
            .spawn()
            .expect("Failed to spawn backend sidecar");

        // ==============================
        // LECTURE STDOUT PYTHON
        // ==============================
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx_sidecar.recv().await {
                match event {
                    CommandEvent::Stdout(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);

                        for line in text.lines() {
                            let trimmed = line.trim();
                            if trimmed.is_empty() {
                                continue;
                            }

                            // Tentative de parsing JSON
                            if let Ok(val) = serde_json::from_str::<Value>(trimmed) {

                                // CAS 1: Événement de Stream (Tokens IA)
                                if val.get("event").is_some() {
                                    let _ = app_emit.emit("python-stream", val);
                                    continue;
                                }

                                // CAS 2: Réponse classique (RPC)
                                let val_clone = val.clone();

                                if let Ok(resp) = serde_json::from_value::<PyResponse>(val_clone) {
                                    let mut map = pending_reader.lock().await;
                                    
                                    if let Some(tx) = map.remove(&resp.id) {
                                        let _ = tx.send(resp);
                                    } else {
                                        // Cas B : Message "Push" (ex: Monitoring stats)
                                        let _ = app_emit.emit("python-push", val);
                                    }
                                    continue;
                                }
                            }

                            // LOGS: Si ce n'est pas du JSON, on l'affiche comme log classique
                            println!("Python Log: {}", trimmed);
                        }
                    }

                    CommandEvent::Stderr(bytes) => {
                        let err = String::from_utf8_lossy(&bytes);
                        eprintln!("Python STDERR: {}", err);
                    }

                    _ => {}
                }
            }
        });

        // ==============================
        // ÉCRITURE STDIN PYTHON + GESTION SHUTDOWN
        // ==============================
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::select! {
                    // Recevoir une commande à envoyer au worker
                    Some(msg) = rx_command.recv() => {
                        if let Err(e) = child.write(format!("{}\n", msg).as_bytes()) {
                            eprintln!("Failed to write to python worker: {}", e);
                        }
                    }
                    // Recevoir le signal de shutdown
                    _ = shutdown_rx.recv() => {
                        println!("🛑 Shutting down Python worker...");
                        // Envoyer une commande shutdown au worker Python
                        let shutdown_cmd = r#"{"id":"shutdown","cmd":"shutdown","payload":{}}"#;
                        let _ = child.write(format!("{}\n", shutdown_cmd).as_bytes());
                        
                        // Attendre un peu que le worker se termine proprement
                        tokio::time::sleep(Duration::from_millis(500)).await;
                        
                        // Forcer la fermeture si nécessaire (kill le process)
                        let _ = child.kill();
                        println!("✅ Python worker terminated");
                        break;
                    }
                }
            }
        });

        Self {
            tx_command,
            pending,
            app_handle: app.clone(),
            shutdown_tx,
        }
    }

    pub async fn send(&self, cmd: String, payload: Value) -> Result<Value, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let (tx, rx) = oneshot::channel();

        {
            let mut map = self.pending.lock().await;
            map.insert(id.clone(), tx);
        }

        let req = PyRequest { id: id.clone(), cmd: cmd.clone(), payload };
        let req_json = serde_json::to_string(&req).map_err(|e| e.to_string())?;

        self.tx_command
            .send(req_json)
            .await
            .map_err(|_| "Worker channel closed")?;

        // ✅ Timeout de 30 secondes pour éviter les freeze UI si le worker crash
        match timeout(Duration::from_secs(30), rx).await {
            Ok(Ok(resp)) => {
                if resp.status == "ok" {
                    Ok(resp.data.unwrap_or(Value::Null))
                } else {
                    Err(resp
                        .error
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "Unknown worker error".into()))
                }
            }
            Ok(Err(_)) => Err("Worker crashed or request lost".into()),
            Err(_) => {
                // ✅ AMÉLIORATION V2.1 : Timeout avec feedback utilisateur
                // 1. Logger la tentative pour debugging
                eprintln!("[BRIDGE ERROR] Request timeout for command: {}", cmd);
                
                // 2. Émettre événement vers frontend pour notification utilisateur
                let timeout_event = serde_json::json!({
                    "cmd": cmd,
                    "timeout_secs": 30,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                    "request_id": id
                });
                
                let _ = self.app_handle.emit("worker-timeout", timeout_event);
                
                // 3. Nettoyer la map des requêtes en attente pour éviter les fuites mémoire
                let mut map = self.pending.lock().await;
                map.remove(&id);
                
                // 4. Retourner une erreur détaillée
                Err(format!("Request timeout: Python worker did not respond to '{}' within 30 seconds", cmd))
            }
        }
    }

    /// ✅ Méthode pour arrêter proprement le worker Python
    pub async fn shutdown(&self) {
        let _ = self.shutdown_tx.send(()).await;
    }
}

// ✅ Implémentation de Drop pour fermeture automatique
impl<R: Runtime> Drop for PythonBridge<R> {
    fn drop(&mut self) {
        // Envoyer le signal de shutdown de manière bloquante
        // Note: Dans un contexte async, utiliser shutdown() directement est préférable
        let tx = self.shutdown_tx.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let _ = tx.send(()).await;
            });
        });
    }
}
