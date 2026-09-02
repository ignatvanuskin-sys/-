import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailboxes } from "@/lib/schema";
import { encrypt } from "@/lib/crypto";
import { createEtherealTestAccount } from "@/lib/mailer";
import { desc } from "@/lib/db";

export async function GET() {
  const rows = await db.select().from(mailboxes).orderBy(desc(mailboxes.id)).limit(1);
  const m = rows[0] || null;
  if (!m) return NextResponse.json({ mailbox: null });
  // hide password
  return NextResponse.json({ mailbox: { ...m, passwordEncrypted: undefined } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Free Ethereal flow: if body.ethereal === true, auto-create test account (no Gmail needed)
  if (body.ethereal) {
    try {
      const eth = await createEtherealTestAccount();
      const passwordEncrypted = encrypt(eth.pass);
      const existing = await db.select().from(mailboxes).limit(1);
      const data = {
        smtpHost: eth.host,
        smtpPort: eth.port,
        secure: eth.secure,
        login: eth.user,
        passwordEncrypted,
        fromName: body.fromName || "Ethereal Test",
        fromEmail: body.fromEmail || eth.user,
        replyTo: body.replyTo || null,
        updatedAt: new Date(),
      };
      if (existing.length) {
        const updated = await db.update(mailboxes).set(data).where(mailboxes.id === existing[0].id).returning();
        return NextResponse.json({ mailbox: updated[0], ethereal: true, info: `Ethereal created: ${eth.user} / ${eth.pass} @ ${eth.host}:${eth.port}` });
      } else {
        const inserted = await db.insert(mailboxes).values(data).returning();
        return NextResponse.json({ mailbox: inserted[0], ethereal: true, info: `Ethereal created: ${eth.user}` });
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Ethereal failed: ${e.message}` }, { status: 500 });
    }
  }

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
