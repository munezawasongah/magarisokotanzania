import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const DEVICE_COOKIE = "gs_did";
const TWO_YEARS = 60 * 60 * 24 * 730;

/**
 * 1. Gives every browser a long-lived random device id (used by the fraud engine
 *    to link accounts and enforce device bans).
 * 2. Guards the signed-in areas. Fine-grained role checks happen in pages/actions.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const needsAuth = path.startsWith("/dashboard") || path.startsWith("/admin") || path === "/sell";
  let res = NextResponse.next();

  if (needsAuth) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.uid) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", path + req.nextUrl.search);
      res = NextResponse.redirect(url);
    } else if (path.startsWith("/admin") && !token.roles?.some((r) => r === "ADMIN" || r === "MODERATOR")) {
      res = NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (!req.cookies.get(DEVICE_COOKIE)) {
    res.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TWO_YEARS,
      path: "/",
    });
  }
  return res;
}

export const config = {
  // everything except static assets
  matcher: ["/((?!_next/static|_next/image|placeholders/|uploads/|body-types/|brand/|icon\\.png|apple-icon\\.png|manifest\\.webmanifest|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
