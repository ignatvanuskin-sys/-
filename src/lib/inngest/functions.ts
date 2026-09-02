import { inngest } from "./client";
import { db } from "../db";
import { campaigns, campaignRecipients, recipients, suppressionList, mailboxes, templates } from "../schema";
import { eq, and } from "@/lib/db";
import { parseSpintax } from "../spintax";
import { renderPlaceholders } from "../placeholders";
import { paraphraseWithRetry, mockParaphrase } from "../ai";
import { sendMail } from "../mailer";
import { marked } from "marked";

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function shouldRespectWindow(start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s <= e) return !(cur >= s && cur <= e);
  // overnight window
  return !(cur >= s || cur <= e);
}

export const sendCampaignFn = inngest.createFunction(
  { id: "send-campaign", retries: 0, triggers: [{ event: "campaign/send" }] } as any,
  async ({ event, step }: any) => {
    const { campaignId } = event.data as { campaignId: number };
    // Load campaign
    const campaignRows = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaignRows.length) throw new Error("Campaign not found");
    const campaign = campaignRows[0];

    await step.run("mark-running", async () => {
      await db.update(campaigns).set({ status: "running" }).where(eq(campaigns.id, campaignId));
    });

    // Load mailbox
    let mailbox: any = null;
    if (campaign.mailboxId) {
      const mb = await db.select().from(mailboxes).where(eq(mailboxes.id, campaign.mailboxId)).limit(1);
      mailbox = mb[0] || null;
    }
    if (!mailbox) {
      const allMb = await db.select().from(mailboxes).limit(1);
      mailbox = allMb[0];
    }
    if (!mailbox) throw new Error("No mailbox configured");

    // Load template
    const tmplRows = await db.select().from(templates).where(eq(templates.id, campaign.templateId!)).limit(1);
    const template = tmplRows[0];
    if (!template) throw new Error("Template not found");

    // Load recipients for campaign
    const crRows = await db
      .select({
        cr: campaignRecipients,
        recipient: recipients,
      })
      .from(campaignRecipients)
      .innerJoin(recipients, eq(campaignRecipients.recipientId, recipients.id))
      .where(eq(campaignRecipients.campaignId, campaignId));

    let sentCountToday = 0;
    const dailyLimit = campaign.dailyLimit || 300;

    for (const row of crRows) {
      // check campaign status for pause/cancel
      const fresh = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
      if (fresh[0]?.status === "paused") {
        await step.sleep("paused-wait", "5m");
        // re-check after sleep; loop will continue but we want to exit until resumed
        // For MVP, break and keep queued
        break;
      }
      if (fresh[0]?.status === "cancelled") break;

      // check suppression
      const suppressed = await db.select().from(suppressionList).where(eq(suppressionList.email, row.recipient.email)).limit(1);
      if (suppressed.length) {
        await db.update(campaignRecipients).set({ status: "skipped", errorMessage: "suppressed" }).where(eq(campaignRecipients.id, row.cr.id));
        continue;
      }

      // check global stop
      // skip if already sent
      if (row.cr.status === "sent") continue;

      // daily limit
      if (sentCountToday >= dailyLimit) {
        // sleep until next day? For MVP just break
        break;
      }

      // send window
      if (await shouldRespectWindow(campaign.sendWindowStart, campaign.sendWindowEnd)) {
        // In real Inngest, we'd sleep until window; here step.sleep 10m
        await step.sleep("window-wait", "10m");
      }

      const result = await step.run(`send-${row.cr.id}`, async () => {
        // Build content per recipient
        let subject = template.subject;
        let body = template.body;

        // Apply spintax if needed
        if (campaign.mode === "spintax" || campaign.mode === "combined") {
          subject = parseSpintax(subject);
          body = parseSpintax(body);
        }

        // Render placeholders
        const data: Record<string, string> = {
          email: row.recipient.email,
          name: row.recipient.name || "",
          company: row.recipient.company || "",
          ...(row.recipient.customFields as any || {}),
        };
        subject = renderPlaceholders(subject, data);
        body = renderPlaceholders(body, data);

        // AI mode
        let usedFallback = false;
        if (campaign.mode === "ai" || campaign.mode === "combined") {
          try {
            if (!process.env.ANTHROPIC_API_KEY) {
              const mock = mockParaphrase(body, subject, row.cr.id);
              subject = mock.subject;
              body = mock.body;
            } else {
              const res = await paraphraseWithRetry(body, subject, campaign.variationLevel as any, 2);
              subject = res.subject;
              body = res.body;
              usedFallback = res.usedFallback;
              if (usedFallback) {
                console.warn("AI fallback used for cr", row.cr.id, res.missing);
              }
            }
          } catch (e: any) {
            console.error("AI error", e?.message);
            // fallback to original
            usedFallback = true;
          }
        } else {
          // For spintax-only, still verify that placeholders preserved (they are)
        }

        // Final verification for AI: ensure placeholders still there (already done inside retry)
        // Convert markdown to html
        let html: string;
        try {
          html = (marked as any).parse(body) as unknown as string;
          // simple fallback if not html: wrap
          if (!html.includes("<")) html = `<p>${body.replace(/\n/g, "<br/>")}</p>`;
        } catch {
          html = `<p>${body.replace(/\n/g, "<br/>")}</p>`;
        }

        // Try send with exponential backoff
        let attempt = 0;
        const maxAttempts = 3;
        while (attempt < maxAttempts) {
          try {
            await sendMail({
              mailbox,
              to: row.recipient.email,
              subject,
              html,
              text: body,
              campaignId,
              recipientId: row.recipient.id,
            });
            await db
              .update(campaignRecipients)
              .set({ status: "sent", sentSubject: subject, sentBody: body, sentAt: new Date(), errorMessage: null })
              .where(eq(campaignRecipients.id, row.cr.id));
            return { ok: true, subject, body };
          } catch (err: any) {
            attempt++;
            const msg = err?.message || String(err);
            const isPermanent = /invalid|bounce|550|551|552|553/i.test(msg);
            if (isPermanent || attempt >= maxAttempts) {
              await db
                .update(campaignRecipients)
                .set({ status: "error", errorMessage: msg, sentSubject: subject, sentBody: body })
                .where(eq(campaignRecipients.id, row.cr.id));
              return { ok: false, error: msg };
            }
            // exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        return { ok: false, error: "unknown" };
      });

      if ((result as any)?.ok) sentCountToday++;

      // Inter-message delay
      const d = randomDelay(campaign.delayMinSec, campaign.delayMaxSec) * 1000;
      if (d > 0) await step.sleep(`delay-${row.cr.id}`, `${Math.ceil(d / 1000)}s` as any);
    }

    await step.run("mark-completed", async () => {
      // If not paused/cancelled, mark completed if all queued processed
      const remaining = await db
        .select()
        .from(campaignRecipients)
        .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, "queued")));
      if (remaining.length === 0) {
        await db.update(campaigns).set({ status: "completed" }).where(eq(campaigns.id, campaignId));
      }
    });

    return { campaignId, done: true };
  }
);
