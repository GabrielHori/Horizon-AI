# Horizon AI

Assistant IA local (React/Vite + Tauri/Rust + worker Python). 100% local, aucune donnee envoyee.

![Horizon AI Icon](src-tauri/icons/app-icon.png)

## Fonctionnalites cles
- Chat local avec modeles Ollama (streaming, historique, multi-modeles)
- Gestion de modeles (installation/suppression), monitoring systeme, onboarding
- Remote access via tunnel securise (token + rate limiting)
- Gestion des permissions, licensing, notifications de securite

## Installation rapide (Windows)
- Telecharger l'installer : [Releases](https://github.com/GabrielHori/Horizon-AI/releases/latest)
- L'installer gere : installation app + Ollama + modele par defaut (~2GB)

## Documentation
- Index : `docs/README.md`
- Architecture : `docs/ARCHITECTURE.md`
- Developpement : `docs/DEVELOPMENT.md`
- Contribuer : `docs/CONTRIBUTING.md`
- Troubleshooting : `docs/TROUBLESHOOTING.md`
- README locaux : `src/README.md`, `src/features/README.md`, `src-tauri/README.md`, `worker/README.md`

## Architecture (resume)
React UI -> commandes Tauri (Rust) -> worker Python via stdin/stdout JSON -> Ollama (HTTP local). Tauri gere la fenetre, l'installation Ollama et le bridge Python; le worker porte la logique metier (chat history, repo analyzer, monitoring, tunnels, permissions).

## Project Structure (cible)
```
horizon-ai/
- docs/         # Documentation du projet
- public/       # Assets statiques
- src/          # Frontend React/Vite
  - app/        # bootstrap, router, providers, styles
  - features/   # code par fonctionnalite (chat, models, permissions, remote-access, monitoring, settings, licensing, repo-analyzer, onboarding, layout)
  - shared/     # composants/utilitaires communs
- src-tauri/    # Shell desktop Tauri/Rust, commandes et licensing
- worker/       # Worker Python (services, IPC, tests)
- screenshots/  # Captures d'ecran
```

## Developpement
```bash
# Dependances
npm install
python -m venv .venv && .venv/Scripts/activate
pip install -r worker/requirements.txt

# Dev
npm run tauri dev        # front + tauri + worker
npm run vite-dev         # front seul

# Build
python -m PyInstaller --clean worker/backend.spec
copy dist/backend.exe src-tauri/binaries/backend-x86_64-pc-windows-msvc.exe
npm run tauri:build
```

## Tests
```bash
npm run lint             # ESLint
pytest worker/tests      # Python
cargo check              # Rust
```

## Troubleshooting (express)
- Ollama ne repond pas : verifier `OLLAMA_HOST`, redemarrer Ollama, voir `worker/services/ollama_service.py`.
- Build Tauri casse : verifier binaire backend dans `src-tauri/binaries/`, relancer `cargo check`.
- Performance UI : activer `shouldReduceMotion` pour couper les animations.

## License
MIT License - voir `LICENSE`.
