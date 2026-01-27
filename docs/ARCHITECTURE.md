# Architecture

## Vue d’ensemble
Horizon AI combine : frontend React (Vite) + shell Tauri (Rust) + worker Python (PyInstaller) + moteur Ollama. La communication front → Tauri se fait via commandes Tauri, Tauri → Python via IPC (stdin/stdout JSON), Python → Ollama via HTTP local.

```
[React UI] --(tauri commands)--> [Rust shell] --(stdin/stdout JSON)--> [Python worker] --(HTTP)--> [Ollama]
       ^                               |                                   |
       |                               v                                   v
   Assets/UI                      window mgmt                       Filesystem/Models
```

## Responsabilités
- Frontend : UI, navigation, collecte des inputs, affichage des états (chat, modèles, monitoring, permissions, remote access).
- Tauri/Rust : orchestration desktop, gestion fenêtre, pont Python, installation Ollama, commandes système, licensing.
- Worker Python : logique métier (chat history, repo analyzer, prompts, monitoring, tunnels), validation entrée, garde-permission, persistance locale.
- Ollama : exécution modèles.

## Flux IPC (simplifié)
1. Front appelle une commande Tauri (ex. `python_bridge::call`).
2. Rust sérialise et envoie la requête au worker via stdin.
3. Worker route via `ipc.dispatcher`, valide (`permission_guard`, `input_validator`), appelle un service métier.
4. Réponse JSON remonte à Rust puis au front.

## Dossiers clés (cible)
- `src/app` : bootstrap, router, providers.
- `src/features` : UX/logic par fonctionnalité.
- `src/shared` : primitives transverses.
- `src-tauri/src` : commandes Rust, services système, licensing.
- `worker` : services Python, IPC, tests.
- `public` : assets statiques pour Vite/Tauri.
