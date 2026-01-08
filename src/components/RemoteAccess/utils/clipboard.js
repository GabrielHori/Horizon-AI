/**
 * Clipboard Utilities
 * Safe clipboard operations for RemoteAccess component
 */

export const copyToClipboard = async (text, setCopied, type) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    // Silent failure - clipboard access might be restricted
  }
};