import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { mailboxes } from "@/lib/schema";
import { sendMail } from "@/lib/mailer";
import { desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { to } = await req.json().catch(() => ({ to: null }));
  const rows = await db.select().from(mailboxes).orderBy(desc(mailboxes.id)).limit(1);
  const mb = rows[0];
  if (!mb) return NextResponse.json({ error: "Ящик не настроен" }, { status: 400 });
  const recipient = to || mb.fromEmail;
  try {
    await sendMail({
      mailbox: mb as any,
      to: recipient,
      subject: "Тестовое письмо — Email Panel",
      html: "<p>Это тестовое письмо. Если вы его получили — SMTP настроен верно ✅</p>",
      text: "Это тестовое письмо. Если вы его получили — SMTP настроен верно",
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
