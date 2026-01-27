use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use super::store::LicenseRecord;

#[derive(Debug, Serialize, Deserialize)]
pub struct Entitlement {
    pub plan: String,
    pub exp: Option<DateTime<Utc>>,
    pub iat: Option<DateTime<Utc>>,
    pub device_fingerprint: Option<String>,
    pub grace_days: Option<i64>,
    pub raw_jws: Option<String>,
}

#[derive(Debug)]
pub enum VerifyError {
    ClockSkew,
    Expired,
    DeviceMismatch,
    InvalidFormat,
}

/// Vérification simplifiée : parse l'entitlement et applique des gardes basiques.
/// TODO: remplacer par une vérif JWS (clé publique embarquée).
pub fn verify_entitlement(
    ent: Entitlement,
    now: DateTime<Utc>,
    local_fp: Option<String>,
) -> Result<Entitlement, VerifyError> {
    if let Some(iat) = ent.iat {
        if iat > now + Duration::minutes(5) {
            return Err(VerifyError::ClockSkew);
        }
    }

    if let Some(exp) = ent.exp {
        if exp < now && ent.plan == "monthly" {
            return Err(VerifyError::Expired);
        }
    }

    if let (Some(required), Some(local)) = (ent.device_fingerprint.clone(), local_fp) {
        if required != local {
            return Err(VerifyError::DeviceMismatch);
        }
    }

    Ok(ent)
}

/// Construit un LicenseRecord côté Tauri à partir d'un entitlement validé.
pub fn build_license_record(ent: Entitlement, now: DateTime<Utc>) -> LicenseRecord {
    let state = if ent.plan == "monthly" {
        if let Some(exp) = ent.exp {
            if exp < now {
                "expired".to_string()
            } else {
                "active".to_string()
            }
        } else {
            "active".to_string()
        }
    } else {
        "active".to_string()
    };

    LicenseRecord {
        plan: ent.plan.clone(),
        state,
        entitlement_jws: ent.raw_jws.clone(),
        last_verified_at: Some(now),
        expires_at: ent.exp,
        grace_days: ent.grace_days,
        device_fingerprint: ent.device_fingerprint,
        error: None,
    }
}
