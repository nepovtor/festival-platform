import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, isValidAdminSession } from "@/lib/admin-session";
import { ensureAdminCsrfCookie } from "@/lib/admin-request-security";

export async function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (
    !username ||
    !passwordHash ||
    !sessionSecret ||
    sessionSecret.length < 32
  ) {
    return new NextResponse("Доступ администратора не настроен", {
      status: 503,
    });
  }

  if (
    request.nextUrl.pathname === "/admin/login" ||
    (request.nextUrl.pathname === "/api/admin/login" &&
      request.method === "POST")
  ) {
    return ensureAdminCsrfCookie(request, NextResponse.next());
  }

  const isAuthenticated = await isValidAdminSession(
    request.cookies.get(adminSessionCookie)?.value,
  );
  if (isAuthenticated) {
    return ensureAdminCsrfCookie(request, NextResponse.next());
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("return_to", returnTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
