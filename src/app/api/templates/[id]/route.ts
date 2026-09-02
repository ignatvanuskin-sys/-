import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { templates } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const { name, subject, body } = await req.json();
  const updated = await db.update(templates).set({ name, subject, body, updatedAt: new Date() }).where(eq(templates.id, Number(id))).returning();
  return NextResponse.json({ template: updated[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  await db.delete(templates).where(eq(templates.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const row = await db.select().from(templates).where(eq(templates.id, Number(id))).limit(1);
  if (!row.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template: row[0] });
}
