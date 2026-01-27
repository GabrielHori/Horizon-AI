use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Snapshot sérialisable de l'état licence. Reste volontairement simple pour ne pas casser l'existant.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseRecord {
    pub plan: String,                     // free | pro_monthly | pro_lifetime
    pub state: String,                    // free | active | grace | expired | error
    pub entitlement_jws: Option<String>,  // token signé côté serveur
    pub last_verified_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub grace_days: Option<i64>,
    pub device_fingerprint: Option<String>,
    pub error: Option<String>,
}

impl Default for LicenseRecord {
    fn default() -> Self {
        LicenseRecord {
            plan: "free".to_string(),
            state: "free".to_string(),
            entitlement_jws: None,
            last_verified_at: None,
            expires_at: None,
            grace_days: None,
            device_fingerprint: None,
            error: None,
        }
    }
}

/// Stockage simple sur disque (fichier JSON) + mutex in-memory.
/// Remplacer par un store chiffré/credential vault pour la prod.
pub struct LicenseStore {
    inner: Mutex<LicenseRecord>,
    path: PathBuf,
}

impl Default for LicenseStore {
    fn default() -> Self {
        Self::new()
    }
}

impl LicenseStore {
    pub fn new() -> Self {
        let path = PathBuf::from("license_state.json");
        let initial = Self::load_from_disk(&path).unwrap_or_default();
        LicenseStore {
            inner: Mutex::new(initial),
            path,
        }
    }

    pub fn snapshot(&self) -> LicenseRecord {
        self.inner.lock().unwrap().clone()
    }

    pub fn save(&self, record: LicenseRecord) -> std::io::Result<()> {
        if let Ok(mut guard) = self.inner.lock() {
            *guard = record.clone();
        }
        let data = serde_json::to_vec_pretty(&record)?;
        fs::write(&self.path, data)?;
        Ok(())
    }

    fn load_from_disk(path: &PathBuf) -> Option<LicenseRecord> {
        let data = fs::read(path).ok()?;
        serde_json::from_slice::<LicenseRecord>(&data).ok()
    }
}
