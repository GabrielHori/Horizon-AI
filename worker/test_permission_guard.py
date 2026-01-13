"""
Tests de validation PermissionGuard
====================================
Script simple pour valider le comportement du permission_guard
"""

import sys
from pathlib import Path

# Ajouter le dossier worker au path
worker_dir = Path(__file__).parent
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

from ipc.permission_guard import permission_guard

def test_permission_guard():
    """Tests du garde de permissions"""
    
    print("=== TESTS PERMISSION GUARD ===\n")
    
    # Test 1 : Commande toujours autorisée (whitelist)
    print("Test 1 : Commande whitelistée (list_conversations)")
    allowed, error = permission_guard.check("list_conversations", {})
    print(f"  Résultat: {'✅ ALLOWED' if allowed else '❌ DENIED'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    # Test 2 : Commande sensible nécessitant permission
    print("Test 2 : Commande sensible (analyze_repository)")
    allowed, error = permission_guard.check("analyze_repository", {})
    print(f"  Résultat: {'✅ ALLOWED' if allowed else '❌ DENIED'}")
    if error:
        print(f"  Erreur: {error}")
    required_perm = permission_guard.get_required_permission("analyze_repository")
    print(f"  Permission requise: {required_perm}")
    print()
    
    # Test 3 : Commande non listée (autorisée par défaut)
    print("Test 3 : Commande non listée (custom_command)")
    allowed, error = permission_guard.check("custom_command", {})
    print(f"  Résultat: {'✅ ALLOWED' if allowed else '❌ DENIED'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    # Test 4 : Vérifier sensibilité commande
    print("Test 4 : Vérification sensibilité")
    commands_to_test = ["list_models", "analyze_repository", "tunnel_start", "memory_save"]
    for cmd in commands_to_test:
        is_sensitive = permission_guard.is_sensitive_command(cmd)
        perm = permission_guard.get_required_permission(cmd)
        print(f"  {cmd}: {'🔒 SENSITIVE' if is_sensitive else '✓ Normal'} {f'({perm})' if perm else ''}")
    print()
    
    # Test 5 : Liste toutes commandes sensibles
    print("Test 5 : Toutes les commandes sensibles")
    sensitive = permission_guard.get_all_sensitive_commands()
    print(f"  Total: {len(sensitive)} commandes")
    for cmd, perm in sensitive.items():
        print(f"    - {cmd} → {perm}")
    print()
    
    # Test 6 : Verbose logging (activer/désactiver)
    print("Test 6 : Verbose logging")
    permission_guard.enable_verbose_logging()
    allowed, error = permission_guard.check("list_conversations", {})
    print(f"  (verbose activé - vérifier stderr ci-dessus)")
    permission_guard.disable_verbose_logging()
    print()
    
    print("=== TESTS TERMINÉS ===")

if __name__ == "__main__":
    test_permission_guard()
