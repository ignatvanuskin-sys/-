import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { mailboxes } from "@/lib/schema";
import { encrypt } from "@/lib/crypto";
import { desc } from "drizzle-orm";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ mailbox: null, db: false });
  const rows = await db.select().from(mailboxes).orderBy(desc(mailboxes.id)).limit(1);
  const m = rows[0] || null;
  if (!m) return NextResponse.json({ mailbox: null });
  // hide password
  return NextResponse.json({ mailbox: { ...m, passwordEncrypted: undefined } });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const body = await req.json();
  const { smtpHost, smtpPort, secure, login, password, fromName, fromEmail, replyTo } = body;
  if (!smtpHost || !smtpPort || !login || !password || !fromEmail) {
    return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
  }
  const passwordEncrypted = encrypt(password);
  const existing = await db.select().from(mailboxes).limit(1);
  if (existing.length) {
    const updated = await db
      .update(mailboxes)
      .set({
        smtpHost,
        smtpPort: Number(smtpPort),
        secure: Boolean(secure),
        login,
        passwordEncrypted,
        fromName: fromName || login,
        fromEmail,
        replyTo: replyTo || null,
        updatedAt: new Date(),
      })
      .where(mailboxes.id === existing[0].id)
      .returning();
    return NextResponse.json({ mailbox: updated[0] });
  } else {
    const inserted = await db.insert(mailboxes).values({
      smtpHost,
      smtpPort: Number(smtpPort),
      secure: Boolean(secure),
      login,
      passwordEncrypted,
      fromName: fromName || login,
      fromEmail,
      replyTo: replyTo || null,
    }).returning();
    return NextResponse.json({ mailbox: inserted[0] });
  }
}
