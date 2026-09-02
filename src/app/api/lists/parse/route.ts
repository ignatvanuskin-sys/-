import { NextRequest, NextResponse } from "next/server";
import { parseRecipientsInput } from "@/lib/recipients-parse";
import { db, isDbConfigured } from "@/lib/db";
import { recipients, suppressionList } from "@/lib/schema";
export async function POST(req: NextRequest) {
  const { rawInput } = await req.json();
  if (!rawInput) return NextResponse.json({ error: "rawInput required" }, { status: 400 });
  const parsed = parseRecipientsInput(rawInput);

  // Optional checks against DB duplicates & suppression if DB configured
  let existingSet = new Set<string>();
  let suppressedSet = new Set<string>();
  if (isDbConfigured()) {
    try {
      const validEmails = parsed.recipients.filter((r) => r.valid).map((r) => r.email.toLowerCase());
      if (validEmails.length) {
        const existing = await db.select().from(recipients);
        existingSet = new Set(existing.map((r: typeof existing[number]) => r.email.toLowerCase()));
        const suppressed = await db.select().from(suppressionList);
        suppressedSet = new Set(suppressed.map((s: typeof suppressed[number]) => s.email.toLowerCase()));
      }
    } catch {}
  }

  const enriched = parsed.recipients.map((r) => ({
    ...r,
    isDuplicateExisting: existingSet.has(r.email.toLowerCase()),
    isSuppressed: suppressedSet.has(r.email.toLowerCase()),
  }));

  return NextResponse.json({ ...parsed, recipients: enriched });
}
