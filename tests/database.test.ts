import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
} from "@/db";

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
    const failedAttempt = await beginRegistrationEmailAttempt("registration-1");
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

    const sentAttempt = await beginRegistrationEmailAttempt("registration-1");
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

    await saveSiteContent(content);

    await expect(getSiteContent()).resolves.toEqual(
      expect.objectContaining({
        festival: expect.objectContaining({ name: "Новый фестиваль" }),
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
        siteContent: { festival: { name: "Устаревший фестиваль" } },
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
      festival: { name: defaultSiteContent.festival.name },
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
