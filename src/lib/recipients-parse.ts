import { isValidEmail } from "./utils";

export type ParsedRecipient = {
  email: string;
  name?: string;
  company?: string;
  customFields?: Record<string, string>;
  valid: boolean;
  error?: string;
};

export type ParseResult = {
  recipients: ParsedRecipient[];
  validCount: number;
  invalidCount: number;
  duplicatesInInput: number;
  headerDetected: boolean;
  format: "comma" | "table" | "lines";
};

// Main entry: auto-detect
export function parseRecipientsInput(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { recipients: [], validCount: 0, invalidCount: 0, duplicatesInInput: 0, headerDetected: false, format: "comma" };

  // Detect table (tab-separated or contains newline with email pattern in lines)
  const hasTab = trimmed.includes("\t");
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // If single line with commas and no tabs -> comma mode
  if (!hasTab && lines.length === 1 && trimmed.includes(",")) {
    return parseComma(trimmed);
  }
  if (hasTab || lines.length > 1) {
    // Try table parse, but if each line is just an email or comma list inside? We'll detect
    // If lines all single emails without tabs -> treat as lines
    const avgTabs = lines.filter((l) => l.includes("\t")).length;
    if (avgTabs > 0) {
      return parseTable(trimmed);
    }
    // If lines like "email, email, ..." per line? still table fallback
    // Check if lines look like header
    if (lines.length > 1) {
      // heuristic: if first line contains "email" word
      const first = lines[0].toLowerCase();
      if (first.includes("email") || first.includes("e-mail")) {
        return parseTable(trimmed);
      }
      // if lines each contain tabs -> table, else if each line is single email -> lines
      // Actually treat as line-separated emails
      if (lines.every((l) => !l.includes("\t") && !l.includes(","))) {
        // lines of single emails
        return parseLines(trimmed);
      }
      // Mixed: fallback to table with comma/tab detection per line
      // For simplicity, if no tabs but multiple lines, treat as lines or comma mixed
      if (!hasTab) {
        // Could be comma-separated across lines? join and parseComma
        const joined = lines.join(",");
        if (joined.includes(",")) return parseComma(joined);
        return parseLines(trimmed);
      }
      return parseTable(trimmed);
    }
  }
  // Default comma
  if (trimmed.includes(",")) return parseComma(trimmed);
  return parseLines(trimmed);
}

function parseComma(raw: string): ParseResult {
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const recipients: ParsedRecipient[] = [];
  const seen = new Set<string>();
  let duplicatesInInput = 0;
  for (const p of parts) {
    const email = p.trim();
    const lower = email.toLowerCase();
    const isDup = seen.has(lower);
    if (isDup) duplicatesInInput++;
    else seen.add(lower);
    const valid = isValidEmail(email);
    recipients.push({
      email,
      valid,
      error: valid ? undefined : "invalid email",
    });
  }
  return {
    recipients,
    validCount: recipients.filter((r) => r.valid).length,
    invalidCount: recipients.filter((r) => !r.valid).length,
    duplicatesInInput,
    headerDetected: false,
    format: "comma",
  };
}

function parseLines(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const recipients: ParsedRecipient[] = [];
  const seen = new Set<string>();
  let duplicatesInInput = 0;
  for (const line of lines) {
    const email = line.trim();
    const lower = email.toLowerCase();
    const isDup = seen.has(lower);
    if (isDup) duplicatesInInput++;
    else seen.add(lower);
    const valid = isValidEmail(email);
    recipients.push({ email, valid, error: valid ? undefined : "invalid email" });
  }
  return {
    recipients,
    validCount: recipients.filter((r) => r.valid).length,
    invalidCount: recipients.filter((r) => !r.valid).length,
    duplicatesInInput,
    headerDetected: false,
    format: "lines",
  };
}

function parseTable(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { recipients: [], validCount: 0, invalidCount: 0, duplicatesInInput: 0, headerDetected: false, format: "table" };

  // Detect separator: tab vs comma vs semicolon
  const firstLine = lines[0];
  let sep: string | RegExp = "\t";
  if (firstLine.includes("\t")) sep = "\t";
  else if (firstLine.includes(";")) sep = ";";
  else if (firstLine.includes(",")) sep = ",";
  else sep = /\s{2,}/; // fallback multi-space

  // Split helper
  const splitLine = (line: string): string[] => {
    if (sep === "\t") return line.split("\t").map((s) => s.trim());
    if (typeof sep === "string") return line.split(sep).map((s) => s.trim());
    return line.split(sep).map((s) => s.trim());
  };

  // Detect header
  const headerCandidates = splitLine(lines[0]).map((h) => h.toLowerCase());
  const headerDetected =
    headerCandidates.some((h) => ["email", "e-mail", "mail", "name", "company"].includes(h)) ||
    headerCandidates.includes("email");

  let startIdx = 0;
  let colIdx: Record<string, number> = {};
  if (headerDetected) {
    startIdx = 1;
    headerCandidates.forEach((h, i) => {
      const key = h.trim().toLowerCase();
      if (["email", "e-mail", "mail"].includes(key)) colIdx["email"] = i;
      else if (key === "name") colIdx["name"] = i;
      else if (key === "company") colIdx["company"] = i;
      else colIdx[key] = i; // custom
    });
  } else {
    // Auto: first col email, second name, third company
    colIdx = { email: 0, name: 1, company: 2 };
  }

  const recipients: ParsedRecipient[] = [];
  const seen = new Set<string>();
  let duplicatesInInput = 0;

  for (let idx = startIdx; idx < lines.length; idx++) {
    const cols = splitLine(lines[idx]);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;
    const email = (cols[colIdx["email"]] || cols[0] || "").trim();
    if (!email) continue;
    const lower = email.toLowerCase();
    const isDup = seen.has(lower);
    if (isDup) duplicatesInInput++;
    else seen.add(lower);
    const name = colIdx["name"] !== undefined ? cols[colIdx["name"]] : cols[1];
    const company = colIdx["company"] !== undefined ? cols[colIdx["company"]] : cols[2];
    const customFields: Record<string, string> = {};
    // collect any extra columns beyond known
    Object.keys(colIdx).forEach((k) => {
      if (!["email", "name", "company"].includes(k)) {
        const v = cols[colIdx[k]];
        if (v) customFields[k] = v;
      }
    });
    const valid = isValidEmail(email);
    recipients.push({
      email,
      name: name?.trim() || undefined,
      company: company?.trim() || undefined,
      customFields: Object.keys(customFields).length ? customFields : undefined,
      valid,
      error: valid ? undefined : "invalid email",
    });
  }

  return {
    recipients,
    validCount: recipients.filter((r) => r.valid).length,
    invalidCount: recipients.filter((r) => !r.valid).length,
    duplicatesInInput,
    headerDetected,
    format: "table",
  };
}
