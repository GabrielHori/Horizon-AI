# Contribuer

## Branches / PR
- `main` protégé. Travaillez sur `feat/<sujet>` ou `fix/<bug>`.
- PR petites, atomiques, description claire et checklist (lint/tests/doc).

## Style
- Dossiers kebab-case, composants PascalCase, hooks `useX`.
- Services suffixés `.service.ts` ou `.client.ts` (IPC).
- Tests co-localisés `*.test.ts(x)` / `*.test.py`.
- ESLint/Prettier pour JS/TS, Ruff/Black pour Python, `cargo fmt` pour Rust.

## Validation avant merge
- `npm run lint`
- `pytest worker/tests`
- `cargo check`
- (optionnel) `npm run build`

## Revues
- Mentionner les zones touchées (front/tauri/worker).
- Ajouter ou mettre à jour la doc/README locale si vous créez un dossier.
