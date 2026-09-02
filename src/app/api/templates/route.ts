import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { templates } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ templates: [] });
  const rows = await db.select().from(templates).orderBy(desc(templates.createdAt));
  return NextResponse.json({ templates: rows });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ error: "DB не настроена" }, { status: 500 });
  const { name, subject, body } = await req.json();
  if (!name || !subject || !body) return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  const inserted = await db.insert(templates).values({ name, subject, body }).returning();
  return NextResponse.json({ template: inserted[0] });
}
