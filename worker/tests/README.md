# Tests Horizon AI V2

## Structure des tests

### Phase 1 - Sécurité & Fondations
- `test_audit_service.py` : Tests pour le service d'audit trail
- `test_prompt_builder.py` : Tests pour le prompt builder avec versioning
- `test_crypto_service.py` : Tests pour le service de chiffrement
- `test_e2e_workflow.py` : Tests E2E pour workflow complet

### Phase 2 - Features Core V2
- `test_memory_service.py` : Tests pour la mémoire locale intelligente (user/project/session)
- `test_repo_analyzer_service.py` : Tests pour l'analyse de repository avec sandbox

## Installation

```bash
pip install pytest
```

## Exécution

```bash
# Tous les tests
pytest worker/tests/ -v

# Un fichier spécifique
pytest worker/tests/test_audit_service.py -v

# Avec couverture
pytest worker/tests/ --cov=worker/services --cov-report=html
```

## Notes

- Les tests utilisent des dossiers temporaires pour éviter de polluer les données réelles
- Les tests sont isolés (setup/teardown pour chaque test)
- Les tests vérifient à la fois le fonctionnement et la sécurité
