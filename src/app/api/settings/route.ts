import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { globalSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ settings: { stopAll: false, footerAddress: "" } });
  const rows = await db.select().from(globalSettings).limit(1);
  return NextResponse.json({ settings: rows[0] || { stopAll: false, footerAddress: "" } });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { stopAll, footerAddress } = await req.json();
  const existing = await db.select().from(globalSettings).limit(1);
  if (existing.length) {
    const updated = await db.update(globalSettings).set({ stopAll: !!stopAll, footerAddress: footerAddress || null, updatedAt: new Date() }).where(eq(globalSettings.id, existing[0].id)).returning();
    return NextResponse.json({ settings: updated[0] });
  } else {
    const inserted = await db.insert(globalSettings).values({ stopAll: !!stopAll, footerAddress: footerAddress || null }).returning();
    return NextResponse.json({ settings: inserted[0] });
  }
}
