import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret, redactSecrets } from "./crypto";

describe("encryption & secret redaction", () => {
  it("encrypts and decrypts secrets roundtrip with AES-256-GCM", () => {
    const secret = "sk-test-super-secret-api-key-123456";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("masks secrets safely without exposing middle characters", () => {
    expect(maskSecret("sk-1234567890abcdef")).toBe("sk-1••••••••cdef");
    expect(maskSecret("short")).toBe("••••••••");
  });

  it("redacts API keys and tokens from logs", () => {
    const msg = "Failed calling https://api.openai.com with Bearer sk-abcdefghijklmnop";
    const redacted = redactSecrets(msg);
    expect(redacted).not.toContain("sk-abcdefghijklmnop");
    expect(redacted).toContain("REDACTED");
  });
});
