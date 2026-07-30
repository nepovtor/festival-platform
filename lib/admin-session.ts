export const adminSessionCookie = "festival_admin_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getKey() {
  const secret = sessionSecret();
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createAdminSession() {
  const key = await getKey();
  if (!key) throw new Error("Admin session secret is not configured");

  const expiresAt = Date.now() + sessionLifetimeMs;
  const payload = String(expiresAt);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );

  return {
    expiresAt,
    value: `${payload}.${encodeBase64Url(signature)}`,
  };
}

export async function isValidAdminSession(value: string | undefined) {
  if (!value) return false;

  const [expiresAt, signature] = value.split(".");
  if (!expiresAt || !signature || Number(expiresAt) <= Date.now()) return false;

  try {
    const key = await getKey();
    if (!key) return false;
    return crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(expiresAt),
    );
  } catch {
    return false;
  }
}
