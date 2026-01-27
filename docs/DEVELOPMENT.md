# Développement

## Prérequis
- Node 18+, Rust stable, Python 3.11+, Ollama installé/local.
- `npm install`
- `python -m venv .venv && .venv/Scripts/activate` puis `pip install -r worker/requirements.txt`

## Lancer en dev
```bash
npm run tauri dev      # front + tauri + worker (sidecar configuré)
npm run vite-dev       # front seul si besoin
```

## Build
```bash
# Worker
python -m PyInstaller --clean worker/backend.spec
copy dist/backend.exe src-tauri/binaries/backend-x86_64-pc-windows-msvc.exe

# App desktop
npm run tauri:build
```

## Tests
```bash
npm run lint           # ESLint
pytest worker/tests    # Python
cargo check            # Rust
```
(ajouter `npm test` quand les tests front seront en place)

## Debugging
- Front : DevTools + `console.debug`.
- Tauri : `RUST_LOG=debug npm run tauri dev`.
- Python : lancer `python worker/main.py --debug` si option ou `PYTHONBREAKPOINT=1`.
- IPC : activer logs dans `worker/ipc/dispatcher.py` et `src-tauri/src/python_bridge.rs`.

## Structure de code (cible)
Suivre la séparation `app / features / shared`. Ajouter toute nouvelle feature dans `src/features/<feature>` avec README court et tests co-localisés.
