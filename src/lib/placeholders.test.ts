import { describe, it, expect } from "vitest";
import { renderPlaceholders, extractPlaceholders, extractUrls } from "./placeholders";

describe("renderPlaceholders", () => {
  it("replaces {{name}}, {{company}}, {{email}}", () => {
    const tmpl = "Привет {{name}}, из {{company}} ({{email}})";
    expect(renderPlaceholders(tmpl, { name: "Иван", company: "ООО", email: "a@test.com" })).toBe("Привет Иван, из ООО (a@test.com)");
  });
  it("leaves unknown placeholder as is", () => {
    expect(renderPlaceholders("Hi {{unknown}}", {})).toBe("Hi {{unknown}}");
  });
  it("handles custom fields", () => {
    expect(renderPlaceholders("City {{city}}", { city: "Москва" })).toBe("City Москва");
  });
  it("handles missing data as empty string not undefined", () => {
    expect(renderPlaceholders("Hi {{name}}", { name: "" })).toBe("Hi ");
  });
});

describe("extractPlaceholders", () => {
  it("extracts all placeholders", () => {
    expect(extractPlaceholders("{{name}} {{company}} {{email}}")).toEqual(["name", "company", "email"]);
  });
  it("handles duplicates", () => {
    expect(extractPlaceholders("{{name}} and {{name}}")).toEqual(["name", "name"]);
  });
  it("returns empty when none", () => {
    expect(extractPlaceholders("no placeholders")).toEqual([]);
  });
});

describe("extractUrls", () => {
  it("extracts https URLs", () => {
    const text = "Ссылка https://example.com и https://test.com/page?x=1";
    const urls = extractUrls(text);
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("https://test.com/page?x=1");
  });
  it("extracts http too", () => {
    expect(extractUrls("http://a.com")).toEqual(["http://a.com"]);
  });
  it("returns empty when no urls", () => {
    expect(extractUrls("no links")).toEqual([]);
  });
});
