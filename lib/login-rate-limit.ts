const credentialWindowMs = 15 * 60 * 1_000;
const ipWindowMs = 15 * 60 * 1_000;
const maxCredentialAttempts = 5;
const maxIpAttempts = 10;
const maxBuckets = 5_000;

type AttemptBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, AttemptBucket>();

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size >= maxBuckets) {
    const oldestKey = buckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

function consume(
  key: string,
  now: number,
  windowMs: number,
  maxAttempts: number,
) {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAt: now + windowMs };
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, resetAt: existing.resetAt };
}

async function keysFor(request: Request, username: string) {
  const ip = clientIp(request);
  return {
    credential: `credential:${await digest(`${ip}\u0000${username.toLowerCase()}`)}`,
    ip: `ip:${await digest(ip)}`,
  };
}

export async function consumeAdminLoginAttempt(
  request: Request,
  username: string,
  now = Date.now(),
): Promise<RateLimitResult> {
  prune(now);
  const keys = await keysFor(request, username);
  const credential = consume(
    keys.credential,
    now,
    credentialWindowMs,
    maxCredentialAttempts,
  );
  const ip = consume(keys.ip, now, ipWindowMs, maxIpAttempts);
  const allowed = credential.allowed && ip.allowed;
  const retryAt = Math.max(credential.resetAt, ip.resetAt);

  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((retryAt - now) / 1_000)),
  };
}

export async function clearAdminLoginAttempts(
  request: Request,
  username: string,
) {
  const keys = await keysFor(request, username);
  buckets.delete(keys.credential);
  buckets.delete(keys.ip);
}

export function resetAdminLoginRateLimitForTests() {
  if (process.env.NODE_ENV === "test") buckets.clear();
}
