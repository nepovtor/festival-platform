import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSessionCookie, createAdminSession } from "@/lib/admin-session";
import {
  adminMutationSecurityError,
  clearAdminCsrfCookie,
} from "@/lib/admin-request-security";
import {
  clearAdminLoginAttempts,
  consumeAdminLoginAttempt,
} from "@/lib/login-rate-limit";

const maxLoginBodyBytes = 4_096;
const bcryptHashPattern = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/;
const credentialsSchema = z
  .object({
    username: z.string().trim().min(1).max(128),
    password: z.string().min(8).max(256),
  })
  .strict();

function json(
  body: Record<string, unknown>,
  init: { status: number; headers?: HeadersInit },
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
}

function isSupportedBcryptHash(value: string) {
  const match = bcryptHashPattern.exec(value);
  if (!match) return false;
  const cost = Number(match[1]);
  return cost >= 10 && cost <= 14;
}

function readEnvFileCredentials() {
  const projectRoot = process.cwd();
  const envPaths = [join(projectRoot, ".env"), join(projectRoot, ".env.local")];

  for (const envPath of envPaths) {
    try {
      const raw = readFileSync(envPath, "utf8");
      const values = new Map<string, string>();

      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const separator = trimmed.indexOf("=");
        if (separator === -1) continue;
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        if (key) values.set(key, value.replace(/^['"]|['"]$/g, ""));
      }

      return {
        adminUsername: values.get("ADMIN_USERNAME"),
        adminPasswordHash: values.get("ADMIN_PASSWORD_HASH"),
        adminPassword: values.get("ADMIN_PASSWORD"),
      };
    } catch {
      // Try the next candidate.
    }
  }

  return {
    adminUsername: undefined,
    adminPasswordHash: undefined,
    adminPassword: undefined,
  };
}

function resolveAdminCredentials() {
  const fileCredentials = readEnvFileCredentials();

  return {
    adminUsername: process.env.ADMIN_USERNAME ?? fileCredentials.adminUsername,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? fileCredentials.adminPasswordHash,
    adminPassword: process.env.ADMIN_PASSWORD ?? fileCredentials.adminPassword,
  };
}

async function readCredentials(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return null;
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxLoginBodyBytes) {
    return null;
  }

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxLoginBodyBytes) return null;
    return credentialsSchema.safeParse(JSON.parse(body));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const securityError = adminMutationSecurityError(request);
  if (securityError) return securityError;

  const parsed = await readCredentials(request);
  if (!parsed?.success) {
    return json({ message: "Некорректный запрос" }, { status: 400 });
  }

  const { adminUsername: expectedUsername, adminPasswordHash, adminPassword } =
    resolveAdminCredentials();
  const rateLimit = await consumeAdminLoginAttempt(
    request,
    parsed.data.username,
  );
  if (!rateLimit.allowed) {
    return json(
      { message: "Слишком много попыток входа. Попробуйте позже." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let passwordMatches = false;
  try {
    if (adminPasswordHash && isSupportedBcryptHash(adminPasswordHash)) {
      passwordMatches = await compare(parsed.data.password, adminPasswordHash);
    } else if (adminPassword) {
      passwordMatches = parsed.data.password === adminPassword;
    }
  } catch {
    return json(
      { message: "Доступ администратора не настроен" },
      { status: 503 },
    );
  }

  if (!expectedUsername || parsed.data.username !== expectedUsername || !passwordMatches) {
    return json(
      { message: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  await clearAdminLoginAttempts(request, parsed.data.username);
  const session = await createAdminSession();
  const response = json({ success: true }, { status: 200 });
  response.cookies.set({
    name: adminSessionCookie,
    value: session.value,
    expires: new Date(session.expiresAt),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export async function DELETE(request: Request) {
  const securityError = adminMutationSecurityError(request);
  if (securityError) return securityError;

  const response = json({ success: true }, { status: 200 });
  response.cookies.set({
    name: adminSessionCookie,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  clearAdminCsrfCookie(response);
  return response;
}
