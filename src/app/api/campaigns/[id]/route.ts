import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { campaigns, campaignRecipients } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const cid = Number(id);
  const cam = await db.select().from(campaigns).where(eq(campaigns.id, cid)).limit(1);
  if (!cam.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const crs = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, cid));
  return NextResponse.json({ campaign: cam[0], recipients: crs });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  await db.delete(campaigns).where(eq(campaigns.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  const updated = await db.update(campaigns).set(body).where(eq(campaigns.id, Number(id))).returning();
  return NextResponse.json({ campaign: updated[0] });
}
