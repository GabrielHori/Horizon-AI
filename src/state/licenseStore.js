import { invoke } from "@tauri-apps/api/core";

export const defaultLicenseState = {
  plan: "free",
  state: "free",
  entitlement_jws: null,
  last_verified_at: null,
  expires_at: null,
  grace_days: null,
  device_fingerprint: null,
  error: null,
};

const REDUCE_ANIM_KEY = "horizon.reduceAnimations";

export const getReduceAnimationsPref = () => {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(REDUCE_ANIM_KEY);
  return raw === "true";
};

export const setReduceAnimationsPref = (value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REDUCE_ANIM_KEY, value ? "true" : "false");
};

export async function fetchLicenseStatus() {
  try {
    const resp = await invoke("license_status");
    if (resp?.status) return resp.status;
    return defaultLicenseState;
  } catch (err) {
    console.warn("[license] status fallback (Tauri unavailable?)", err);
    return defaultLicenseState;
  }
}

export async function activateLicense(licenseKey) {
  if (!licenseKey) {
    return { ...defaultLicenseState, error: "missing_key" };
  }
  try {
    const resp = await invoke("license_activate", { key: licenseKey });
    if (resp?.status) return resp.status;
    return { ...defaultLicenseState, error: "activate_failed" };
  } catch (err) {
    return { ...defaultLicenseState, error: err?.toString() || "activate_failed" };
  }
}

export async function refreshLicense() {
  try {
    const resp = await invoke("license_refresh");
    if (resp?.status) return resp.status;
    return { ...defaultLicenseState, error: "refresh_failed" };
  } catch (err) {
    return { ...defaultLicenseState, error: err?.toString() || "refresh_failed" };
  }
}
