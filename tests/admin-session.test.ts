import { afterEach, beforeEach, expect, it } from "vitest";
import {
  createAdminSession,
  isValidAdminSession,
} from "@/lib/admin-session";

let previousSecret: string | undefined;
let previousPassword: string | undefined;

beforeEach(() => {
  previousSecret = process.env.ADMIN_SESSION_SECRET;
  previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-at-least-32-characters";
});

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.ADMIN_SESSION_SECRET;
  } else {
    process.env.ADMIN_SESSION_SECRET = previousSecret;
  }
  if (previousPassword === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = previousPassword;
  }
});

it("creates a verifiable admin session", async () => {
  const session = await createAdminSession();

  expect(session.expiresAt - Date.now()).toBeLessThanOrEqual(8 * 60 * 60 * 1_000);
  await expect(isValidAdminSession(session.value)).resolves.toBe(true);
  await expect(isValidAdminSession(`${session.value}changed`)).resolves.toBe(
    false,
  );
});

it("does not use the admin password as a session secret", async () => {
  delete process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_PASSWORD = "legacy-password-must-not-sign-sessions";

  await expect(createAdminSession()).rejects.toThrow(
    "Admin session secret is not configured",
  );
  await expect(isValidAdminSession("9999999999999.invalid")).resolves.toBe(
    false,
  );
});
