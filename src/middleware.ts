import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

/** Passcode gate for every page, server action and API route (except the cron ping). */
export async function middleware(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next(); // not configured (local dev)
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await passcodeToken(passcode))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Static assets (favicon, logo) must load on the passcode screen too.
  matcher: ["/((?!unlock|api/cron|_next/static|_next/image|robots.txt|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)"],
};
