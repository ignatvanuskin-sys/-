import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { suppressionList } from "@/lib/schema";
import { desc } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ list: [] });
  const rows = await db.select().from(suppressionList).orderBy(desc(suppressionList.createdAt));
  return NextResponse.json({ list: rows });
}

export async function DELETE(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const { eq } = await import("drizzle-orm");
  await db.delete(suppressionList).where(eq(suppressionList.email, email));
  return NextResponse.json({ ok: true });
}
