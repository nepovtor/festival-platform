import { hashSync } from "bcryptjs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/admin/login/route";
import { createAdminCsrfToken } from "@/lib/admin-request-security";
import { resetAdminLoginRateLimitForTests } from "@/lib/login-rate-limit";
import { adminCsrfCookie, adminCsrfHeader } from "@/lib/security-constants";

const environmentKeys = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "SITE_ORIGIN",
] as const;
const previousEnvironment = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of environmentKeys) previousEnvironment.set(key, process.env[key]);
  process.env.ADMIN_USERNAME = "organizer";
  process.env.ADMIN_PASSWORD_HASH = hashSync("strong-test-password", 10);
  process.env.ADMIN_SESSION_SECRET =
    "test-admin-session-secret-at-least-32-characters";
  process.env.SITE_ORIGIN = "https://festival.example";
  resetAdminLoginRateLimitForTests();
});

afterEach(() => {
  for (const key of environmentKeys) {
    const value = previousEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previousEnvironment.clear();
});

function loginRequest(password: string, origin = "https://festival.example") {
  const csrfToken = createAdminCsrfToken();
  return new Request("https://festival.example/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${adminCsrfCookie}=${csrfToken}`,
      origin,
      [adminCsrfHeader]: csrfToken,
      "x-forwarded-for": "192.0.2.20",
    },
    body: JSON.stringify({ username: "organizer", password }),
  });
}

describe("admin login route", () => {
  it("sets a protected session cookie after a valid bcrypt login", async () => {
    const response = await POST(loginRequest("strong-test-password"));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("festival_admin_session=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
  });

  it("accepts a legacy plaintext password configured in the environment", async () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = "legacy-admin-password";

    const response = await POST(loginRequest("legacy-admin-password"));

    expect(response.status).toBe(200);
  });

  it("loads admin credentials from a .env file when runtime env vars are absent", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "festival-admin-"));
    const previousWorkingDirectory = process.cwd();

    try {
      process.chdir(tempDir);
      writeFileSync(
        join(tempDir, ".env"),
        "ADMIN_USERNAME=organizer\nADMIN_PASSWORD=legacy-admin-password\n",
      );
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.ADMIN_PASSWORD_HASH;

      const response = await POST(loginRequest("legacy-admin-password"));

      expect(response.status).toBe(200);
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects an invalid password and a cross-origin request", async () => {
    await expect(POST(loginRequest("wrong-test-password"))).resolves.toMatchObject({
      status: 401,
    });
    await expect(
      POST(loginRequest("strong-test-password", "https://attacker.example")),
    ).resolves.toMatchObject({ status: 403 });
  });
});
