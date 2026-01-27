# Features

Chaque sous-dossier représente une fonctionnalité isolée (chat, models, permissions, remote-access, monitoring, settings, licensing, repo-analyzer, onboarding, layout…).

- Composants UI dans `components/`, logique dans `hooks/`, appels externes dans `services/`, types dans `types/`, tests co-localisés.
- Nommer les services `*.service.ts` ou `*.client.ts` (IPC).
- Si une feature dépend d'une autre, documenter le contrat dans son README.
