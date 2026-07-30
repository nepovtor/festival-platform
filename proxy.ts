import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookie, isValidAdminSession } from "@/lib/admin-session";

export async function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Доступ администратора не настроен", {
      status: 503,
    });
  }

  if (
    request.nextUrl.pathname === "/admin/login" ||
    request.nextUrl.pathname === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = await isValidAdminSession(
    request.cookies.get(adminSessionCookie)?.value,
  );
  if (isAuthenticated) return NextResponse.next();

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
