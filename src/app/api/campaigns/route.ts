import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { campaigns, campaignRecipients, recipients } from "@/lib/schema";
import { desc, eq } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ campaigns: [] });
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  const enriched = await Promise.all(
    rows.map(async (c: typeof rows[number]) => {
      const crs = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, c.id));
      const counts = {
        queued: crs.filter((r: typeof crs[number]) => r.status === "queued").length,
        sent: crs.filter((r: typeof crs[number]) => r.status === "sent").length,
        error: crs.filter((r: typeof crs[number]) => r.status === "error").length,
        skipped: crs.filter((r: typeof crs[number]) => r.status === "skipped").length,
        total: crs.length,
      };
      return { ...c, counts };
    })
  );
  return NextResponse.json({ campaigns: enriched });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const body = await req.json();
  const { name, templateId, listId, mailboxId, mode, variationLevel, delayMinSec, delayMaxSec, dailyLimit, sendWindowStart, sendWindowEnd, scheduledAt } = body;
  if (!name || !templateId || !listId) return NextResponse.json({ error: "Название, шаблон и список обязательны" }, { status: 400 });

  const inserted = await db.insert(campaigns).values({
    name,
    templateId: Number(templateId),
    listId: Number(listId),
    mailboxId: mailboxId ? Number(mailboxId) : null,
    mode: mode || "spintax",
    variationLevel: variationLevel || "medium",
    delayMinSec: Number(delayMinSec) || 30,
    delayMaxSec: Number(delayMaxSec) || 90,
    dailyLimit: Number(dailyLimit) || 300,
    sendWindowStart: sendWindowStart || null,
    sendWindowEnd: sendWindowEnd || null,
    status: "draft",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  }).returning();
  const campaign = inserted[0];

  // Populate campaign_recipients from list
  const listRecipients = await db.select().from(recipients).where(eq(recipients.listId, Number(listId)));
  if (listRecipients.length) {
    const values = listRecipients.map((r: typeof listRecipients[number]) => ({
      campaignId: campaign.id,
      recipientId: r.id,
      status: "queued" as const,
    }));
    await db.insert(campaignRecipients).values(values);
  }

  return NextResponse.json({ campaign });
}
