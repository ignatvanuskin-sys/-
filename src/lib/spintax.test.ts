import { describe, it, expect } from "vitest";
import { parseSpintax, hasSpintax } from "./spintax";

describe("parseSpintax", () => {
  it("replaces {a|b} with one option", () => {
    const res = parseSpintax("{Привет|Здравствуйте}, Иван!");
    expect(["Привет, Иван!", "Здравствуйте, Иван!"]).toContain(res);
  });

  it("preserves {{placeholder}} double braces", () => {
    const tmpl = "{Привет|Здравствуйте}, {{name}}!";
    for (let i = 0; i < 10; i++) {
      const res = parseSpintax(tmpl);
      expect(res).toContain("{{name}}");
      // Ensure placeholder not corrupted to single braces: should contain exactly "{{name}}" not just "{name}" without outer
      expect(res).toMatch(/\{\{name\}\}/);
    }
  });

  it("handles nested spintax", () => {
    const tmpl = "{Привет|Здравствуйте} {Иван|Пётр}";
    const res = parseSpintax(tmpl);
    expect(res).toMatch(/^(Привет|Здравствуйте) (Иван|Пётр)$/);
  });

  it("returns same when no spintax", () => {
    const tmpl = "Привет {{name}}, ссылка https://example.com";
    expect(parseSpintax(tmpl)).toBe(tmpl);
  });

  it("handles multiple spintax blocks independently", () => {
    const tmpl = "{a|b} {c|d}";
    const results = new Set(Array.from({ length: 20 }, () => parseSpintax(tmpl)));
    // Should have up to 4 variants
    expect(results.size).toBeGreaterThan(1);
    expect(results.size).toBeLessThanOrEqual(4);
  });

  it("produces different variants over many runs (randomness)", () => {
    const tmpl = "{Привет|Здравствуйте|Добрый день}, {{name}}!";
    const outs = new Set(Array.from({ length: 20 }, () => parseSpintax(tmpl)));
    expect(outs.size).toBeGreaterThan(1);
  });

  it("does not treat {{name}} as spintax", () => {
    expect(parseSpintax("{{name}}")).toBe("{{name}}");
    expect(parseSpintax("{{company}}")).toBe("{{company}}");
  });
});

describe("hasSpintax", () => {
  it("detects {a|b}", () => {
    expect(hasSpintax("{a|b}")).toBe(true);
    expect(hasSpintax("Привет {Иван|Пётр}")).toBe(true);
  });
  it("ignores {{placeholder}}", () => {
    expect(hasSpintax("{{name}}")).toBe(false);
    expect(hasSpintax("Привет {{name}}")).toBe(false);
  });
  it("returns false when no |", () => {
    expect(hasSpintax("{a}")).toBe(false);
    expect(hasSpintax("no spintax")).toBe(false);
  });
});
