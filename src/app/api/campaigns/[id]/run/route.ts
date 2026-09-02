import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { campaigns, campaignRecipients, recipients, suppressionList, mailboxes, templates, globalSettings } from "@/lib/schema";
import { eq } from "@/lib/db";
import { parseSpintax } from "@/lib/spintax";
import { renderPlaceholders } from "@/lib/placeholders";
import { mockParaphrase, paraphraseWithRetry } from "@/lib/ai";
import { sendMail } from "@/lib/mailer";
import { marked } from "marked";

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const cid = Number(id);

  const camRows = await db.select().from(campaigns).where(eq(campaigns.id, cid)).limit(1);
  if (!camRows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const campaign = camRows[0];

  // Check global stop
  const gs = await db.select().from(globalSettings).limit(1);
  if (gs[0]?.stopAll) return NextResponse.json({ error: "Рассылки глобально остановлены" }, { status: 400 });

  // Mailbox
  let mailbox: any = null;
  if (campaign.mailboxId) mailbox = (await db.select().from(mailboxes).where(eq(mailboxes.id, campaign.mailboxId)).limit(1))[0];
  if (!mailbox) mailbox = (await db.select().from(mailboxes).limit(1))[0];
  if (!mailbox) return NextResponse.json({ error: "Mailbox not configured" }, { status: 400 });

  const tmpl = (await db.select().from(templates).where(eq(templates.id, campaign.templateId!)).limit(1))[0];
  if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 400 });

  const crs = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, cid));
  const queued = crs.filter((r: typeof crs[number]) => r.status === "queued");
  if (!queued.length) return NextResponse.json({ ok: true, message: "No queued recipients" });

  // Set status running
  await db.update(campaigns).set({ status: "running" }).where(eq(campaigns.id, cid));

  // Process synchronously with delays (for demo/MVP) – in production should be Inngest
  let processed = 0;
  for (const cr of queued) {
    // Check pause/cancel each iteration
    const fresh = (await db.select().from(campaigns).where(eq(campaigns.id, cid)).limit(1))[0];
    if (fresh.status === "paused") break;
    if (fresh.status === "cancelled") break;

    const rec = (await db.select().from(recipients).where(eq(recipients.id, cr.recipientId)).limit(1))[0];
    if (!rec) {
      await db.update(campaignRecipients).set({ status: "error", errorMessage: "recipient not found" }).where(eq(campaignRecipients.id, cr.id));
      continue;
    }
    const suppressed = await db.select().from(suppressionList).where(eq(suppressionList.email, rec.email)).limit(1);
    if (suppressed.length) {
      await db.update(campaignRecipients).set({ status: "skipped", errorMessage: "suppressed" }).where(eq(campaignRecipients.id, cr.id));
      continue;
    }

    // Build
    let subject = tmpl.subject;
    let body = tmpl.body;
    if (campaign.mode === "spintax" || campaign.mode === "combined") {
      subject = parseSpintax(subject);
      body = parseSpintax(body);
    }
    const data: Record<string, string> = {
      email: rec.email,
      name: rec.name || "",
      company: rec.company || "",
      ...(rec.customFields as any || {}),
    };
    subject = renderPlaceholders(subject, data);
    body = renderPlaceholders(body, data);

    if (campaign.mode === "ai" || campaign.mode === "combined") {
      try {
        if (!process.env.ANTHROPIC_API_KEY) {
          const mock = mockParaphrase(body, subject, cr.id);
          subject = mock.subject;
          body = mock.body;
        } else {
          const res = await paraphraseWithRetry(body, subject, campaign.variationLevel as any, 2);
          subject = res.subject;
          body = res.body;
        }
      } catch (e: any) {
        console.error("ai err", e?.message);
      }
    }

    let html: string;
    try {
      html = await (marked as any).parse(body);
      if (!html.includes("<")) html = `<p>${body.replace(/\n/g, "<br/>")}</p>`;
    } catch {
      html = `<p>${body.replace(/\n/g, "<br/>")}</p>`;
    }

    try {
      await sendMail({ mailbox: mailbox as any, to: rec.email, subject, html, text: body, campaignId: cid, recipientId: rec.id });
      await db.update(campaignRecipients).set({ status: "sent", sentSubject: subject, sentBody: body, sentAt: new Date(), errorMessage: null }).where(eq(campaignRecipients.id, cr.id));
      processed++;
    } catch (e: any) {
      await db.update(campaignRecipients).set({ status: "error", errorMessage: e?.message || String(e), sentSubject: subject, sentBody: body }).where(eq(campaignRecipients.id, cr.id));
      // continue – do not stop campaign
    }

    // delay between mails (skip last)
    const isLast = cr === queued[queued.length - 1];
    if (!isLast) {
      const delaySec = randomDelay(campaign.delayMinSec, campaign.delayMaxSec);
      // For real async we would schedule; here we await
      if (delaySec > 0 && delaySec < 10) {
        await new Promise((r) => setTimeout(r, delaySec * 1000));
      } else if (delaySec >= 10) {
        // For long delays in run endpoint, we break after one batch to avoid timeout, let client re-trigger
        // Mark remaining as still queued and return; next call will continue
        // We do this to avoid Vercel 10s limit
        if (processed >= 3) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // daily limit check
    const sentTodayCount = (await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, cid))).filter((r: typeof crs[number]) => r.status === "sent").length;
    if (sentTodayCount >= (campaign.dailyLimit || 300)) break;
  }

  // If no queued left, mark completed
  const remaining = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, cid));
  const stillQueued = remaining.filter((r: typeof remaining[number]) => r.status === "queued").length;
  if (stillQueued === 0) {
    await db.update(campaigns).set({ status: "completed" }).where(eq(campaigns.id, cid));
  }

  return NextResponse.json({ ok: true, processed, remainingQueued: stillQueued });
}
