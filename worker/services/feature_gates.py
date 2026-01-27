from typing import Dict, Any

PRO_FEATURES = {
    "remote_access",
    "web_search",
    "unlimited_history",
    "exports",
    "model_pull",
}

FREE_FEATURES = {
    "local_chat",
    "model_switch",
}


def _state_is_valid(ent_status: Dict[str, Any]) -> bool:
    state = ent_status.get("state", "free")
    return state not in ("expired", "invalid", "error")


def feature_is_enabled(feature: str, ent_status: Dict[str, Any]) -> bool:
    plan = ent_status.get("plan", "free") or "free"
    if not _state_is_valid(ent_status):
        return False
    if plan == "free":
        return feature in FREE_FEATURES
    return feature in PRO_FEATURES or feature in FREE_FEATURES


def guard(feature: str, ent_status: Dict[str, Any]) -> (bool, str):
    if feature_is_enabled(feature, ent_status):
        return True, ""
    return False, "LICENSE_REQUIRED"
