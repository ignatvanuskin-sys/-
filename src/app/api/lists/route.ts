import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { recipientLists, recipients, suppressionList } from "@/lib/schema";
import { parseRecipientsInput } from "@/lib/recipients-parse";
import { desc, eq } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ lists: [] });
  const lists = await db.select().from(recipientLists).orderBy(desc(recipientLists.createdAt));
  // enrich with counts
  const enriched = await Promise.all(
    lists.map(async (l: typeof lists[number]) => {
      const recs = await db.select().from(recipients).where(eq(recipients.listId, l.id));
      return { ...l, count: recs.length };
    })
  );
  return NextResponse.json({ lists: enriched });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const body = await req.json();
  const { name, rawInput } = body;
  if (!name) return NextResponse.json({ error: "Название списка обязательно" }, { status: 400 });
  if (!rawInput) return NextResponse.json({ error: "Вставьте список" }, { status: 400 });

  const parsed = parseRecipientsInput(rawInput);
  const valid = parsed.recipients.filter((r) => r.valid);

  // Dedup against suppression + existing in this list creation (we will check suppression)
  const suppressionRows = await db.select().from(suppressionList);
  const suppressedSet = new Set(suppressionRows.map((s: typeof suppressionRows[number]) => s.email.toLowerCase()));

  const filtered = valid.filter((r) => !suppressedSet.has(r.email.toLowerCase()));

  // Create list
  const inserted = await db.insert(recipientLists).values({ name }).returning();
  const listId = inserted[0].id;

  // Deduplicate within input already counted, but insert unique
  const seen = new Set<string>();
  const toInsert: any[] = [];
  for (const r of filtered) {
    const lower = r.email.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    toInsert.push({
      listId,
      email: r.email,
      name: r.name || null,
      company: r.company || null,
      customFields: r.customFields || {},
      suppressed: false,
    });
  }
  if (toInsert.length) await db.insert(recipients).values(toInsert);

  return NextResponse.json({ list: inserted[0], parsed, insertedCount: toInsert.length, suppressedSkipped: valid.length - filtered.length });
}
