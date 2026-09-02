import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt, safeDecrypt } from "./crypto";

describe("crypto encrypt/decrypt", () => {
  const key = "test-encryption-key-32-chars-long!!";

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = key;
  });
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("roundtrips encrypt/decrypt", () => {
    const plain = "my-secret-password-123!@#";
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(enc.split(":")).toHaveLength(3);
    expect(decrypt(enc)).toBe(plain);
  });

  it("produces different ciphertexts for same plaintext (random IV)", () => {
    const a = encrypt("hello");
    const b = encrypt("hello");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("hello");
    expect(decrypt(b)).toBe("hello");
  });

  it("throws without ENCRYPTION_KEY", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY/);
    expect(() => decrypt("a:b:c")).toThrow();
  });

  it("safeDecrypt returns null on invalid payload", () => {
    expect(safeDecrypt("invalid")).toBeNull();
    expect(safeDecrypt("a:b:c")).toBeNull(); // bad base64
  });

  it("decrypt fails with wrong key", () => {
    const enc = encrypt("secret");
    process.env.ENCRYPTION_KEY = "different-key-32-chars-long!!-xxx";
    expect(() => decrypt(enc)).toThrow();
    expect(safeDecrypt(enc)).toBeNull();
  });

  it("handles empty string and unicode", () => {
    const enc = encrypt("");
    expect(decrypt(enc)).toBe("");
    const unicode = "Привет 🌍";
    expect(decrypt(encrypt(unicode))).toBe(unicode);
  });
});
