import { describe, it, expect } from "vitest";
import { verifyPlaceholdersAndLinks, mockParaphrase } from "./ai";

describe("verifyPlaceholdersAndLinks", () => {
  it("passes when all placeholders and links preserved", () => {
    const origBody = "Привет {{name}}, ссылка https://example.com и {{company}}";
    const origSubject = "Тема {{name}}";
    const gen = { subject: "Тема {{name}}", body: "Привет {{name}}, ссылка https://example.com и {{company}}" };
    expect(verifyPlaceholdersAndLinks(origBody, origSubject, gen)).toEqual({ ok: true, missing: [] });
  });
  it("detects missing placeholder", () => {
    const origBody = "Привет {{name}} {{company}}";
    const gen = { subject: "Hi", body: "Привет" };
    const res = verifyPlaceholdersAndLinks(origBody, "Тема", gen);
    expect(res.ok).toBe(false);
    expect(res.missing).toContain("{{name}}");
    expect(res.missing).toContain("{{company}}");
  });
  it("detects missing link", () => {
    const origBody = "Ссылка https://example.com";
    const gen = { subject: "Тема", body: "Без ссылки" };
    const res = verifyPlaceholdersAndLinks(origBody, "Тема", gen);
    expect(res.missing).toContain("https://example.com");
  });
  it("handles multiple links", () => {
    const origBody = "https://a.com и https://b.com";
    const gen = { subject: "s", body: "https://a.com" };
    const res = verifyPlaceholdersAndLinks(origBody, "s", gen);
    expect(res.missing).toContain("https://b.com");
    expect(res.missing).not.toContain("https://a.com");
  });
  it("passes when orig has no placeholders/links", () => {
    expect(verifyPlaceholdersAndLinks("plain", "plain", { subject: "s", body: "b" }).ok).toBe(true);
  });
});

describe("mockParaphrase", () => {
  it("produces distinct variants for different seeds", () => {
    const body = "Привет {{name}} https://example.com";
    const subject = "Тема {{company}}";
    const variants = [1, 2, 3].map((seed) => mockParaphrase(body, subject, seed));
    const bodies = variants.map((v) => v.body);
    expect(new Set(bodies).size).toBe(3);
  });
  it("preserves placeholders and links in mock", () => {
    const body = "Привет {{name}} {{company}} https://example.com";
    const res = mockParaphrase(body, "Тема {{name}}", 42);
    expect(res.body).toContain("{{name}}");
    expect(res.body).toContain("{{company}}");
    expect(res.body).toContain("https://example.com");
    expect(res.body).toContain("<!-- variant:42 -->");
  });
  it("modifies subject with seed", () => {
    const res = mockParaphrase("body", "Subject", 7);
    expect(res.subject).toBe("Subject [v7]");
  });
});
