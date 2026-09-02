import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { recipientLists, recipients } from "@/lib/schema";
import { eq } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const listId = Number(id);
  const list = await db.select().from(recipientLists).where(eq(recipientLists.id, listId)).limit(1);
  if (!list.length) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const recs = await db.select().from(recipients).where(eq(recipients.listId, listId));
  return NextResponse.json({ list: list[0], recipients: recs });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  await db.delete(recipientLists).where(eq(recipientLists.id, Number(id)));
  return NextResponse.json({ ok: true });
}
