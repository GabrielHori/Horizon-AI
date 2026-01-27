# Troubleshooting

## Ollama ne répond pas
- Vérifier `OLLAMA_HOST` (par défaut http://localhost:11434).
- Redémarrer le service Ollama, relancer l'app.
- Logs : `worker/services/ollama_service.py`.

## Python worker échoue
- Activer le venv `.venv`.
- `pytest worker/tests -q` pour voir les erreurs.
- Vérifier les chemins dans `backend.spec` après refacto.

## Tauri build échoue
- Nettoyer `src-tauri/target` si build cassé.
- S'assurer que `src-tauri/binaries/backend-*.exe` existe.
- `cargo check` pour diagnostiquer.

## Performance UI
- Activer `shouldReduceMotion` (hook partagé) pour désactiver animations.
- Vérifier qu'aucun rendu lourd n'est dans la boucle principale (utiliser memoization).

## Remote access / Tunnel
- Vérifier dépendances Cloudflare si utilisées dans `tunnel_service.py`.
- Contrôler pare-feu local et token d'auth.
