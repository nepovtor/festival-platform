import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as previewEmail } from "@/app/api/admin/email-preview/route";
import { PUT } from "@/app/api/admin/site-content/route";
import {
  defaultSiteContent,
  legacyRegistrationEmailV4,
} from "@/content/site-content";
import { closeDatabase, getSiteContent } from "@/db";
import { createAdminCsrfToken } from "@/lib/admin-request-security";
import { adminCsrfCookie, adminCsrfHeader } from "@/lib/security-constants";

let temporaryDirectory = "";
let previousDatabaseFile: string | undefined;
let previousLegacyFile: string | undefined;
let previousSiteOrigin: string | undefined;
let previousEmailLogoUrl: string | undefined;

beforeEach(async () => {
  closeDatabase();
  temporaryDirectory = await mkdtemp(join(tmpdir(), "festival-content-route-"));
  previousDatabaseFile = process.env.FESTIVAL_DB_FILE;
  previousLegacyFile = process.env.FESTIVAL_DATA_FILE;
  previousSiteOrigin = process.env.SITE_ORIGIN;
  previousEmailLogoUrl = process.env.EMAIL_LOGO_URL;
  process.env.FESTIVAL_DB_FILE = join(temporaryDirectory, "festival.sqlite");
  process.env.FESTIVAL_DATA_FILE = join(temporaryDirectory, "legacy.json");
  process.env.SITE_ORIGIN = "https://festival.example";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  closeDatabase();
  if (previousDatabaseFile === undefined) delete process.env.FESTIVAL_DB_FILE;
  else process.env.FESTIVAL_DB_FILE = previousDatabaseFile;
  if (previousLegacyFile === undefined) delete process.env.FESTIVAL_DATA_FILE;
  else process.env.FESTIVAL_DATA_FILE = previousLegacyFile;
  if (previousSiteOrigin === undefined) delete process.env.SITE_ORIGIN;
  else process.env.SITE_ORIGIN = previousSiteOrigin;
  if (previousEmailLogoUrl === undefined) delete process.env.EMAIL_LOGO_URL;
  else process.env.EMAIL_LOGO_URL = previousEmailLogoUrl;
  await rm(temporaryDirectory, { recursive: true, force: true });
});

function contentRequest(payload: unknown) {
  const token = createAdminCsrfToken();
  return new Request("https://festival.example/api/admin/site-content", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      cookie: `${adminCsrfCookie}=${token}`,
      origin: "https://festival.example",
      [adminCsrfHeader]: token,
    },
    body: JSON.stringify(payload),
  });
}

describe("admin site content and email preview", () => {
  it("stores structured registration email settings as plain text", async () => {
    const content = structuredClone(defaultSiteContent);
    content.registrationEmail = {
      subject: "Новая тема",
      heading: "<script>Только текст</script>",
      intro: "Новый вводный текст",
      closing: "Новое завершение",
      calendarButtonLabel: "В календарь",
    };

    const response = await PUT(contentRequest(content));

    expect(response.status).toBe(200);
    await expect(getSiteContent()).resolves.toMatchObject({
      registrationEmail: content.registrationEmail,
    });
  });

  it("rejects content without the structured email template", async () => {
    const content = structuredClone(defaultSiteContent) as Record<string, unknown>;
    delete content.registrationEmail;

    const response = await PUT(contentRequest(content));

    expect(response.status).toBe(400);
  });

  it("normalizes an older admin version without losing submitted text", async () => {
    const content = structuredClone(defaultSiteContent);
    content.version = defaultSiteContent.version - 1;
    content.festival.name = "Сохранённая версия фестиваля";
    content.registrationEmail = structuredClone(legacyRegistrationEmailV4);
    content.registrationEmail.heading = "Сохранённый заголовок";

    const response = await PUT(contentRequest(content));

    expect(response.status).toBe(200);
    await expect(getSiteContent()).resolves.toMatchObject({
      version: defaultSiteContent.version,
      festival: { name: "Сохранённая версия фестиваля" },
      registrationEmail: {
        subject: defaultSiteContent.registrationEmail.subject,
        heading: "Сохранённый заголовок",
        intro: defaultSiteContent.registrationEmail.intro,
        closing: defaultSiteContent.registrationEmail.closing,
      },
    });
  });

  it("rejects content from a newer unsupported schema version", async () => {
    const content = structuredClone(defaultSiteContent);
    content.version = defaultSiteContent.version + 1;

    const response = await PUT(contentRequest(content));

    expect(response.status).toBe(400);
  });

  it("renders a no-store preview without sending an email", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await previewEmail();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(html).toContain(defaultSiteContent.registrationEmail.heading);
    expect(html).toContain("Количество посетителей: <strong>2</strong>");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows only the configured external logo origin in preview CSP", async () => {
    process.env.EMAIL_LOGO_URL =
      "https://cdn.festival.example/assets/lays-logo.png?version=2";

    const response = await previewEmail();
    const csp = response.headers.get("content-security-policy");

    expect(csp).toContain("img-src 'self' data: https://cdn.festival.example");
    expect(csp).not.toContain("/assets/lays-logo.png");
    expect(csp).not.toContain("script-src");
  });
});
