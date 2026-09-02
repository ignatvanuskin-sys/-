import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { suppressionList, campaignRecipients, recipients } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const c = searchParams.get("c");
  const r = searchParams.get("r");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (isDbConfigured()) {
    try {
      await db.insert(suppressionList).values({ email, reason: "unsubscribe link" }).onConflictDoNothing();
      if (c && r) {
        // mark campaign recipient as unsubscribed
        const cid = Number(c);
        // find campaignRecipient by campaign+recipient
        const crs = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, cid));
        for (const cr of crs) {
          const rec = await db.select().from(recipients).where(eq(recipients.id, cr.recipientId)).limit(1);
          if (rec[0]?.email.toLowerCase() === email.toLowerCase()) {
            await db.update(campaignRecipients).set({ status: "unsubscribed" }).where(eq(campaignRecipients.id, cr.id));
          }
        }
      }
    } catch {}
  }
  // Return simple HTML
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Отписка</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9f9f9"><div style="background:white;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:480px"><h1 style="font-size:20px;margin:0 0 12px">Вы отписались</h1><p>Адрес <b>${email}</b> добавлен в список отписки. Вы больше не получите рассылок.</p><a href="/" style="color:#2563eb">На главную</a></div></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (isDbConfigured()) {
    await db.insert(suppressionList).values({ email, reason: "manual" }).onConflictDoNothing();
  }
  return NextResponse.json({ ok: true });
}
