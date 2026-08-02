import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSiteContent } from "@/content/site-content";
import {
  buildCalendarUrl,
  renderRegistrationEmail,
  sendRegistrationEmail,
} from "@/lib/email";

const environmentKeys = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "EMAIL_LOGO_URL",
  "SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "FESTIVAL_CALENDAR_START",
  "FESTIVAL_CALENDAR_END",
] as const;
const previousEnvironment = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of environmentKeys) {
    previousEnvironment.set(key, process.env[key]);
  }
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.EMAIL_FROM = "Festival <festival@example.com>";
  process.env.EMAIL_REPLY_TO = "hello@example.com";
  process.env.EMAIL_LOGO_URL = "https://festival.example/lays-logo.png";
  process.env.SITE_URL = "https://festival.example";
  process.env.FESTIVAL_CALENDAR_START = "20260816T090000Z";
  process.env.FESTIVAL_CALENDAR_END = "20260816T190000Z";
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of environmentKeys) {
    const previous = previousEnvironment.get(key);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  previousEnvironment.clear();
});

describe("registration email", () => {
  it("contains full event details, program and calendar URL", () => {
    const rendered = renderRegistrationEmail(defaultSiteContent, 3);

    expect(rendered.html).toContain(defaultSiteContent.festival.date);
    expect(rendered.html).toContain(defaultSiteContent.festival.time);
    expect(rendered.html).toContain(defaultSiteContent.festival.place);
    expect(rendered.html).toContain(defaultSiteContent.festival.address);
    expect(rendered.html).toContain("Количество посетителей: <strong>3</strong>");
    expect(rendered.html).toContain("Добавить в календарь");
    expect(rendered.text).toContain("Количество посетителей: 3");
    for (const item of defaultSiteContent.program) {
      expect(rendered.html).toContain(item.time);
      expect(rendered.html).toContain(item.title);
      expect(rendered.html).toContain(item.description);
      expect(rendered.html).toContain(item.venue);
      expect(rendered.html).toContain(item.category);
      expect(rendered.text).toContain(item.description);
    }

    const calendar = new URL(buildCalendarUrl(defaultSiteContent));
    expect(calendar.searchParams.get("dates")).toBe(
      "20260816T090000Z/20260816T190000Z",
    );
    expect(calendar.searchParams.get("location")).toContain(
      defaultSiteContent.festival.address,
    );
  });

  it("sends HTML and text and returns the provider message id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendRegistrationEmail("guest@example.com", 2, {
        content: defaultSiteContent,
        idempotencyKey: "delivery-1",
      }),
    ).resolves.toEqual({ ok: true, providerId: "resend-message-1" });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as {
      html: string;
      text: string;
    };
    expect(payload.html).toContain(defaultSiteContent.festival.name);
    expect(payload.text).toContain(defaultSiteContent.festival.name);
    expect(request.headers).toMatchObject({
      "Idempotency-Key": "delivery-1",
    });
  });

  it("returns a stable failure result instead of throwing on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket closed")));

    await expect(
      sendRegistrationEmail("guest@example.com", 2, {
        content: defaultSiteContent,
      }),
    ).resolves.toMatchObject({
      ok: false,
      reason: "NETWORK_ERROR",
      errorMessage: "Email provider request failed",
    });
  });
});
