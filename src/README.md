# Frontend (src)

Frontend React/Vite. Organisation cible : feature-first sous `features`, primitives sous `shared`, bootstrap dans `app`.

- Ajouter une feature : `src/features/<feature>/{components,hooks,services,types,tests}` + README local si complexe.
- Utiliser des alias (`@app`, `@features`, `@shared`) quand ils seront configurés.
- Co-localiser les tests `*.test.tsx` dans le dossier de la feature.
