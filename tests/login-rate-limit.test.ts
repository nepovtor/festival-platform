import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAdminLoginAttempts,
  consumeAdminLoginAttempt,
  resetAdminLoginRateLimitForTests,
} from "@/lib/login-rate-limit";

const request = new Request("https://festival.example/api/admin/login", {
  method: "POST",
  headers: { "x-forwarded-for": "192.0.2.10" },
});

beforeEach(() => resetAdminLoginRateLimitForTests());

describe("admin login rate limit", () => {
  it("blocks the sixth attempt for one IP and username", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        consumeAdminLoginAttempt(request, "organizer", 1_000),
      ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
    }

    const blocked = await consumeAdminLoginAttempt(
      request,
      "organizer",
      1_000,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(900);
  });

  it("clears attempts after a successful login", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await consumeAdminLoginAttempt(request, "organizer", 1_000);
    }

    await clearAdminLoginAttempts(request, "organizer");

    await expect(
      consumeAdminLoginAttempt(request, "organizer", 1_000),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
