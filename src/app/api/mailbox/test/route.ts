import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailboxes } from "@/lib/schema";
import { sendMail } from "@/lib/mailer";
import { desc } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { to } = await req.json().catch(() => ({ to: null }));
  const rows = await db.select().from(mailboxes).orderBy(desc(mailboxes.id)).limit(1);
  const mb = rows[0];
  if (!mb) return NextResponse.json({ error: "Ящик не настроен" }, { status: 400 });
  const recipient = to || mb.fromEmail;
  try {
    const info: any = await sendMail({
      mailbox: mb as any,
      to: recipient,
      subject: "Тестовое письмо — Email Panel",
      html: "<p>Это тестовое письмо. Если вы его получили — SMTP настроен верно ✅</p>",
      text: "Это тестовое письмо. Если вы его получили — SMTP настроен верно",
    });
    return NextResponse.json({ ok: true, etherealPreviewUrl: info.etherealPreviewUrl || null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
