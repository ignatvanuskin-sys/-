import { describe, it, expect } from "vitest";
import { parseRecipientsInput } from "./recipients-parse";

describe("parseRecipientsInput", () => {
  it("parses comma-separated with spaces and empty elements", () => {
    const raw = " a@test.com , b@test.com ,  , c@test.com ,, ";
    const res = parseRecipientsInput(raw);
    expect(res.format).toBe("comma");
    expect(res.validCount).toBe(3);
    expect(res.invalidCount).toBe(0);
    expect(res.duplicatesInInput).toBe(0);
    expect(res.recipients.map((r) => r.email)).toEqual(["a@test.com", "b@test.com", "c@test.com"]);
  });

  it("detects duplicates case-insensitive", () => {
    const raw = "a@test.com, A@test.com, b@test.com";
    const res = parseRecipientsInput(raw);
    expect(res.duplicatesInInput).toBe(1);
    expect(res.validCount).toBe(3); // includes duplicate as valid
  });

  it("filters invalid emails", () => {
    const raw = "valid@test.com, invalid-email, also@valid.com, @bad";
    const res = parseRecipientsInput(raw);
    expect(res.validCount).toBe(2);
    expect(res.invalidCount).toBe(2);
    expect(res.recipients.filter((r) => !r.valid).map((r) => r.email)).toContain("invalid-email");
  });

  it("parses tab-separated table with header", () => {
    const raw = "email\tname\tcompany\nivan@test.com\tИван\tООО Ромашка\npetr@test.com\tПётр\tИП Петров";
    const res = parseRecipientsInput(raw);
    expect(res.format).toBe("table");
    expect(res.headerDetected).toBe(true);
    expect(res.validCount).toBe(2);
    expect(res.recipients[0].email).toBe("ivan@test.com");
    expect(res.recipients[0].name).toBe("Иван");
    expect(res.recipients[0].company).toBe("ООО Ромашка");
  });

  it("parses table without header (auto cols)", () => {
    const raw = "ivan@test.com\tИван\tООО\npetr@test.com\tПётр\tИП";
    const res = parseRecipientsInput(raw);
    expect(res.headerDetected).toBe(false);
    expect(res.format).toBe("table");
    expect(res.recipients[0].email).toBe("ivan@test.com");
    expect(res.recipients[0].name).toBe("Иван");
  });

  it("parses custom fields beyond email/name/company", () => {
    const raw = "email\tname\tcompany\tcity\nivan@test.com\tИван\tООО\tМосква";
    const res = parseRecipientsInput(raw);
    expect(res.recipients[0].customFields).toEqual({ city: "Москва" });
  });

  it("parses semicolon-separated table", () => {
    const raw = "email;name;company\nivan@test.com;Иван;ООО";
    const res = parseRecipientsInput(raw);
    expect(res.format).toBe("table");
    expect(res.recipients[0].email).toBe("ivan@test.com");
  });

  it("parses lines of single emails", () => {
    const raw = "a@test.com\nb@test.com\nc@test.com";
    const res = parseRecipientsInput(raw);
    expect(res.validCount).toBe(3);
    expect(res.format).toBe("lines");
  });

  it("parses comma across multiple lines", () => {
    const raw = "a@test.com, b@test.com\nc@test.com, d@test.com";
    const res = parseRecipientsInput(raw);
    expect(res.validCount).toBe(4);
  });

  it("handles empty input", () => {
    const res = parseRecipientsInput("   ");
    expect(res.recipients).toEqual([]);
    expect(res.validCount).toBe(0);
  });

  it("handles duplicates in table", () => {
    const raw = "email\tname\nivan@test.com\tИван\nivan@test.com\tИван2";
    const res = parseRecipientsInput(raw);
    expect(res.duplicatesInInput).toBe(1);
  });
});
