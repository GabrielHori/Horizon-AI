"""
Repo Analyzer Service pour Horizon AI V2
=========================================
Service d'analyse de repository avec sandbox obligatoire.

Fonctionnalités :
- Analyse de structure (lecture seule)
- Détection de stack technique
- Résumé architectural
- Détection de dettes techniques

Sécurité :
- Sandbox obligatoire (copie temporaire)
- Lecture seule (jamais d'écriture dans le repo original)
- Scope limité
- Aucun git write
"""

import os
import sys
import json
import shutil
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import defaultdict

# Import des services
try:
    from services.audit_service import audit_service, ActionType
    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False
    audit_service = None
    ActionType = None


@dataclass
class RepoAnalysis:
    """Résultat d'analyse de repository"""
    repo_path: str
    structure: Dict[str, Any]
    stack: Dict[str, Any]
    summary: str
    tech_debt: List[str]
    analyzed_at: str
    file_count: int
    total_size: int


class RepoAnalyzerService:
    """
    Service d'analyse de repository avec sandbox obligatoire
    
    Toutes les analyses sont effectuées dans un sandbox (copie temporaire)
    pour garantir qu'aucune modification n'est faite au repository original.
    """
    
    def __init__(self):
        # Déterminer le chemin de base
        if getattr(sys, 'frozen', False):
            appdata = os.environ.get('APPDATA') or os.environ.get('LOCALAPPDATA')
            if appdata:
                self.base_dir = Path(appdata) / "HorizonAI"
            else:
                self.base_dir = Path.home() / ".horizon-ai"
        else:
            self.base_dir = Path(__file__).resolve().parent.parent.parent
        
        self.sandbox_dir = self.base_dir / "data" / "sandbox"
        self.sandbox_dir.mkdir(parents=True, exist_ok=True)
        
        # Extensions de fichiers à analyser
        self.code_extensions = {
            # Langages principaux
            '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
            # Web
            '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
            # Config
            '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.conf',
            # Markdown
            '.md', '.txt', '.rst',
            # Shell
            '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
            # Autres
            '.sql', '.r', '.m', '.lua', '.pl', '.pm'
        }
        
        # Patterns de détection de frameworks
        self.framework_patterns = {
            'react': ['package.json', 'react', 'react-dom'],
            'vue': ['package.json', 'vue'],
            'angular': ['angular.json', 'package.json', '@angular'],
            'nextjs': ['next.config.js', 'next.config.ts'],
            'django': ['manage.py', 'settings.py'],
            'flask': ['app.py', 'flask'],
            'express': ['package.json', 'express'],
            'spring': ['pom.xml', 'build.gradle'],
            'rails': ['Gemfile', 'config.ru'],
            'laravel': ['artisan', 'composer.json'],
            'tauri': ['tauri.conf.json', 'src-tauri'],
            'electron': ['package.json', 'electron'],
        }
    
    def analyze_repository(
        self,
        repo_path: str,
        max_depth: int = 10,
        max_files: int = 1000
    ) -> RepoAnalysis:
        """
        Analyse un repository dans un sandbox
        
        Args:
            repo_path: Chemin du repository à analyser
            max_depth: Profondeur maximale de scan
            max_files: Nombre maximum de fichiers à analyser
            
        Returns:
            RepoAnalysis avec structure, stack, summary et tech_debt
        """
        try:
            # Normaliser le chemin (gérer les backslashes Windows)
            repo_path = os.path.normpath(repo_path)
            repo_path_obj = Path(repo_path)
            
            if not repo_path_obj.exists():
                raise ValueError(f"Repository path does not exist: {repo_path}")
            
            if not repo_path_obj.is_dir():
                raise ValueError(f"Repository path is not a directory: {repo_path}")
            
            # Vérifier la taille du repo avant analyse (limite de sécurité)
            repo_size = self._calculate_size(repo_path_obj)
            max_repo_size = 500_000_000  # 500 MB max pour éviter les problèmes de performance
            
            if repo_size > max_repo_size:
                raise ValueError(
                    f"Repository too large ({repo_size / 1_000_000:.1f} MB). "
                    f"Maximum allowed: {max_repo_size / 1_000_000:.0f} MB. "
                    "Please select a smaller directory or subdirectory."
                )
            
            # Créer un sandbox temporaire pour analyse sécurisée
            sandbox_path = None
            use_sandbox = True  # Toujours actif en production pour sécurité
            
            try:
                if use_sandbox:
                    # Créer un dossier temporaire unique
                    self.sandbox_dir.mkdir(parents=True, exist_ok=True)
                    sandbox_path = tempfile.mkdtemp(prefix="repo_analyzer_", dir=str(self.sandbox_dir))
                    sandbox_path_obj = Path(sandbox_path)
                    
                    # Copier le repository dans le sandbox (lecture seule)
                    print(f"[RepoAnalyzer] Creating sandbox at: {sandbox_path}", file=sys.stderr)
                    self._copy_to_sandbox(repo_path_obj, sandbox_path_obj)
                    print(f"[RepoAnalyzer] Sandbox created successfully", file=sys.stderr)
                    analysis_path = sandbox_path_obj
                else:
                    # Fallback : analyser directement (seulement si sandbox désactivé explicitement)
                    analysis_path = repo_path_obj
                
                # Analyser dans le sandbox ou directement
                structure = self.analyze_structure(analysis_path, max_depth, max_files)
                stack = self.detect_stack(analysis_path)
                summary = self.generate_summary(structure, stack)
                tech_debt = self.detect_tech_debt(analysis_path, max_files)
                
                # Compter les fichiers et calculer la taille
                file_count = self._count_files(analysis_path)
                total_size = self._calculate_size(analysis_path)
                
                # Audit trail
                if audit_service and AUDIT_AVAILABLE:
                    try:
                        audit_service.log_action(
                            ActionType.FILE_READ,
                            {
                                "action": "repo_analysis",
                                "repo_path": str(repo_path),
                                "file_count": file_count,
                                "stack": list(stack.get("languages", {}).keys())
                            }
                        )
                    except Exception:
                        pass  # Ignorer les erreurs d'audit
                
                return RepoAnalysis(
                    repo_path=str(repo_path),
                    structure=structure,
                    stack=stack,
                    summary=summary,
                    tech_debt=tech_debt,
                    analyzed_at=datetime.now().isoformat(),
                    file_count=file_count,
                    total_size=total_size
                )
                
            finally:
                # Nettoyer le sandbox
                if use_sandbox and sandbox_path and Path(sandbox_path).exists():
                    try:
                        shutil.rmtree(sandbox_path, ignore_errors=True)
                    except Exception:
                        pass  # Ignorer les erreurs de nettoyage
                        
        except Exception as e:
            # Logger l'erreur pour le débogage
            import traceback
            error_msg = f"Error analyzing repository: {str(e)}\n{traceback.format_exc()}"
            print(f"[RepoAnalyzer] {error_msg}", file=sys.stderr)
            raise ValueError(f"Failed to analyze repository: {str(e)}")
    
    def _copy_to_sandbox(self, source: Path, dest: Path):
        """
        Copie le repository dans le sandbox (ignorant .git et node_modules)
        
        Améliorations V2 :
        - Retry logic pour fichiers verrouillés
        - Gestion d'erreurs améliorée avec logging
        - Limites de taille pour éviter les problèmes de performance
        """
        ignore_patterns = {
            '.git', 'node_modules', '.venv', 'venv', '__pycache__',
            '.pytest_cache', '.mypy_cache', 'dist', 'build', '.next',
            'target', '.idea', '.vscode', '.DS_Store', 'target',
            '.gitignore', '.dockerignore'
        }
        
        copied_files = 0
        skipped_files = 0
        max_files_in_sandbox = 10_000  # Limite de sécurité
        
        def should_ignore(path: Path) -> bool:
            parts = path.parts
            return any(part in ignore_patterns for part in parts)
        
        def copy_recursive(src: Path, dst: Path, depth: int = 0, retry_count: int = 0):
            nonlocal copied_files, skipped_files
            
            if depth > 20:  # Limiter la profondeur pour éviter les boucles
                return
                
            if copied_files >= max_files_in_sandbox:
                print(f"[RepoAnalyzer] Warning: Reached max files limit ({max_files_in_sandbox}), stopping copy", file=sys.stderr)
                return
                
            if should_ignore(src):
                return
            if src.is_symlink():
                skipped_files += 1
                return
            
            try:
                if src.is_file():
                    # Vérifier la taille du fichier (limite 50 MB par fichier)
                    try:
                        file_size = src.stat().st_size
                        if file_size > 50_000_000:  # 50 MB
                            skipped_files += 1
                            return
                    except (OSError, PermissionError):
                        skipped_files += 1
                        return
                    
                    try:
                        # Créer le dossier parent si nécessaire
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dst)
                        copied_files += 1
                    except (PermissionError, OSError) as e:
                        # Retry logic pour fichiers verrouillés (maximum 2 retries)
                        if retry_count < 2:
                            import time
                            time.sleep(0.1)  # Attendre 100ms avant retry
                            try:
                                shutil.copy2(src, dst)
                                copied_files += 1
                            except Exception:
                                skipped_files += 1
                                if retry_count == 0:  # Logger seulement au premier essai
                                    print(f"[RepoAnalyzer] Warning: Skipped locked file: {src.relative_to(source)}", file=sys.stderr)
                        else:
                            skipped_files += 1
                            if retry_count == 0:
                                print(f"[RepoAnalyzer] Warning: Skipped file after retries: {src.relative_to(source)}", file=sys.stderr)
                elif src.is_dir():
                    try:
                        dst.mkdir(parents=True, exist_ok=True)
                        for item in src.iterdir():
                            if not should_ignore(item):
                                copy_recursive(item, dst / item.name, depth + 1, retry_count=0)
                    except (PermissionError, OSError) as e:
                        skipped_files += 1
                        if depth == 0:  # Logger seulement au niveau racine
                            print(f"[RepoAnalyzer] Warning: Skipped directory: {src.relative_to(source)}", file=sys.stderr)
            except Exception as e:
                skipped_files += 1
                # Logger les erreurs importantes uniquement
                if depth <= 2:  # Logger seulement les erreurs proches de la racine
                    print(f"[RepoAnalyzer] Warning: Error copying {src.relative_to(source)}: {str(e)}", file=sys.stderr)
        
        try:
            copy_recursive(source, dest)
            if skipped_files > 0:
                print(f"[RepoAnalyzer] Sandbox copy completed: {copied_files} files copied, {skipped_files} files skipped", file=sys.stderr)
            else:
                print(f"[RepoAnalyzer] Sandbox copy completed: {copied_files} files copied", file=sys.stderr)
        except Exception as e:
            # En cas d'erreur critique, nettoyer le sandbox partiel
            if dest.exists():
                try:
                    shutil.rmtree(dest, ignore_errors=True)
                except Exception:
                    pass
            raise ValueError(f"Failed to create sandbox: {str(e)}")
    
    def analyze_structure(
        self,
        root_path: Path,
        max_depth: int = 10,
        max_files: int = 1000
    ) -> Dict[str, Any]:
        """
        Analyse uniquement la structure du repository (pas le contenu)
        
        Returns:
            Dict avec structure, fichiers par type, etc.
        """
        structure = {
            "root": str(root_path),
            "directories": [],
            "files_by_extension": defaultdict(int),
            "files_by_type": defaultdict(list),
            "depth": 0,
            "total_files": 0
        }
        
        file_count = 0
        
        def scan_directory(path: Path, depth: int = 0):
            nonlocal file_count
            
            if depth > max_depth or file_count >= max_files:
                return
            
            if not path.exists() or not path.is_dir():
                return
            
            try:
                items = list(path.iterdir())
                for item in items:
                    if file_count >= max_files:
                        break
                    
                    try:
                        # Ignorer les dossiers système
                        if item.name.startswith('.') and item.name not in ['.gitignore', '.env.example']:
                            continue
                        if item.is_symlink():
                            continue
                        
                        if item.is_dir():
                            if depth < max_depth:
                                try:
                                    rel_path = str(item.relative_to(root_path))
                                    structure["directories"].append(rel_path)
                                    scan_directory(item, depth + 1)
                                except (ValueError, OSError):
                                    pass  # Ignorer les erreurs de chemin relatif
                        elif item.is_file():
                            file_count += 1
                            ext = item.suffix.lower()
                            structure["files_by_extension"][ext] += 1
                            
                            # Classer par type
                            file_type = self._classify_file_type(ext)
                            try:
                                rel_path = str(item.relative_to(root_path))
                                size = item.stat().st_size if item.exists() else 0
                                structure["files_by_type"][file_type].append({
                                    "path": rel_path,
                                    "size": size
                                })
                            except (ValueError, OSError):
                                pass  # Ignorer les erreurs
                    except (PermissionError, OSError):
                        pass  # Ignorer les erreurs d'accès
            except (PermissionError, OSError):
                pass  # Ignorer les erreurs de permission
        
        try:
            scan_directory(root_path)
        except Exception as e:
            # Si l'analyse échoue, retourner une structure minimale
            print(f"[RepoAnalyzer] Error scanning structure: {e}", file=sys.stderr)
        
        structure["total_files"] = file_count
        structure["files_by_extension"] = dict(structure["files_by_extension"])
        structure["files_by_type"] = {
            k: v for k, v in structure["files_by_type"].items()
        }
        
        return structure
    
    def _classify_file_type(self, extension: str) -> str:
        """Classifie un fichier par type"""
        if extension in ['.py']:
            return 'python'
        elif extension in ['.js', '.jsx', '.ts', '.tsx']:
            return 'javascript'
        elif extension in ['.java']:
            return 'java'
        elif extension in ['.cpp', '.c', '.h']:
            return 'cpp'
        elif extension in ['.rs']:
            return 'rust'
        elif extension in ['.go']:
            return 'go'
        elif extension in ['.html', '.css', '.scss', '.sass']:
            return 'web'
        elif extension in ['.json', '.yaml', '.yml', '.toml']:
            return 'config'
        elif extension in ['.md', '.txt']:
            return 'documentation'
        elif extension in ['.sh', '.bash', '.ps1', '.bat']:
            return 'script'
        else:
            return 'other'
    
    def detect_stack(self, root_path: Path) -> Dict[str, Any]:
        """
        Détecte la stack technique via fichiers de configuration et extensions
        """
        stack = {
            "languages": {},
            "frameworks": [],
            "tools": [],
            "package_managers": []
        }
        
        try:
            # Détecter les langages via extensions
            language_extensions = {
                'Python': ['.py'],
                'JavaScript': ['.js', '.jsx'],
                'TypeScript': ['.ts', '.tsx'],
                'Java': ['.java'],
                'C++': ['.cpp', '.c', '.h'],
                'Rust': ['.rs'],
                'Go': ['.go'],
                'Ruby': ['.rb'],
                'PHP': ['.php'],
                'Swift': ['.swift'],
                'Kotlin': ['.kt'],
            }
            
            def count_files_by_language(path: Path):
                try:
                    for item in path.rglob('*'):
                        try:
                            if item.is_symlink():
                                continue
                            if item.is_file():
                                ext = item.suffix.lower()
                                for lang, exts in language_extensions.items():
                                    if ext in exts:
                                        stack["languages"][lang] = stack["languages"].get(lang, 0) + 1
                                        break
                        except (PermissionError, OSError):
                            continue
                except Exception:
                    pass  # Ignorer les erreurs
            
            count_files_by_language(root_path)
            
            # Détecter les frameworks via fichiers de configuration
            config_files = {
                'package.json': 'npm',
                'requirements.txt': 'pip',
                'Pipfile': 'pipenv',
                'poetry.lock': 'poetry',
                'Cargo.toml': 'cargo',
                'pom.xml': 'maven',
                'build.gradle': 'gradle',
                'Gemfile': 'bundler',
                'composer.json': 'composer',
                'go.mod': 'go modules',
            }
            
            for config_file, manager in config_files.items():
                try:
                    if (root_path / config_file).exists():
                        stack["package_managers"].append(manager)
                except Exception:
                    pass
            
            # Détecter les frameworks
            for framework, patterns in self.framework_patterns.items():
                try:
                    for pattern in patterns:
                        pattern_path = root_path / pattern
                        if pattern_path.exists():
                            if framework not in stack["frameworks"]:
                                stack["frameworks"].append(framework)
                            break
                except Exception:
                    continue
            
            # Détecter les outils
            tool_files = {
                '.github': 'GitHub Actions',
                'Dockerfile': 'Docker',
                'docker-compose.yml': 'Docker Compose',
                '.gitlab-ci.yml': 'GitLab CI',
                'Jenkinsfile': 'Jenkins',
                'Makefile': 'Make',
            }
            
            for tool_file, tool_name in tool_files.items():
                try:
                    if (root_path / tool_file).exists():
                        stack["tools"].append(tool_name)
                except Exception:
                    pass
        except Exception as e:
            print(f"[RepoAnalyzer] Error detecting stack: {e}", file=sys.stderr)
        
        return stack
    
    def generate_summary(self, structure: Dict, stack: Dict) -> str:
        """
        Génère un résumé architectural textuel
        """
        lines = []
        lines.append("=== RÉSUMÉ ARCHITECTURAL ===\n")
        
        # Stack technique
        if stack.get("languages"):
            lines.append("Langages détectés:")
            for lang, count in sorted(stack["languages"].items(), key=lambda x: x[1], reverse=True):
                lines.append(f"  - {lang}: {count} fichiers")
            lines.append("")
        
        if stack.get("frameworks"):
            lines.append(f"Frameworks: {', '.join(stack['frameworks'])}")
            lines.append("")
        
        if stack.get("package_managers"):
            lines.append(f"Gestionnaires de paquets: {', '.join(stack['package_managers'])}")
            lines.append("")
        
        if stack.get("tools"):
            lines.append(f"Outils: {', '.join(stack['tools'])}")
            lines.append("")
        
        # Structure
        lines.append(f"Total fichiers: {structure.get('total_files', 0)}")
        lines.append(f"Total dossiers: {len(structure.get('directories', []))}")
        
        if structure.get("files_by_type"):
            lines.append("\nFichiers par type:")
            for file_type, files in sorted(structure["files_by_type"].items(), key=lambda x: len(x[1]), reverse=True):
                lines.append(f"  - {file_type}: {len(files)} fichiers")
        
        return "\n".join(lines)
    
    def detect_tech_debt(self, root_path: Path, max_files: int = 1000) -> List[str]:
        """
        Détecte des dettes techniques (fichiers trop longs, etc.)
        """
        tech_debt = []
        file_count = 0
        
        def check_file(path: Path):
            nonlocal file_count
            if file_count >= max_files:
                return
            if path.is_symlink():
                return
            
            try:
                if path.is_file() and path.suffix.lower() in self.code_extensions:
                    file_count += 1
                    try:
                        # Compter les lignes
                        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                            line_count = sum(1 for _ in f)
                        
                        # Détecter les fichiers trop longs
                        if line_count > 500:
                            try:
                                rel_path = str(path.relative_to(root_path))
                                tech_debt.append(
                                    f"Fichier très long ({line_count} lignes): {rel_path}"
                                )
                            except (ValueError, OSError):
                                pass
                        
                        # Détecter les fichiers très volumineux
                        try:
                            size = path.stat().st_size
                            if size > 1_000_000:  # > 1MB
                                try:
                                    rel_path = str(path.relative_to(root_path))
                                    tech_debt.append(
                                        f"Fichier volumineux ({size / 1_000_000:.1f} MB): {rel_path}"
                                    )
                                except (ValueError, OSError):
                                    pass
                        except (OSError, PermissionError):
                            pass
                    except (IOError, PermissionError, UnicodeDecodeError):
                        pass  # Ignorer les erreurs de lecture
            except (PermissionError, OSError):
                pass  # Ignorer les erreurs d'accès
        
        # Scanner récursivement
        try:
            for item in root_path.rglob('*'):
                if file_count >= max_files:
                    break
                try:
                    check_file(item)
                except Exception:
                    continue  # Continuer même en cas d'erreur
        except Exception as e:
            print(f"[RepoAnalyzer] Error detecting tech debt: {e}", file=sys.stderr)
        
        return tech_debt
    
    def _count_files(self, path: Path) -> int:
        """Compte le nombre de fichiers"""
        count = 0
        try:
            for item in path.rglob('*'):
                try:
                    if item.is_symlink():
                        continue
                    if item.is_file():
                        count += 1
                except (PermissionError, OSError):
                    continue
        except Exception:
            pass
        return count
    
    def _calculate_size(self, path: Path) -> int:
        """Calcule la taille totale"""
        total = 0
        try:
            for item in path.rglob('*'):
                try:
                    if item.is_symlink():
                        continue
                    if item.is_file():
                        total += item.stat().st_size
                except (PermissionError, OSError):
                    continue
        except Exception:
            pass
        return total


# Instance globale
repo_analyzer_service = RepoAnalyzerService()
