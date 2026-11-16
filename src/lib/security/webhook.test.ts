import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubWebhookSignature, verifyVercelWebhookSignature } from "./webhook";

describe("Webhook signature verification", () => {
  it("verifies valid GitHub HMAC-SHA256 signatures and rejects invalid ones", () => {
    const payload = JSON.stringify({ action: "opened" });
    const secret = "gh-webhook-secret";
    const sig = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;

    expect(verifyGitHubWebhookSignature(payload, sig, secret)).toBe(true);
    expect(verifyGitHubWebhookSignature(payload, "sha256=deadbeef", secret)).toBe(false);
  });

  it("verifies valid Vercel HMAC-SHA1 signatures", () => {
    const payload = JSON.stringify({ type: "deployment.ready" });
    const secret = "vercel-secret";
    const sig = crypto.createHmac("sha1", secret).update(payload).digest("hex");

    expect(verifyVercelWebhookSignature(payload, sig, secret)).toBe(true);
    expect(verifyVercelWebhookSignature(payload, "wrong", secret)).toBe(false);
  });
});
