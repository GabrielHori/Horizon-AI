#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour exécuter tous les tests Horizon AI V2
"""

import sys
import subprocess
import os
from pathlib import Path

# Forcer UTF-8 pour Windows
if sys.platform == "win32":
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

def main():
    """Exécute tous les tests"""
    worker_dir = Path(__file__).parent / "worker"
    tests_dir = worker_dir / "tests"
    
    print("Execution des tests Horizon AI V2\n")
    print("=" * 60)
    
    # Vérifier que pytest est installé
    try:
        import pytest
    except ImportError:
        print("ERREUR: pytest n'est pas installe.")
        print("   Installez-le avec: pip install pytest pytest-cov")
        return 1
    
    # Exécuter les tests
    cmd = [
        sys.executable, "-m", "pytest",
        str(tests_dir),
        "-v",
        "--tb=short",
        "--color=yes"
    ]
    
    print(f"Dossier des tests: {tests_dir}")
    print(f"Commande: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, cwd=worker_dir)
    
    if result.returncode == 0:
        print("\n" + "=" * 60)
        print("SUCCES: Tous les tests sont passes !")
        return 0
    else:
        print("\n" + "=" * 60)
        print("ERREUR: Certains tests ont echoue.")
        return result.returncode

if __name__ == "__main__":
    sys.exit(main())
