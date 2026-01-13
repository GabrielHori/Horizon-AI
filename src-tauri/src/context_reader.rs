use std::path::{Path, PathBuf};
use std::fs;
use std::io::{Read, BufRead, BufReader};
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Runtime};
// use crate::permission_manager::Permission; // Non utilisé pour l'instant
// use std::sync::Mutex; // Non utilisé pour l'instant
use std::collections::HashMap;
use chrono::{Utc, Duration};

/// Configuration pour la lecture de fichiers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextReaderConfig {
    pub allowed_extensions: Vec<String>,
    pub max_file_size: usize,
    pub current_scope: Option<PathBuf>,
}

impl Default for ContextReaderConfig {
    fn default() -> Self {
        Self {
            allowed_extensions: vec![
                "py".to_string(),
                "js".to_string(),
                "ts".to_string(),
                "md".to_string(),
                "txt".to_string(),
                "json".to_string(),
                "toml".to_string(),
                "yaml".to_string(),
                "yml".to_string(),
            ],
            max_file_size: 1_000_000, // 1MB
            current_scope: None,
        }
    }
}

/// Structure pour représenter un fichier lu
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub size: usize,
    pub extension: String,
}

/// Structure pour stocker les tokens de confirmation
struct ConfirmationToken {
    token: String,
    expiration: chrono::DateTime<Utc>,
}

/// Gestionnaire de contexte local
pub struct ContextReader<R: Runtime> {
    config: ContextReaderConfig,
    app_handle: AppHandle<R>,
    // Tokens de confirmation pour lecture complète (path -> (token, expiration))
    confirmation_tokens: HashMap<String, ConfirmationToken>,
}

impl<R: Runtime> ContextReader<R> {
    /// Crée un nouveau ContextReader
    pub fn new(app_handle: &AppHandle<R>) -> Self {
        Self {
            config: ContextReaderConfig::default(),
            app_handle: app_handle.clone(),
            confirmation_tokens: HashMap::new(),
        }
    }

    /// Génère un token de confirmation pour un fichier
    /// Le token est valide pendant 5 minutes
    pub fn generate_confirmation_token(&mut self, file_path: &Path) -> String {
        let path_str = file_path.to_string_lossy().to_string();
        let expiration = Utc::now() + Duration::minutes(5);
        
        // Token simple basé sur UUID
        use uuid::Uuid;
        let token = Uuid::new_v4().to_string();
        
        // Stocker le token avec expiration
        self.confirmation_tokens.insert(
            path_str.clone(),
            ConfirmationToken {
                token: token.clone(),
                expiration,
            },
        );
        
        token
    }

    /// Valide un token de confirmation
    pub fn validate_confirmation_token(&mut self, file_path: &Path, token: &str) -> bool {
        let path_str = file_path.to_string_lossy().to_string();
        let now = Utc::now();
        
        // Nettoyer les tokens expirés
        self.confirmation_tokens.retain(|_, ct| ct.expiration > now);
        
        // Vérifier si le path a un token valide qui correspond
        if let Some(confirmation_token) = self.confirmation_tokens.get(&path_str) {
            if confirmation_token.expiration > now && confirmation_token.token == token {
                // Token valide, le consommer (une seule utilisation)
                self.confirmation_tokens.remove(&path_str);
                return true;
            }
        }
        
        false
    }

    /// Définit le scope actuel (dossier de projet)
    pub fn set_scope(&mut self, path: PathBuf) -> Result<(), String> {
        // Vérifier que le chemin existe et est un dossier
        if !path.exists() {
            return Err(format!("Path does not exist: {}", path.display()));
        }
        if !path.is_dir() {
            return Err(format!("Path is not a directory: {}", path.display()));
        }

        self.config.current_scope = Some(path);
        Ok(())
    }

    /// Vérifie si un fichier est dans le scope autorisé
    fn is_in_scope(&self, file_path: &Path) -> Result<(), String> {
        if let Some(scope) = &self.config.current_scope {
            if !file_path.starts_with(scope) {
                return Err(format!(
                    "File {} is outside the allowed scope {}",
                    file_path.display(),
                    scope.display()
                ));
            }
        }
        Ok(())
    }

