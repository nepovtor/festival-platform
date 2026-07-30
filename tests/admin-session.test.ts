import { afterEach, beforeEach, expect, it } from "vitest";
import {
  createAdminSession,
  isValidAdminSession,
} from "@/lib/admin-session";

let previousSecret: string | undefined;

beforeEach(() => {
  previousSecret = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret";
});

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.ADMIN_SESSION_SECRET;
  } else {
    process.env.ADMIN_SESSION_SECRET = previousSecret;
  }
});

it("creates a verifiable admin session", async () => {
  const session = await createAdminSession();

  await expect(isValidAdminSession(session.value)).resolves.toBe(true);
  await expect(isValidAdminSession(`${session.value}changed`)).resolves.toBe(
    false,
  );
});
