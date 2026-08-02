import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieLifetimeSeconds,
  adminCsrfCookie,
  adminCsrfHeader,
} from "@/lib/security-constants";

const csrfTokenPattern = /^[a-f0-9]{64}$/;

function configuredOrigin(request: Request) {
  const configuredUrl =
    process.env.SITE_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === "production") return null;

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function isSameOriginMutation(request: Request) {
  const expectedOrigin = configuredOrigin(request);
  const requestOrigin = request.headers.get("origin");

  if (!expectedOrigin || !requestOrigin || requestOrigin === "null") {
    return false;
  }

  try {
    return new URL(requestOrigin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;
    const key = item.slice(0, separator).trim();
    if (key !== name) continue;

    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export function hasValidAdminCsrf(request: Request) {
  const cookieToken = cookieValue(request, adminCsrfCookie);
  const headerToken = request.headers.get(adminCsrfHeader);

  return Boolean(
    cookieToken &&
      headerToken &&
      csrfTokenPattern.test(cookieToken) &&
      csrfTokenPattern.test(headerToken) &&
      cookieToken === headerToken,
  );
}

export function adminMutationSecurityError(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { message: "Запрос отклонён политикой безопасности" },
      { status: 403 },
    );
  }

  if (!hasValidAdminCsrf(request)) {
    return NextResponse.json(
      { message: "Сессия формы устарела. Обновите страницу и повторите." },
      { status: 403 },
    );
  }

  return null;
}

export function createAdminCsrfToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function ensureAdminCsrfCookie(
  request: NextRequest,
  response: NextResponse,
) {
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  const currentToken = request.cookies.get(adminCsrfCookie)?.value;
  if (currentToken && csrfTokenPattern.test(currentToken)) return response;

  response.cookies.set({
    name: adminCsrfCookie,
    value: createAdminCsrfToken(),
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminCookieLifetimeSeconds,
  });
  return response;
}

export function clearAdminCsrfCookie(response: NextResponse) {
  response.cookies.set({
    name: adminCsrfCookie,
    value: "",
    expires: new Date(0),
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
