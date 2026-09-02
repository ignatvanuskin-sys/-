import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

function getSecret() {
  const s = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "dev-secret-change-me-please-32chars";
  return new TextEncoder().encode(s);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard") || path.startsWith("/api");
  const isApiAuthUnprotected = path.startsWith("/api/auth") || path.startsWith("/api/unsubscribe") || path.startsWith("/api/inngest");
  if (isApiAuthUnprotected) return NextResponse.next();

  // allow login page itself
  if (path === "/login") return NextResponse.next();

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}

export const middleware = proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
