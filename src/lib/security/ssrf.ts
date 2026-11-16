const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
]);

function isPrivateIp(host: string): boolean {
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return true;
  }
  return false;
}

/**
 * Validates that an external URL (e.g., custom AI Provider Base URL) is safe
 * from SSRF attacks against internal/metadata networks.
 */
export function validateExternalUrl(rawUrl: string): { valid: boolean; reason?: string; normalized?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, reason: "Only HTTP/HTTPS protocols are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || isPrivateIp(hostname) || hostname.endsWith(".local")) {
    return { valid: false, reason: "Private or internal network hosts are blocked" };
  }

  return {
    valid: true,
    normalized: parsed.toString().replace(/\/+$/, ""),
  };
}
