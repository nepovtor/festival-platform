import { NextRequest, NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Требуется пароль администратора", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Festival admin"' },
  });
}

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Доступ администратора не настроен", {
      status: 503,
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorizedResponse();

  try {
    const credentials = atob(authorization.slice("Basic ".length));
    const separator = credentials.indexOf(":");
    const suppliedUsername = credentials.slice(0, separator);
    const suppliedPassword = credentials.slice(separator + 1);

    if (
      separator !== -1 &&
      suppliedUsername === username &&
      suppliedPassword === password
    ) {
      return NextResponse.next();
    }
  } catch {
    // Invalid Basic authorization is handled as an unauthenticated request.
  }

  return unauthorizedResponse();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
