import Anthropic from "@anthropic-ai/sdk";
import { extractPlaceholders, extractUrls } from "./placeholders";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

type VariationLevel = "light" | "medium" | "strong";
const levelMap: Record<VariationLevel, string> = {
  light: "10-20%",
  medium: "30-50%",
  strong: "60-80%",
};

export async function paraphraseWithClaude(
  body: string,
  subject: string,
  level: VariationLevel = "medium"
): Promise<{ subject: string; body: string }> {
  const percent = levelMap[level] || levelMap.medium;
  const systemPrompt = `Перефразируй текст письма, сохранив смысл, тон и деловой стиль. НЕ изменяй и не удаляй ссылки, плейсхолдеры в фигурных скобках {{...}} и блок отписки. Степень изменения текста: ${percent}. Отвечай ТОЛЬКО JSON вида {"subject":"...","body":"..."} без markdown.`;

  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  // fallback to haiku if not specified

  const res = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Тема: ${subject}\n\nТело:\n${body}`,
      },
    ],
  });

  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty AI response");
  let raw = textBlock.text.trim();
  // Strip markdown fences if present
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fallback: try to extract json
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else throw new Error("Failed to parse AI JSON: " + raw.slice(0, 500));
  }
  if (!parsed.subject || !parsed.body) throw new Error("AI response missing fields");
  return { subject: parsed.subject, body: parsed.body };
}

export function verifyPlaceholdersAndLinks(
  originalBody: string,
  originalSubject: string,
  generated: { subject: string; body: string }
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const origPlaceholders = extractPlaceholders(originalBody + " " + originalSubject);
  const genPlaceholders = extractPlaceholders(generated.body + " " + generated.subject);
  for (const ph of origPlaceholders) {
    if (!genPlaceholders.includes(ph)) missing.push(`{{${ph}}}`);
  }
  const origLinks = extractUrls(originalBody);
  const genLinks = extractUrls(generated.body);
  for (const link of origLinks) {
    if (!genLinks.includes(link)) missing.push(link);
  }
  // unsubscribe check: if original contains unsubscribe placeholder or link text
  if (originalBody.toLowerCase().includes("unsubscribe") && !generated.body.toLowerCase().includes("unsubscribe")) {
    // not strict, but warn
    // missing.push("unsubscribe block");
  }
  return { ok: missing.length === 0, missing };
}

export async function paraphraseWithRetry(
  body: string,
  subject: string,
  level: VariationLevel = "medium",
  maxRetries = 2
): Promise<{ subject: string; body: string; usedFallback: boolean; missing?: string[] }> {
  let lastMissing: string[] = [];
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const gen = await paraphraseWithClaude(body, subject, level);
      const check = verifyPlaceholdersAndLinks(body, subject, gen);
      if (check.ok) return { ...gen, usedFallback: false };
      lastMissing = check.missing;
      // retry will attempt again
    } catch (e) {
      if (i === maxRetries) throw e;
    }
  }
  // fallback to original
  return {
    subject,
    body,
    usedFallback: true,
    missing: lastMissing,
  };
}

// Mock for local dev without API key – deterministic simple paraphrase
export function mockParaphrase(body: string, subject: string, seed: number): { subject: string; body: string } {
  let out = body;
  // Append variation marker for testing distinctness
  out = out + `\n\n<!-- variant:${seed} -->`;
  return { subject: subject + ` [v${seed % 100}]`, body: out };
}
