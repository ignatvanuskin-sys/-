import { NextRequest, NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "@/lib/db";
import { hashPassword, verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });

    // Fallback when DB not configured: allow env-based check
    if (!isDbConfigured()) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      if (email === adminEmail && password === adminPassword) {
        await createSession({ userId: 1, email });
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "Неверный email или пароль (DB не настроена, проверьте ADMIN_EMAIL/PASSWORD)" }, { status: 401 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length === 0) {
      // Auto-create first user if none exists at all
      const allUsers = await db.select().from(users).limit(1);
      if (allUsers.length === 0) {
        // Allow any first user creation – secure for single-user tool
        const hash = await hashPassword(password);
        const inserted = await db.insert(users).values({ email, passwordHash: hash }).returning();
        await createSession({ userId: inserted[0].id, email });
        return NextResponse.json({ ok: true, created: true });
      }
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }
    const user = existing[0];
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    await createSession({ userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Ошибка" }, { status: 500 });
  }
}
