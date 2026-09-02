import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("auth bcrypt", () => {
  it("hashes and verifies correct password", async () => {
    const hash = await hashPassword("admin123");
    expect(hash).not.toBe("admin123");
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    expect(await verifyPassword("admin123", hash)).toBe(true);
  });

  it("fails on wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("same", h1)).toBe(true);
    expect(await verifyPassword("same", h2)).toBe(true);
  });

  it("handles long passwords", async () => {
    const long = "a".repeat(72); // bcrypt limit
    const hash = await hashPassword(long);
    expect(await verifyPassword(long, hash)).toBe(true);
  });
});
