import { describe, expect, it } from "vitest";
import { validateExternalUrl } from "./ssrf";

describe("SSRF external URL validator", () => {
  it("blocks internal and metadata IP addresses", () => {
    expect(validateExternalUrl("http://127.0.0.1:8080/v1").valid).toBe(false);
    expect(validateExternalUrl("http://localhost:3000/v1").valid).toBe(false);
    expect(validateExternalUrl("http://169.254.169.254/latest/meta-data").valid).toBe(false);
    expect(validateExternalUrl("http://192.168.1.10/v1").valid).toBe(false);
    expect(validateExternalUrl("http://10.0.0.5/v1").valid).toBe(false);
  });

  it("allows valid external HTTPS AI provider URLs and trims trailing slash", () => {
    const res = validateExternalUrl("https://api.openai.com/v1/");
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe("https://api.openai.com/v1");
  });
});
