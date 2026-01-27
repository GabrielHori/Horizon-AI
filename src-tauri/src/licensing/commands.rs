use chrono::Utc;
use serde::Serialize;
use tauri::State;

use super::{
    device,
    store::{LicenseRecord, LicenseStore},
    verify::{build_license_record, Entitlement},
};

#[derive(Debug, Serialize)]
pub struct LicenseStatusDto {
    pub status: LicenseRecord,
}

/// Retourne l'état courant (in-memory pour l'instant).
#[tauri::command]
pub async fn license_status(store: State<'_, LicenseStore>) -> Result<LicenseStatusDto, String> {
    Ok(LicenseStatusDto {
        status: store.snapshot(),
    })
}

/// Active une licence (maquette sans appel réseau).
#[tauri::command]
pub async fn license_activate(
    key: String,
    store: State<'_, LicenseStore>,
) -> Result<LicenseStatusDto, String> {
    let now = Utc::now();
    if key.trim().is_empty() {
        return Err("missing_license_key".into());
    }

    // TODO: remplacer par appel HTTP /license/activate + vérif JWS
    let local_fp = device::fingerprint();
    let is_lifetime = key.to_uppercase().contains("LIFE");
    let exp = if is_lifetime { None } else { Some(now + chrono::Duration::days(30)) };

    let ent = Entitlement {
        plan: if is_lifetime { "pro_lifetime".to_string() } else { "pro_monthly".to_string() },
        exp,
        iat: Some(now),
        device_fingerprint: local_fp.clone(),
        grace_days: Some(10),
        raw_jws: Some(format!("mock-jws-{}", key)),
    };

    let mut record = build_license_record(ent, now);
    record.entitlement_jws = Some(format!("mock-jws-{}", key));
    store
        .save(record.clone())
        .map_err(|e| format!("persist_error: {e}"))?;

    Ok(LicenseStatusDto { status: record })
}

/// Rafraîchit une licence (maquette).
#[tauri::command]
pub async fn license_refresh(store: State<'_, LicenseStore>) -> Result<LicenseStatusDto, String> {
    let now = Utc::now();
    let mut snapshot = store.snapshot();

    // Monthly : si expiré -> state expired, sinon on rafraîchit iat/last_verified
    if snapshot.plan == "pro_monthly" {
        if let Some(exp) = snapshot.expires_at {
            if exp < now {
                snapshot.state = "expired".to_string();
            } else {
                snapshot.state = "active".to_string();
            }
        }
        snapshot.expires_at = snapshot.expires_at.or(Some(now + chrono::Duration::days(30)));
    }

    snapshot.last_verified_at = Some(now);
    store
        .save(snapshot.clone())
        .map_err(|e| format!("persist_error: {e}"))?;

    Ok(LicenseStatusDto { status: snapshot })
}
