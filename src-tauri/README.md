# Tauri / Rust Shell

- `main.rs` lance l'application, `lib.rs` enregistre les commandes.
- `commands/` : commandes exposées au front (context, permission, licensing, python_bridge).
- `services/` : gestion fenêtre, ollama installer, bridge Python.
- `licensing/` : logique licence (store/verify/device/commands).
- Build : `npm run tauri:build`
- Debug : `RUST_LOG=debug npm run tauri dev`
