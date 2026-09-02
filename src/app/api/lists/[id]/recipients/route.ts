import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { recipients } from "@/lib/schema";
import { eq } from "@/lib/db";
import { isValidEmail } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const listId = Number(id);
  const body = await req.json();
  const { email, name, company } = body;
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  const inserted = await db.insert(recipients).values({ listId, email, name: name || null, company: company || null, customFields: {} }).returning();
  return NextResponse.json({ recipient: inserted[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  await params;
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get("recipientId");
  if (!rid) return NextResponse.json({ error: "recipientId required" }, { status: 400 });
  await db.delete(recipients).where(eq(recipients.id, Number(rid)));
  return NextResponse.json({ ok: true });
}
