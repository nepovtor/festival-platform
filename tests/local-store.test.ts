import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  consumeRegistrationRateLimit,
  createRegistration,
  listRegistrations,
  RegistrationAlreadyExistsError,
  updateRegistrationEmailStatus,
} from "@/db";

let dataDirectory = "";
let previousDataFile: string | undefined;

beforeEach(async () => {
  dataDirectory = await mkdtemp(join(tmpdir(), "festival-store-"));
  previousDataFile = process.env.FESTIVAL_DATA_FILE;
  process.env.FESTIVAL_DATA_FILE = join(dataDirectory, "registrations.json");
});

afterEach(async () => {
  if (previousDataFile === undefined) {
    delete process.env.FESTIVAL_DATA_FILE;
  } else {
    process.env.FESTIVAL_DATA_FILE = previousDataFile;
  }
  await rm(dataDirectory, { recursive: true, force: true });
});

describe("local registration store", () => {
  it("stores a registration and updates its email status", async () => {
    await createRegistration({
      id: "registration-1",
      email: "guest@example.com",
      guestsCount: 2,
      consentAcceptedAt: "2026-07-30T10:00:00.000Z",
    });
    await updateRegistrationEmailStatus("registration-1", "SENT");

    await expect(listRegistrations()).resolves.toEqual([
      expect.objectContaining({
        id: "registration-1",
        emailStatus: "SENT",
        emailSentAt: expect.any(String),
      }),
    ]);
  });

  it("keeps emails unique and limits repeated requests", async () => {
    const registration = {
      id: "registration-1",
      email: "guest@example.com",
      guestsCount: 2,
      consentAcceptedAt: "2026-07-30T10:00:00.000Z",
    };
    await createRegistration(registration);

    await expect(createRegistration({ ...registration, id: "registration-2" })).rejects.toBeInstanceOf(
      RegistrationAlreadyExistsError,
    );
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
});