    /// Vérifie si l'extension est autorisée
    fn is_allowed_extension(&self, path: &Path) -> Result<(), String> {
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                if !self.config.allowed_extensions.contains(&ext_str.to_lowercase()) {
                    return Err(format!(
                        "File extension .{} is not allowed. Allowed extensions: {:?}",
                        ext_str,
                        self.config.allowed_extensions
                    ));
                }
            }
        }
        Ok(())
    }

    /// Vérifie la taille du fichier
    fn check_file_size(&self, path: &Path) -> Result<(), String> {
        if let Ok(metadata) = fs::metadata(path) {
            if metadata.len() > self.config.max_file_size as u64 {
                return Err(format!(
                    "File {} is too large ({} bytes). Max allowed: {} bytes",
                    path.display(),
                    metadata.len(),
                    self.config.max_file_size
                ));
            }
        }
        Ok(())
    }

    /// Lit le contenu d'un fichier avec toutes les vérifications de sécurité
    pub async fn read_file_with_permission(
        &self,
        file_path: PathBuf,
    ) -> Result<FileContent, String> {
        // 1. Vérifier que le fichier existe
        if !file_path.exists() {
            return Err(format!("File does not exist: {}", file_path.display()));
        }

        // 2. Vérifier que c'est un fichier (pas un dossier)
        if !file_path.is_file() {
            return Err(format!("Path is not a file: {}", file_path.display()));
        }

        // 3. Vérifier le scope
        self.is_in_scope(&file_path)?;

        // 4. Vérifier l'extension
        self.is_allowed_extension(&file_path)?;

        // 5. Vérifier la taille
        self.check_file_size(&file_path)?;

        // 6. Demander la permission de lecture via événement Tauri
        // Note: La vérification de permission est maintenant gérée dans les commandes Tauri
        // via le PermissionManager. Cette méthode se contente de faire les validations
        // de scope, extension et taille du fichier.

        // 7. Lire le contenu du fichier
        let mut file = fs::File::open(&file_path)
            .map_err(|e| format!("Failed to open file {}: {}", file_path.display(), e))?;

        let mut content = String::new();
        file.read_to_string(&mut content)
            .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

        // 8. Créer la structure de retour
        let extension = file_path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_string();

        let metadata = fs::metadata(&file_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;

        Ok(FileContent {
            path: file_path.to_string_lossy().into_owned(),
            content,
            size: metadata.len() as usize,
            extension,
        })
    }

    /// Lit plusieurs fichiers avec validation
    pub async fn read_multiple_files(
        &self,
        file_paths: Vec<PathBuf>,
    ) -> Result<Vec<FileContent>, String> {
        let mut results = Vec::new();

        for path in file_paths {
            match self.read_file_with_permission(path).await {
                Ok(content) => results.push(content),
                Err(e) => return Err(format!("Failed to read file: {}", e)),
            }
        }

        Ok(results)
    }

    /// Scanne un dossier pour lister les fichiers (sans lire le contenu)
    pub fn scan_directory(
        &self,
        dir_path: &Path,
        recursive: bool,
    ) -> Result<Vec<PathBuf>, String> {
        // Vérifier le scope
        self.is_in_scope(dir_path)?;

        let mut files = Vec::new();
        self.scan_directory_recursive(dir_path, recursive, &mut files)?;

        // Filtrer par extensions autorisées
        let files: Vec<PathBuf> = files
            .into_iter()
            .filter(|path| self.is_allowed_extension(path).is_ok())
            .collect();

        Ok(files)
    }

    fn scan_directory_recursive(
        &self,
        dir_path: &Path,
        recursive: bool,
        files: &mut Vec<PathBuf>,
    ) -> Result<(), String> {
        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_file() {
                        files.push(path);
                    } else if path.is_dir() && recursive {
                        self.scan_directory_recursive(&path, recursive, files)?;
                    }
                }
            }
        }
        Ok(())
    }

    /// Obtient la configuration actuelle
    pub fn get_config(&self) -> ContextReaderConfig {
        self.config.clone()
    }

    /// Met à jour la configuration
    pub fn update_config(&mut self, new_config: ContextReaderConfig) {
        self.config = new_config;
    }

    /// Ajoute une extension autorisée
    pub fn add_allowed_extension(&mut self, extension: String) {
        let ext = extension.to_lowercase();
        if !self.config.allowed_extensions.contains(&ext) {
            self.config.allowed_extensions.push(ext);
        }
    }

    /// Supprime une extension autorisée
    pub fn remove_allowed_extension(&mut self, extension: &str) {
        self.config.allowed_extensions.retain(|e| e != &extension.to_lowercase());
    }

    /// Obtient un preview d'un fichier (premières lignes seulement, sans permission)
    /// Cette méthode est toujours autorisée car elle ne lit qu'un aperçu
    pub fn get_file_preview(
        &self,
        file_path: PathBuf,
        max_lines: usize,
    ) -> Result<FilePreview, String> {
        // 1. Vérifier que le fichier existe
        if !file_path.exists() {
            return Err(format!("File does not exist: {}", file_path.display()));
        }

        // 2. Vérifier que c'est un fichier (pas un dossier)
        if !file_path.is_file() {
            return Err(format!("Path is not a file: {}", file_path.display()));
        }

        // 3. Vérifier le scope (sécurité)
        self.is_in_scope(&file_path)?;

        // 4. Vérifier l'extension (sécurité)
        self.is_allowed_extension(&file_path)?;

        // 5. Vérifier la taille (sécurité)
        self.check_file_size(&file_path)?;

        // 6. Lire uniquement les premières lignes (pas le fichier complet)
        let file = fs::File::open(&file_path)
            .map_err(|e| format!("Failed to open file {}: {}", file_path.display(), e))?;

        let reader = BufReader::new(file);
        let mut preview_lines = Vec::new();
        let mut line_count = 0;

        for (idx, line) in reader.lines().enumerate() {
            line_count = idx + 1;
            if idx < max_lines {
                match line {
                    Ok(l) => preview_lines.push(l),
                    Err(e) => return Err(format!("Failed to read line {}: {}", idx + 1, e)),
                }
            } else {
                // Continuer à compter les lignes sans les lire
            }
        }

        let preview = preview_lines.join("\n");
        let metadata = fs::metadata(&file_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;

        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_string();

        Ok(FilePreview {
            path: file_path.to_string_lossy().into_owned(),
            preview,
            size: metadata.len() as usize,
            extension,
            line_count,
        })
    }
}

/// Structure pour représenter un fichier avec preview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePreview {
    pub path: String,
    pub preview: String,
    pub size: usize,
    pub extension: String,
    pub line_count: usize,
}

impl FilePreview {
    /// Crée une preview d'un fichier (premières lignes)
    pub fn from_content(content: &FileContent, max_lines: usize) -> Self {
        let preview_lines: Vec<&str> = content.content.lines().take(max_lines).collect();
        let preview = preview_lines.join("\n");
        let line_count = content.content.lines().count();

        Self {
            path: content.path.clone(),
            preview,
            size: content.size,
            extension: content.extension.clone(),
            line_count,
        }
    }
}
