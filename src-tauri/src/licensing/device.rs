/// Empreinte machine légère (placeholder). À raffiner: HMAC(app_salt, machine_id+os+arch).
pub fn fingerprint() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        // FIXME: lire MachineGuid ou équivalent; ici placeholder pour ne pas casser la build.
        return Some("win-dev-fingerprint".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        return Some("mac-dev-fingerprint".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        return Some("linux-dev-fingerprint".to_string());
    }

    #[allow(unreachable_code)]
    None
}
