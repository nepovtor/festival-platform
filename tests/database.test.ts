import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSiteContent } from "@/content/site-content";
import {
  beginBroadcastEmailAttempt,
  beginRegistrationEmailAttempt,
  closeDatabase,
  completeEmailAttempt,
  consumeRegistrationRateLimit,
  createEmailCampaign,
  createRegistration,
  finalizeEmailCampaign,
  getSiteContent,
  listEmailDeliveries,
  listRegistrations,
  markEmailCampaignSending,
  RegistrationAlreadyExistsError,
  saveSiteContent,
  updateRegistrationEmailStatus,
} from "@/db";
import { deliverRegistrationConfirmation } from "@/lib/email";

let temporaryDirectory = "";
let previousDatabaseFile: string | undefined;
let previousLegacyFile: string | undefined;

beforeEach(async () => {
  closeDatabase();
  temporaryDirectory = await mkdtemp(join(tmpdir(), "festival-database-"));
  previousDatabaseFile = process.env.FESTIVAL_DB_FILE;
  previousLegacyFile = process.env.FESTIVAL_DATA_FILE;
  process.env.FESTIVAL_DB_FILE = join(temporaryDirectory, "festival.sqlite");
  process.env.FESTIVAL_DATA_FILE = join(
    temporaryDirectory,
    "registrations.json",
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  closeDatabase();
  if (previousDatabaseFile === undefined) {
    delete process.env.FESTIVAL_DB_FILE;
  } else {
    process.env.FESTIVAL_DB_FILE = previousDatabaseFile;
  }
  if (previousLegacyFile === undefined) {
    delete process.env.FESTIVAL_DATA_FILE;
  } else {
    process.env.FESTIVAL_DATA_FILE = previousLegacyFile;
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
});

async function createTestRegistration(id = "registration-1") {
  return createRegistration({
    id,
    email: `${id}@example.com`,
    guestsCount: 2,
    consentAcceptedAt: "2026-07-30T10:00:00.000Z",
  });
}

describe("SQLite registration store", () => {
  it("stores registration email attempts and provider metadata", async () => {
    await createTestRegistration();
    const failedClaim = await beginRegistrationEmailAttempt("registration-1");
    expect(failedClaim.created).toBe(true);
    const failedAttempt = failedClaim.delivery;
    await completeEmailAttempt(failedAttempt.id, {
      ok: false,
      errorMessage: "Provider unavailable",
    });

    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        id: "registration-1",
        emailStatus: "FAILED",
        emailAttemptCount: 1,
        emailLastError: "Provider unavailable",
        emailProviderId: null,
      }),
    ]);

    const sentClaim = await beginRegistrationEmailAttempt("registration-1");
    expect(sentClaim.created).toBe(true);
    const sentAttempt = sentClaim.delivery;
    await completeEmailAttempt(sentAttempt.id, {
      ok: true,
      providerId: "resend-message-1",
    });

    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        emailStatus: "SENT",
        emailAttemptCount: 2,
        emailLastError: null,
        emailProviderId: "resend-message-1",
        emailSentAt: expect.any(String),
      }),
    ]);
    await expect(
      listEmailDeliveries({ registrationId: "registration-1" }),
    ).resolves.toHaveLength(2);
  });

  it("reuses a pending confirmation claim without incrementing attempts", async () => {
    await createTestRegistration();

    const first = await beginRegistrationEmailAttempt("registration-1");
    const duplicate = await beginRegistrationEmailAttempt("registration-1");

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.delivery.id).toBe(first.delivery.id);
    await expect(
      listEmailDeliveries({ registrationId: "registration-1" }),
    ).resolves.toHaveLength(1);
    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        emailStatus: "PENDING",
        emailAttemptCount: 1,
      }),
    ]);
  });

  it("expires an abandoned confirmation claim before starting a retry", async () => {
    await createTestRegistration();
    const abandoned = await beginRegistrationEmailAttempt("registration-1");
    closeDatabase();

    const raw = new Database(process.env.FESTIVAL_DB_FILE!);
    raw.prepare(
      "UPDATE email_deliveries SET created_at = ?, updated_at = ? WHERE id = ?",
    ).run(
      "2020-01-01T00:00:00.000Z",
      "2020-01-01T00:00:00.000Z",
      abandoned.delivery.id,
    );
    raw.close();

    const retry = await beginRegistrationEmailAttempt("registration-1");
    expect(retry.created).toBe(true);
    expect(retry.delivery).toMatchObject({ attemptNumber: 2, status: "PENDING" });
    expect(retry.delivery.id).not.toBe(abandoned.delivery.id);
    await expect(
      listEmailDeliveries({ registrationId: "registration-1" }),
    ).resolves.toContainEqual(
      expect.objectContaining({
        id: abandoned.delivery.id,
        status: "FAILED",
        errorMessage: "Confirmation email delivery lease expired",
      }),
    );
  });

  it("does not let a stale completion overwrite the latest attempt", async () => {
    await createTestRegistration();
    const first = await beginRegistrationEmailAttempt("registration-1");
    await completeEmailAttempt(first.delivery.id, {
      ok: false,
      errorMessage: "first failure",
    });
    const second = await beginRegistrationEmailAttempt("registration-1");
    await updateRegistrationEmailStatus("registration-1", "FAILED", {
      errorMessage: "stale fallback failure",
      expectedAttemptCount: 1,
    });
    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        emailStatus: "PENDING",
        emailAttemptCount: 2,
        emailLastError: null,
      }),
    ]);
    await completeEmailAttempt(second.delivery.id, {
      ok: true,
      providerId: "provider-success",
    });

    closeDatabase();
    const raw = new Database(process.env.FESTIVAL_DB_FILE!);
    raw.prepare(
      "UPDATE email_deliveries SET status = 'PENDING' WHERE id = ?",
    ).run(first.delivery.id);
    raw.close();

    await completeEmailAttempt(first.delivery.id, {
      ok: false,
      errorMessage: "late failure",
    });

    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        emailStatus: "SENT",
        emailAttemptCount: 2,
        emailProviderId: "provider-success",
        emailLastError: null,
      }),
    ]);
  });

  it("migrates duplicate legacy pending confirmations to one claim", async () => {
    await createTestRegistration();
    const first = await beginRegistrationEmailAttempt("registration-1");
    closeDatabase();

    const raw = new Database(process.env.FESTIVAL_DB_FILE!);
    raw.exec(`
      DROP INDEX email_deliveries_one_pending_confirmation_idx;
      DELETE FROM schema_migrations WHERE version = 2;
    `);
    raw.prepare(`
      INSERT INTO email_deliveries (
        id, registration_id, campaign_id, kind, recipient_email,
        attempt_number, status, provider_id, error_message,
        created_at, sent_at, updated_at
      ) VALUES (?, ?, NULL, 'CONFIRMATION', ?, 2, 'PENDING', NULL, NULL, ?, NULL, ?)
    `).run(
      "newer-pending",
      "registration-1",
      "registration-1@example.com",
      "2026-08-08T12:00:00.000Z",
      "2026-08-08T12:00:00.000Z",
    );
    raw.prepare(`
      UPDATE registrations
      SET email_attempt_count = 2, email_status = 'PENDING'
      WHERE id = ?
    `).run("registration-1");
    raw.close();

    const deliveries = await listEmailDeliveries({
      registrationId: "registration-1",
    });
    expect(deliveries).toHaveLength(2);
    expect(deliveries.filter((item) => item.status === "PENDING")).toEqual([
      expect.objectContaining({ id: "newer-pending", attemptNumber: 2 }),
    ]);
    expect(deliveries).toContainEqual(
      expect.objectContaining({
        id: first.delivery.id,
        status: "FAILED",
        errorMessage: "Superseded by a newer pending confirmation attempt",
      }),
    );

    const duplicate = await beginRegistrationEmailAttempt("registration-1");
    expect(duplicate).toMatchObject({
      created: false,
      delivery: { id: "newer-pending", attemptNumber: 2 },
    });
  });

  it("keeps a registration and allows retry after provider failure", async () => {
    const registration = await createTestRegistration();
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.EMAIL_FROM;
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Festival <festival@example.com>";
    const fetchMock = vi.fn().mockRejectedValue(new Error("provider down"));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const first = await deliverRegistrationConfirmation(registration);
      expect(first.result).toMatchObject({
        ok: false,
        reason: "NETWORK_ERROR",
      });
      await expect(listRegistrations()).resolves.toEqual([
        expect.objectContaining({
          id: registration.id,
          emailStatus: "FAILED",
          emailAttemptCount: 1,
        }),
      ]);

      const second = await deliverRegistrationConfirmation(registration);
      expect(second.result.ok).toBe(false);
      await expect(
        listEmailDeliveries({ registrationId: registration.id }),
      ).resolves.toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      for (const call of fetchMock.mock.calls) {
        const request = call[1] as RequestInit;
        const payload = JSON.parse(String(request.body)) as {
          attachments?: Array<{ filename?: string; content?: string }>;
        };
        expect(payload.attachments?.[0]?.filename).toBe(
          "lays-festival-registration.pdf",
        );
        expect(payload.attachments?.[0]?.content).toBeTruthy();
      }
      const idempotencyKeys = fetchMock.mock.calls.map((call) => {
        const headers = (call[1] as RequestInit).headers as Record<string, string>;
        return headers["Idempotency-Key"];
      });
      expect(new Set(idempotencyKeys).size).toBe(2);
    } finally {
      if (previousKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousKey;
      if (previousFrom === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = previousFrom;
    }
  });

  it("coalesces concurrent confirmation requests into one provider call", async () => {
    const registration = await createTestRegistration();
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.EMAIL_FROM;
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Festival <festival@example.com>";
    let resolveProvider!: (response: Response) => void;
    const providerResponse = new Promise<Response>((resolve) => {
      resolveProvider = resolve;
    });
    const fetchMock = vi.fn(() => providerResponse);
    vi.stubGlobal("fetch", fetchMock);

    try {
      const firstPromise = deliverRegistrationConfirmation(registration);
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      const duplicate = await deliverRegistrationConfirmation(registration);
      expect(duplicate.result).toMatchObject({
        ok: false,
        reason: "ALREADY_IN_PROGRESS",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveProvider(
        new Response(JSON.stringify({ id: "provider-confirmation" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const first = await firstPromise;
      expect(first.result).toEqual({
        ok: true,
        providerId: "provider-confirmation",
      });
      expect(duplicate.delivery.id).toBe(first.delivery.id);
    } finally {
      if (previousKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousKey;
      if (previousFrom === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = previousFrom;
    }
  });

  it("keeps emails unique and limits repeated requests", async () => {
    const registration = {
      id: "registration-1",
      email: "guest@example.com",
      guestsCount: 2,
      consentAcceptedAt: "2026-07-30T10:00:00.000Z",
    };
    await createRegistration(registration);

    await expect(
      createRegistration({ ...registration, id: "registration-2" }),
    ).rejects.toBeInstanceOf(RegistrationAlreadyExistsError);
    await expect(
      consumeRegistrationRateLimit("visitor", 100, 600, 2),
    ).resolves.toBe(true);
    await expect(
      consumeRegistrationRateLimit("visitor", 100, 600, 2),
    ).resolves.toBe(true);
    await expect(
      consumeRegistrationRateLimit("visitor", 100, 600, 2),
    ).resolves.toBe(false);
  });

  it("journals a broadcast and finalizes partial delivery totals", async () => {
    const first = await createTestRegistration("registration-1");
    const second = await createTestRegistration("registration-2");
    const campaign = await createEmailCampaign({
      id: "campaign-1",
      subject: "Важная информация",
      message: "Обновление программы",
      ctaLabel: null,
      ctaUrl: null,
      recipientCount: 2,
    });
    await markEmailCampaignSending(campaign.id);

    const firstDelivery = await beginBroadcastEmailAttempt(
      campaign.id,
      first.id,
    );
    const secondDelivery = await beginBroadcastEmailAttempt(
      campaign.id,
      second.id,
    );
    await completeEmailAttempt(firstDelivery.id, {
      ok: true,
      providerId: "provider-broadcast-1",
    });
    await completeEmailAttempt(secondDelivery.id, {
      ok: false,
      errorMessage: "Mailbox unavailable",
    });

    await expect(finalizeEmailCampaign(campaign.id)).resolves.toMatchObject({
      status: "PARTIAL",
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
      completedAt: expect.any(String),
    });
    await expect(
      listEmailDeliveries({ campaignId: campaign.id }),
    ).resolves.toHaveLength(2);
  });

  it("persists updated site content", async () => {
    const content = await getSiteContent();
    content.festival.name = "Новый фестиваль";
    content.registrationEmail.heading = "Новый заголовок письма";

    await saveSiteContent(content);

    await expect(getSiteContent()).resolves.toEqual(
      expect.objectContaining({
        festival: expect.objectContaining({ name: "Новый фестиваль" }),
        registrationEmail: expect.objectContaining({
          heading: "Новый заголовок письма",
        }),
      }),
    );
    expect(defaultSiteContent.festival.name).not.toBe("Новый фестиваль");
  });

  it("imports a legacy JSON store once without losing registrations", async () => {
    const registrations = Array.from({ length: 4 }, (_, index) => ({
      id: `legacy-${index + 1}`,
      email: `legacy-${index + 1}@example.com`,
      guestsCount: index + 1,
      status: "CONFIRMED",
      consentAcceptedAt: "2026-07-30T10:00:00.000Z",
      emailStatus: index === 3 ? "SENT" : "FAILED",
      emailSentAt:
        index === 3 ? "2026-07-30T10:01:00.000Z" : null,
      createdAt: `2026-07-30T10:00:0${index}.000Z`,
      updatedAt: `2026-07-30T10:01:0${index}.000Z`,
    }));
    await createRegistration({
      id: registrations[0].id,
      email: registrations[0].email,
      guestsCount: registrations[0].guestsCount,
      consentAcceptedAt: registrations[0].consentAcceptedAt,
    });
    await mkdir(temporaryDirectory, { recursive: true });
    await writeFile(
      process.env.FESTIVAL_DATA_FILE!,
      JSON.stringify({
        registrations,
        rateLimits: [],
        siteContent: {
          festival: {
            name: "Устаревший фестиваль",
            date: "15 августа 2026",
          },
          heroImage: "/api/uploads/legacy-hero.webp",
          programImage: "/api/uploads/legacy-program.webp",
          gallery: defaultSiteContent.gallery.map((item, index) =>
            index === 0
              ? { ...item, src: "/api/uploads/legacy-gallery.webp" }
              : item,
          ),
          program: [
            {
              time: "12:00",
              title: "Устаревшая программа",
              description: "Старое описание",
              venue: "Старая площадка",
              category: "Старое событие",
            },
          ],
        },
      }),
      "utf8",
    );
    closeDatabase();

    const imported = await listRegistrations();
    expect(imported).toHaveLength(4);
    expect(imported.filter((item) => item.emailAttemptCount === 1)).toHaveLength(
      4,
    );
    await expect(getSiteContent()).resolves.toMatchObject({
      version: defaultSiteContent.version,
      festival: defaultSiteContent.festival,
      program: defaultSiteContent.program,
      registrationEmail: defaultSiteContent.registrationEmail,
      heroImage: "/api/uploads/legacy-hero.webp",
      programImage: "/api/uploads/legacy-program.webp",
      gallery: [
        expect.objectContaining({
          src: "/api/uploads/legacy-gallery.webp",
        }),
        ...defaultSiteContent.gallery.slice(1),
      ],
    });
    closeDatabase();
    await expect(getSiteContent()).resolves.toMatchObject({
      version: defaultSiteContent.version,
      festival: defaultSiteContent.festival,
      program: defaultSiteContent.program,
      heroImage: "/api/uploads/legacy-hero.webp",
      programImage: "/api/uploads/legacy-program.webp",
      gallery: [
        expect.objectContaining({
          src: "/api/uploads/legacy-gallery.webp",
        }),
        ...defaultSiteContent.gallery.slice(1),
      ],
    });

    await writeFile(
      process.env.FESTIVAL_DATA_FILE!,
      JSON.stringify({
        registrations: [
          ...registrations,
          { ...registrations[0], id: "legacy-5", email: "legacy-5@example.com" },
        ],
        rateLimits: [],
      }),
      "utf8",
    );
    closeDatabase();

    await expect(listRegistrations()).resolves.toHaveLength(4);
  });
});
