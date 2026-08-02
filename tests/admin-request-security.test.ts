import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminMutationSecurityError,
  createAdminCsrfToken,
  hasValidAdminCsrf,
  isSameOriginMutation,
} from "@/lib/admin-request-security";
import { adminCsrfCookie, adminCsrfHeader } from "@/lib/security-constants";

let previousSiteOrigin: string | undefined;

beforeEach(() => {
  previousSiteOrigin = process.env.SITE_ORIGIN;
  process.env.SITE_ORIGIN = "https://festival.example";
});

afterEach(() => {
  if (previousSiteOrigin === undefined) {
    delete process.env.SITE_ORIGIN;
  } else {
    process.env.SITE_ORIGIN = previousSiteOrigin;
  }
});

function request(origin: string, cookieToken: string, headerToken = cookieToken) {
  return new Request("https://festival.example/api/admin/site-content", {
    method: "PUT",
    headers: {
      cookie: `${adminCsrfCookie}=${cookieToken}`,
      origin,
      [adminCsrfHeader]: headerToken,
    },
  });
}

describe("admin mutation security", () => {
  it("accepts an exact same-origin request with a matching CSRF token", () => {
    const token = createAdminCsrfToken();
    const value = request("https://festival.example", token);

    expect(isSameOriginMutation(value)).toBe(true);
    expect(hasValidAdminCsrf(value)).toBe(true);
    expect(adminMutationSecurityError(value)).toBeNull();
  });

  it("rejects cross-origin and missing-origin requests", () => {
    const token = createAdminCsrfToken();

    expect(isSameOriginMutation(request("https://attacker.example", token))).toBe(
      false,
    );
    expect(
      isSameOriginMutation(
        new Request("https://festival.example/api/admin/site-content", {
          method: "PUT",
        }),
      ),
    ).toBe(false);
  });

  it("rejects a missing or mismatched CSRF token", () => {
    const cookieToken = createAdminCsrfToken();
    const headerToken = createAdminCsrfToken();

    expect(
      hasValidAdminCsrf(
        request("https://festival.example", cookieToken, headerToken),
      ),
    ).toBe(false);
  });
});
