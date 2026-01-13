"""
Tests de validation PathValidator
==================================
Script simple pour valider le comportement du path_validator
"""

import sys
from pathlib import Path

# Ajouter le dossier worker au path
worker_dir = Path(__file__).parent
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

from services.path_validator import path_validator

def test_path_validator():
    """Tests de validation path traversal"""
    
    print("=== TESTS PATH VALIDATOR ===\n")
    
    # Test 1 : Chemin valide (dossier actuel)
    print("Test 1 : Chemin valide (dossier worker)")
    is_safe, error = path_validator.is_safe_repo_path(str(worker_dir))
    print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    # Test 2 : Path traversal vers Windows (si Windows)
    if sys.platform == "win32":
        print("Test 2 : Path traversal vers C:\\Windows")
        is_safe, error = path_validator.is_safe_repo_path("C:\\Windows")
        print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED (attendu!)'}")
        if error:
            print(f"  Erreur: {error}")
        print()
        
        print("Test 3 : Path traversal avec ../ vers Windows")
        # Créer un chemin avec .. qui mène vers Windows
        test_path = str(worker_dir.parent.parent) + "\\..\\..\\..\\Windows"
        is_safe, error = path_validator.is_safe_repo_path(test_path)
        print(f"  Chemin testé: {test_path}")
        print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED (attendu!)'}")
        if error:
            print(f"  Erreur: {error}")
        print()
    
    # Test 4 : Chemin inexistant
    print("Test 4 : Chemin inexistant")
    is_safe, error = path_validator.is_safe_repo_path("C:/fake/nonexistent/path")
    print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED (attendu!)'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    # Test 5 : Fichier au lieu de dossier
    print("Test 5 : Fichier au lieu de dossier")
    file_path = Path(__file__)
    is_safe, error = path_validator.is_safe_repo_path(str(file_path))
    print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED (attendu!)'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    # Test 6 : Chemin vide
    print("Test 6 : Chemin vide")
    is_safe, error = path_validator.is_safe_repo_path("")
    print(f"  Résultat: {'✅ SAFE' if is_safe else '❌ BLOCKED (attendu!)'}")
    if error:
        print(f"  Erreur: {error}")
    print()
    
    print("=== TESTS TERMINÉS ===")

if __name__ == "__main__":
    test_path_validator()
