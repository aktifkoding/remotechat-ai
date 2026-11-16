import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    // Deterministic ephemeral fallback only for local dev/test when env is unset.
    // Production deployments MUST configure ENCRYPTION_MASTER_KEY.
    return crypto.createHash("sha256").update("remotechat-dev-ephemeral-key").digest();
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypts a sensitive credential using AES-256-GCM.
 * Format: v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
 */
export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts a credential encrypted by `encryptSecret`.
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted credential format");
  }
  const key = getMasterKey();
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Masks an API key or token for safe UI display (never exposes full secret).
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length <= 8) {
    return "••••••••";
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Redacts known secret patterns from logs and error messages.
 */
export function redactSecrets(input: string, knownSecrets: string[] = []): string {
  let output = input
    .replace(/(sk-[a-zA-Z0-9_-]{10,})/g, "sk-***REDACTED***")
    .replace(/(ghp_[a-zA-Z0-9]{10,}|github_pat_[a-zA-Z0-9_]{10,})/g, "ghp_***REDACTED***")
    .replace(/(sbp_[a-zA-Z0-9]{10,})/g, "sbp_***REDACTED***")
    .replace(/(Bearer\s+[a-zA-Z0-9._-]{12,})/gi, "Bearer ***REDACTED***");

  for (const secret of knownSecrets) {
    if (secret && secret.length >= 6) {
      output = output.split(secret).join("***REDACTED***");
    }
  }
  return output;
}
