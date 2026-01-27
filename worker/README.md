# Worker Python

Traitements backend (chat history, repo analyzer, tunnels, permissions).

- Entrée principale : `main.py`
- IPC : `ipc/dispatcher.py`, `permission_guard.py`
- Services métier : `services/`
- Utilitaires : `utils/` (path/file validators, rate limiter)
- Tests : `tests/` (`pytest`)
- Build : `python -m PyInstaller --clean worker/backend.spec`
- Style : Ruff/Black recommandés, imports relatifs courts (`from services.repo_analyzer_service import ...`).
