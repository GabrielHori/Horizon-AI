import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function requestWorker(cmd, payload = {}) {
  try {
    const response = await invoke("call_python", { cmd, payload });

    if (!response) {
      console.warn(`[Bridge] Empty response for command: ${cmd}`);
      return null;
    }

    // Rust peut renvoyer string JSON
    if (typeof response === "string") {
      try {
        return JSON.parse(response);
      } catch {
        return { value: response };
      }
    }

    // Rust peut renvoyer déjà un objet
    if (typeof response === "object") {
      return response;
    }

    return null;
  } catch (error) {
    console.error(`[Bridge Error] Command: ${cmd}`, error);
    return null;
  }
}

// ====== SINGLETON STREAM LISTENER ======
// Évite les listeners multiples qui causent la duplication des tokens
let streamListenerSetup = false;
let streamCallbacks = new Set();
let streamUnlisten = null;

export async function setupStreamListener(onChunk) {
  // Ajouter le callback à la liste
  streamCallbacks.add(onChunk);

  // Si le listener global n'est pas encore configuré, le configurer
  if (!streamListenerSetup) {
    streamListenerSetup = true;
    
    streamUnlisten = await listen("python-stream", (event) => {
      if (!event?.payload) return;

      let data = event.payload;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {}
      }

      // Notifier tous les callbacks enregistrés
      streamCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error("[Bridge] Stream callback error:", e);
        }
      });
    });
  }

  // Retourner une fonction pour supprimer CE callback spécifique
  return () => {
    streamCallbacks.delete(onChunk);
  };
}

// ====== SINGLETON PUSH LISTENER ======
let pushListenerSetup = false;
let pushCallbacks = new Set();
let pushUnlisten = null;

export async function setupPushListener(onData) {
  pushCallbacks.add(onData);

  if (!pushListenerSetup) {
    pushListenerSetup = true;
    
    pushUnlisten = await listen("python-push", (event) => {
      if (!event?.payload) return;
      
      pushCallbacks.forEach(callback => {
        try {
          callback(event.payload);
        } catch (e) {
          console.error("[Bridge] Push callback error:", e);
        }
      });
    });
  }

  return () => {
    pushCallbacks.delete(onData);
  };
}
