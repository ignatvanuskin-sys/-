import { describe, it, expect } from "vitest";
import { isValidEmail, cn, getBaseUrl } from "./utils";

describe("isValidEmail", () => {
  it("validates correct emails", () => {
    expect(isValidEmail("a@test.com")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.example.co.uk")).toBe(true);
    expect(isValidEmail("ivan@test.com")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("@test.com")).toBe(false);
    expect(isValidEmail("a@test")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("a @test.com")).toBe(false);
  });
  it("trims spaces", () => {
    expect(isValidEmail(" a@test.com ")).toBe(true);
  });
});

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", false && "hidden")).toContain("text-red-500");
  });
});

describe("getBaseUrl", () => {
  it("returns NEXT_PUBLIC_APP_URL if set", () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(getBaseUrl()).toBe("https://example.com");
    if (orig) process.env.NEXT_PUBLIC_APP_URL = orig;
    else delete process.env.NEXT_PUBLIC_APP_URL;
  });
  it("falls back to localhost", () => {
    const origApp = process.env.NEXT_PUBLIC_APP_URL;
    const origVercel = process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    expect(getBaseUrl()).toBe("http://localhost:3000");
    if (origApp) process.env.NEXT_PUBLIC_APP_URL = origApp;
    if (origVercel) process.env.VERCEL_URL = origVercel;
  });
});
