import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import {
  defaultSiteContent,
  legacyRegistrationEmailV4,
  type SiteContent,
} from "@/content/site-content";
import {
  getDatabaseFilePath,
  getDataFilePath,
} from "@/lib/local-storage-paths";
import type {
  EmailCampaign,
  EmailCampaignStatus,
  EmailDelivery,
  EmailDeliveryKind,
  EmailStatus,
  RateLimit,
  Registration,
  RegistrationStatus,
} from "./schema";

type NewRegistration = Pick<
  Registration,
  "id" | "email" | "guestsCount" | "consentAcceptedAt"
>;

type NewEmailCampaign = Pick<
  EmailCampaign,
  "id" | "subject" | "message" | "ctaLabel" | "ctaUrl" | "recipientCount"
>;

type RegistrationRow = {
  id: string;
  email: string;
  guests_count: number;
  status: RegistrationStatus;
  consent_accepted_at: string;
  email_status: EmailStatus;
  email_sent_at: string | null;
  email_attempt_count: number;
  email_last_attempt_at: string | null;
  email_last_error: string | null;
  email_provider_id: string | null;
  created_at: string;
  updated_at: string;
};

type EmailDeliveryRow = {
  id: string;
  registration_id: string;
  campaign_id: string | null;
  kind: EmailDeliveryKind;
  recipient_email: string;
  attempt_number: number;
  status: EmailStatus;
  provider_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
};

type EmailCampaignRow = {
  id: string;
  subject: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  status: EmailCampaignStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
};

type LegacyStore = {
  registrations: unknown[];
  rateLimits: unknown[];
  siteContent?: unknown;
};

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE registrations (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        guests_count INTEGER NOT NULL CHECK (guests_count BETWEEN 1 AND 10),
        status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
        consent_accepted_at TEXT NOT NULL,
        email_status TEXT NOT NULL CHECK (email_status IN ('PENDING', 'SENT', 'FAILED')),
        email_sent_at TEXT,
        email_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (email_attempt_count >= 0),
        email_last_attempt_at TEXT,
        email_last_error TEXT,
        email_provider_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX registrations_created_at_idx
        ON registrations(created_at DESC);
      CREATE INDEX registrations_status_idx
        ON registrations(status);
      CREATE INDEX registrations_email_status_idx
        ON registrations(email_status);

      CREATE TABLE registration_rate_limits (
        fingerprint TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL CHECK (request_count >= 0)
      );

      CREATE TABLE site_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        content_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE email_campaigns (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        cta_label TEXT,
        cta_url TEXT,
        status TEXT NOT NULL CHECK (
          status IN ('PENDING', 'SENDING', 'COMPLETED', 'PARTIAL', 'FAILED')
        ),
        recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
        sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
        failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE email_deliveries (
        id TEXT PRIMARY KEY,
        registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
        campaign_id TEXT REFERENCES email_campaigns(id) ON DELETE SET NULL,
        kind TEXT NOT NULL CHECK (kind IN ('CONFIRMATION', 'BROADCAST')),
        recipient_email TEXT NOT NULL,
        attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
        provider_id TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        sent_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX email_deliveries_registration_idx
        ON email_deliveries(registration_id, created_at DESC);
      CREATE INDEX email_deliveries_campaign_idx
        ON email_deliveries(campaign_id, created_at DESC);

      CREATE TABLE legacy_imports (
        source_path TEXT PRIMARY KEY,
        source_sha256 TEXT NOT NULL,
        registrations_imported INTEGER NOT NULL,
        rate_limits_imported INTEGER NOT NULL,
        site_content_imported INTEGER NOT NULL,
        imported_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      UPDATE email_deliveries
      SET
        status = 'FAILED',
        error_message = COALESCE(
          error_message,
          'Superseded by a newer pending confirmation attempt'
        ),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE kind = 'CONFIRMATION'
        AND status = 'PENDING'
        AND EXISTS (
          SELECT 1
          FROM email_deliveries AS newer
          WHERE newer.registration_id = email_deliveries.registration_id
            AND newer.kind = 'CONFIRMATION'
            AND newer.status = 'PENDING'
            AND (
              newer.attempt_number > email_deliveries.attempt_number
              OR (
                newer.attempt_number = email_deliveries.attempt_number
                AND (
                  newer.created_at > email_deliveries.created_at
                  OR (
                    newer.created_at = email_deliveries.created_at
                    AND newer.id > email_deliveries.id
                  )
                )
              )
            )
        );

      UPDATE registrations
      SET
        email_status = 'PENDING',
        email_attempt_count = MAX(
          email_attempt_count,
          (
            SELECT pending.attempt_number
            FROM email_deliveries AS pending
            WHERE pending.registration_id = registrations.id
              AND pending.kind = 'CONFIRMATION'
              AND pending.status = 'PENDING'
            ORDER BY pending.attempt_number DESC
            LIMIT 1
          )
        ),
        email_last_attempt_at = (
          SELECT pending.created_at
          FROM email_deliveries AS pending
          WHERE pending.registration_id = registrations.id
            AND pending.kind = 'CONFIRMATION'
            AND pending.status = 'PENDING'
          ORDER BY pending.attempt_number DESC
          LIMIT 1
        ),
        email_last_error = NULL,
        email_provider_id = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE EXISTS (
        SELECT 1
        FROM email_deliveries AS pending
        WHERE pending.registration_id = registrations.id
          AND pending.kind = 'CONFIRMATION'
          AND pending.status = 'PENDING'
      );

      CREATE UNIQUE INDEX email_deliveries_one_pending_confirmation_idx
        ON email_deliveries(registration_id)
        WHERE kind = 'CONFIRMATION' AND status = 'PENDING';
    `,
  },
] as const;

let database: Database.Database | null = null;
let openedDatabasePath: string | null = null;
const confirmationAttemptLeaseMs = 5 * 60 * 1_000;

const legacyArtistGallerySourcesV5 = [
  "/images/hero-festival.webp",
  "/images/craft-workshop.webp",
  "/images/evening-concert.webp",
  "/images/hero-festival.webp",
  "/images/evening-concert.webp",
] as const;

const addedArtistGallerySourcesV6 = [
  "/images/artists/police-in-paris.jpg",
  "/images/artists/parade-of-planets.jpg",
  "/images/artists/borisovskiy-trakt.jpg",
  "/images/artists/wasssup.jpg",
  "/images/artists/huracan.jpg",
] as const;

function migrateLegacyArtistGalleryDefaults(
  gallery: SiteContent["gallery"],
  defaults: SiteContent["gallery"],
) {
  return gallery.map((item, index) => {
    const legacySource = legacyArtistGallerySourcesV5[index];
    const replacement = defaults[index];
    if (legacySource && replacement && item?.src === legacySource) {
      return {
        ...item,
        src: replacement.src,
        alt: replacement.alt,
      };
    }
    return item;
  });
}

function migrateAddedArtistGalleryDefaults(
  gallery: SiteContent["gallery"],
  defaults: SiteContent["gallery"],
) {
  return gallery.map((item, index) => {
    const replacement = defaults[index];
    if (
      replacement &&
      item?.src &&
      addedArtistGallerySourcesV6.includes(
        item.src as (typeof addedArtistGallerySourcesV6)[number],
      )
    ) {
      return {
        ...item,
        src: replacement.src,
        alt: replacement.alt,
        position: replacement.position,
      };
    }
    return item;
  });
}

export class RegistrationAlreadyExistsError extends Error {
  constructor() {
    super("Registration already exists");
  }
}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("Registration not found");
  }
}

export class EmailCampaignNotFoundError extends Error {
  constructor() {
    super("Email campaign not found");
  }
}

function getDatabase(): Database.Database {
  const databasePath = getDatabaseFilePath();
  if (database && openedDatabasePath === databasePath && database.open) {
    return database;
  }

  if (database?.open) database.close();

  const databaseDirectory = dirname(databasePath);
  mkdirSync(databaseDirectory, { recursive: true, mode: 0o700 });
  chmodSync(databaseDirectory, 0o700);
  database = new Database(databasePath);
  openedDatabasePath = databasePath;
  chmodSync(databasePath, 0o600);

  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");
  database.pragma("busy_timeout = 5000");

  applyMigrations(database);
  importLegacyStore(database);
  return database;
}

function applyMigrations(connection: Database.Database) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (
      connection
        .prepare("SELECT version FROM schema_migrations")
        .all() as Array<{ version: number }>
    ).map((row) => row.version),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    connection.transaction(() => {
      connection.exec(migration.sql);
      connection
        .prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        )
        .run(migration.version, new Date().toISOString());
    })();
  }
}

function importLegacyStore(connection: Database.Database) {
  const sourcePath = getDataFilePath();
  const alreadyImported = connection
    .prepare("SELECT 1 FROM legacy_imports WHERE source_path = ?")
    .get(sourcePath);
  if (alreadyImported) return;

  let source: string;
  try {
    source = readFileSync(sourcePath, "utf8");
    chmodSync(sourcePath, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new Error("Не удалось прочитать legacy-хранилище регистраций", {
      cause: error,
    });
  }

  let parsed: LegacyStore;
  try {
    parsed = JSON.parse(source) as LegacyStore;
  } catch (error) {
    throw new Error("Legacy-хранилище регистраций содержит некорректный JSON", {
      cause: error,
    });
  }

  if (!Array.isArray(parsed.registrations) || !Array.isArray(parsed.rateLimits)) {
    throw new Error("Legacy-хранилище регистраций имеет некорректную структуру");
  }

  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  const importedAt = new Date().toISOString();
  const insertRegistration = connection.prepare(`
    INSERT OR IGNORE INTO registrations (
      id, email, guests_count, status, consent_accepted_at, email_status,
      email_sent_at, email_attempt_count, email_last_attempt_at,
      email_last_error, email_provider_id, created_at, updated_at
    ) VALUES (
      @id, @email, @guestsCount, @status, @consentAcceptedAt, @emailStatus,
      @emailSentAt, @emailAttemptCount, @emailLastAttemptAt,
      @emailLastError, NULL, @createdAt, @updatedAt
    )
  `);
  const insertLegacyDelivery = connection.prepare(`
    INSERT OR IGNORE INTO email_deliveries (
      id, registration_id, campaign_id, kind, recipient_email, attempt_number,
      status, provider_id, error_message, created_at, sent_at, updated_at
    ) VALUES (
      @id, @registrationId, NULL, 'CONFIRMATION', @recipientEmail, 1,
      @status, NULL, @errorMessage, @createdAt, @sentAt, @updatedAt
    )
  `);
  const insertRateLimit = connection.prepare(`
    INSERT OR IGNORE INTO registration_rate_limits (
      fingerprint, window_start, request_count
    ) VALUES (@fingerprint, @windowStart, @requestCount)
  `);

  const result = connection.transaction(() => {
    let registrationsImported = 0;
    let rateLimitsImported = 0;

    for (const value of parsed.registrations) {
      const legacy = parseLegacyRegistration(value);
      const emailAttemptCount = legacy.emailStatus === "PENDING" ? 0 : 1;
      const emailLastAttemptAt =
        emailAttemptCount > 0
          ? (legacy.emailSentAt ?? legacy.updatedAt ?? legacy.createdAt)
          : null;
      const emailLastError =
        legacy.emailStatus === "FAILED"
          ? "Ошибка отправки импортирована из legacy-хранилища"
          : null;
      const info = insertRegistration.run({
        ...legacy,
        emailAttemptCount,
        emailLastAttemptAt,
        emailLastError,
      });
      if (info.changes !== 1) {
        const existing = connection
          .prepare(`
            SELECT id, email, email_attempt_count
            FROM registrations
            WHERE id = ? OR email = ? COLLATE NOCASE
          `)
          .get(legacy.id, legacy.email) as
          | { id: string; email: string; email_attempt_count: number }
          | undefined;
        if (
          !existing ||
          existing.id !== legacy.id ||
          existing.email.toLowerCase() !== legacy.email.toLowerCase()
        ) {
          throw new Error(
            "Legacy registration conflicts with an existing SQLite registration",
          );
        }

        if (existing.email_attempt_count === 0 && emailAttemptCount > 0) {
          connection
            .prepare(`
              UPDATE registrations SET
                email_status = ?, email_sent_at = ?, email_attempt_count = ?,
                email_last_attempt_at = ?, email_last_error = ?, updated_at = ?
              WHERE id = ?
            `)
            .run(
              legacy.emailStatus,
              legacy.emailSentAt,
              emailAttemptCount,
              emailLastAttemptAt,
              emailLastError,
              legacy.updatedAt,
              legacy.id,
            );
        }
      }

      registrationsImported += 1;
      if (emailAttemptCount > 0) {
        insertLegacyDelivery.run({
          id: `legacy-${legacy.id}`,
          registrationId: legacy.id,
          recipientEmail: legacy.email,
          status: legacy.emailStatus,
          errorMessage: emailLastError,
          createdAt: emailLastAttemptAt,
          sentAt:
            legacy.emailStatus === "SENT"
              ? (legacy.emailSentAt ?? emailLastAttemptAt)
              : null,
          updatedAt: legacy.updatedAt,
        });
      }
    }

    for (const value of parsed.rateLimits) {
      const rateLimit = parseLegacyRateLimit(value);
      rateLimitsImported += insertRateLimit.run(rateLimit).changes;
    }

    let siteContentImported = 0;
    if (parsed.siteContent !== undefined) {
      siteContentImported = connection
        .prepare(`
          INSERT OR IGNORE INTO site_content (id, content_json, updated_at)
          VALUES (1, ?, ?)
        `)
        .run(JSON.stringify(parsed.siteContent), importedAt).changes;
    }

    connection
      .prepare(`
        INSERT INTO legacy_imports (
          source_path, source_sha256, registrations_imported,
          rate_limits_imported, site_content_imported, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        sourcePath,
        sourceSha256,
        registrationsImported,
        rateLimitsImported,
        siteContentImported,
        importedAt,
      );

    return { registrationsImported, rateLimitsImported, siteContentImported };
  })();

  console.info("Legacy festival data imported into SQLite", result);
}

function parseLegacyRegistration(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Legacy registration has an invalid shape");
  }
  const item = value as Record<string, unknown>;
  const status = item.status;
  const emailStatus = item.emailStatus;
  const guestsCount = item.guestsCount;

  if (
    typeof item.id !== "string" ||
    typeof item.email !== "string" ||
    !Number.isInteger(guestsCount) ||
    (guestsCount as number) < 1 ||
    (guestsCount as number) > 10 ||
    (status !== "CONFIRMED" && status !== "CANCELLED") ||
    (emailStatus !== "PENDING" &&
      emailStatus !== "SENT" &&
      emailStatus !== "FAILED") ||
    typeof item.consentAcceptedAt !== "string" ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string" ||
    (item.emailSentAt !== null && typeof item.emailSentAt !== "string")
  ) {
    throw new Error("Legacy registration contains invalid values");
  }

  return {
    id: item.id,
    email: item.email.trim().toLowerCase(),
    guestsCount: guestsCount as number,
    status,
    consentAcceptedAt: item.consentAcceptedAt,
    emailStatus,
    emailSentAt: item.emailSentAt as string | null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function parseLegacyRateLimit(value: unknown): RateLimit {
  if (!value || typeof value !== "object") {
    throw new Error("Legacy rate limit has an invalid shape");
  }
  const item = value as Record<string, unknown>;
  if (
    typeof item.fingerprint !== "string" ||
    !Number.isInteger(item.windowStart) ||
    !Number.isInteger(item.requestCount)
  ) {
    throw new Error("Legacy rate limit contains invalid values");
  }
  return {
    fingerprint: item.fingerprint,
    windowStart: item.windowStart as number,
    requestCount: item.requestCount as number,
  };
}

function registrationFromRow(row: RegistrationRow): Registration {
  return {
    id: row.id,
    email: row.email,
    guestsCount: row.guests_count,
    status: row.status,
    consentAcceptedAt: row.consent_accepted_at,
    emailStatus: row.email_status,
    emailSentAt: row.email_sent_at,
    emailAttemptCount: row.email_attempt_count,
    emailLastAttemptAt: row.email_last_attempt_at,
    emailLastError: row.email_last_error,
    emailProviderId: row.email_provider_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deliveryFromRow(row: EmailDeliveryRow): EmailDelivery {
  return {
    id: row.id,
    registrationId: row.registration_id,
    campaignId: row.campaign_id,
    kind: row.kind,
    recipientEmail: row.recipient_email,
    attemptNumber: row.attempt_number,
    status: row.status,
    providerId: row.provider_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    updatedAt: row.updated_at,
  };
}

function campaignFromRow(row: EmailCampaignRow): EmailCampaign {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    status: row.status,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const selectRegistrationSql = `
  SELECT id, email, guests_count, status, consent_accepted_at, email_status,
    email_sent_at, email_attempt_count, email_last_attempt_at,
    email_last_error, email_provider_id, created_at, updated_at
  FROM registrations
`;

export async function listRegistrations(): Promise<Registration[]> {
  const rows = getDatabase()
    .prepare(`${selectRegistrationSql} ORDER BY created_at DESC`)
    .all() as RegistrationRow[];
  return rows.map(registrationFromRow);
}

export async function listConfirmedRegistrations(): Promise<Registration[]> {
  const rows = getDatabase()
    .prepare(
      `${selectRegistrationSql} WHERE status = 'CONFIRMED' ORDER BY created_at ASC`,
    )
    .all() as RegistrationRow[];
  return rows.map(registrationFromRow);
}

export async function getRegistration(
  id: string,
): Promise<Registration | null> {
  const row = getDatabase()
    .prepare(`${selectRegistrationSql} WHERE id = ?`)
    .get(id) as RegistrationRow | undefined;
  return row ? registrationFromRow(row) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function storedString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  return typeof source[key] === "string" ? source[key] : fallback;
}

function normalizeSiteContent(
  parsed: Record<string, unknown>,
  defaults: SiteContent,
  migrateRegistrationEmailDefaults = false,
): SiteContent {
  const festival = isRecord(parsed.festival) ? parsed.festival : {};
  const registrationEmail = isRecord(parsed.registrationEmail)
    ? parsed.registrationEmail
    : {};
  const registrationEmailValue = (
    key: keyof SiteContent["registrationEmail"],
  ) => {
    const fallback = defaults.registrationEmail[key];
    const stored = storedString(registrationEmail, key, fallback);
    return migrateRegistrationEmailDefaults &&
      stored === legacyRegistrationEmailV4[key]
      ? fallback
      : stored;
  };

  return {
    version: defaultSiteContent.version,
    festival: {
      name: storedString(festival, "name", defaults.festival.name),
      date: storedString(festival, "date", defaults.festival.date),
      time: storedString(festival, "time", defaults.festival.time),
      place: storedString(festival, "place", defaults.festival.place),
      address: storedString(festival, "address", defaults.festival.address),
      description: storedString(
        festival,
        "description",
        defaults.festival.description,
      ),
      about: storedString(festival, "about", defaults.festival.about),
      features: Array.isArray(festival.features)
        ? (festival.features as SiteContent["festival"]["features"])
        : defaults.festival.features,
    },
    program: Array.isArray(parsed.program)
      ? (parsed.program as SiteContent["program"])
      : defaults.program,
    registrationEmail: {
      subject: registrationEmailValue("subject"),
      heading: registrationEmailValue("heading"),
      intro: registrationEmailValue("intro"),
      closing: registrationEmailValue("closing"),
      calendarButtonLabel: registrationEmailValue("calendarButtonLabel"),
    },
    heroImage: storedString(parsed, "heroImage", defaults.heroImage),
    programImage: storedString(parsed, "programImage", defaults.programImage),
    gallery: Array.isArray(parsed.gallery)
      ? (parsed.gallery as SiteContent["gallery"])
      : defaults.gallery,
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const row = getDatabase()
    .prepare("SELECT content_json FROM site_content WHERE id = 1")
    .get() as { content_json: string } | undefined;
  if (!row) return structuredClone(defaultSiteContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.content_json);
  } catch {
    return structuredClone(defaultSiteContent);
  }

  if (!isRecord(parsed)) return structuredClone(defaultSiteContent);

  const defaults = structuredClone(defaultSiteContent);
  const storedVersion =
    typeof parsed.version === "number" && Number.isInteger(parsed.version)
      ? parsed.version
      : 0;

  if (storedVersion < 4) {
    const legacyHeroImage = storedString(
      parsed,
      "heroImage",
      defaults.heroImage,
    );
    const upgraded: SiteContent = {
      ...defaults,
      // The legacy starter used the festival crowd photo in a product-pack slot.
      // Keep real admin uploads, but migrate that known incompatible default.
      heroImage:
        legacyHeroImage === "/images/hero-festival.webp"
          ? defaults.heroImage
          : legacyHeroImage,
      programImage: storedString(
        parsed,
        "programImage",
        defaults.programImage,
      ),
      gallery: migrateLegacyArtistGalleryDefaults(
        Array.isArray(parsed.gallery)
          ? (parsed.gallery as SiteContent["gallery"])
          : defaults.gallery,
        defaults.gallery,
      ),
    };
    getDatabase()
      .prepare(
        "UPDATE site_content SET content_json = ?, updated_at = ? WHERE id = 1",
      )
      .run(JSON.stringify(upgraded), new Date().toISOString());
    return upgraded;
  }

  const normalized = normalizeSiteContent(
    parsed,
    defaults,
    storedVersion === 4,
  );
  if (storedVersion < 6) {
    normalized.gallery = migrateLegacyArtistGalleryDefaults(
      normalized.gallery,
      defaults.gallery,
    );
  }
  if (storedVersion < 7) {
    normalized.gallery = migrateAddedArtistGalleryDefaults(
      normalized.gallery,
      defaults.gallery,
    );
  }
  if (storedVersion < defaultSiteContent.version) {
    getDatabase()
      .prepare(
        "UPDATE site_content SET content_json = ?, updated_at = ? WHERE id = 1",
      )
      .run(JSON.stringify(normalized), new Date().toISOString());
  }
  return normalized;
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  getDatabase()
    .prepare(`
      INSERT INTO site_content (id, content_json, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content_json = excluded.content_json,
        updated_at = excluded.updated_at
    `)
    .run(JSON.stringify(content), new Date().toISOString());
}

export async function createRegistration(
  input: NewRegistration,
): Promise<Registration> {
  const connection = getDatabase();
  const now = new Date().toISOString();
  try {
    connection
      .prepare(`
        INSERT INTO registrations (
          id, email, guests_count, status, consent_accepted_at, email_status,
          email_sent_at, email_attempt_count, email_last_attempt_at,
          email_last_error, email_provider_id, created_at, updated_at
        ) VALUES (?, ?, ?, 'CONFIRMED', ?, 'PENDING', NULL, 0, NULL, NULL, NULL, ?, ?)
      `)
      .run(
        input.id,
        input.email,
        input.guestsCount,
        input.consentAcceptedAt,
        now,
        now,
      );
  } catch (error) {
    const emailExists = connection
      .prepare("SELECT 1 FROM registrations WHERE email = ? COLLATE NOCASE")
      .get(input.email);
    if (emailExists) throw new RegistrationAlreadyExistsError();
    throw error;
  }

  const registration = await getRegistration(input.id);
  if (!registration) throw new Error("Created registration could not be read");
  return registration;
}

export async function updateRegistrationEmailStatus(
  id: string,
  emailStatus: EmailStatus,
  metadata: {
    errorMessage?: string | null;
    providerId?: string | null;
    attemptedAt?: string | null;
    expectedAttemptCount?: number | null;
  } = {},
): Promise<void> {
  const now = new Date().toISOString();
  getDatabase()
    .prepare(`
      UPDATE registrations SET
        email_status = @emailStatus,
        email_sent_at = CASE
          WHEN @emailStatus = 'SENT' THEN @now
          ELSE email_sent_at
        END,
        email_last_attempt_at = COALESCE(@attemptedAt, email_last_attempt_at),
        email_last_error = @errorMessage,
        email_provider_id = @providerId,
        updated_at = @now
      WHERE id = @id
        AND (
          @expectedAttemptCount IS NULL
          OR email_attempt_count <= @expectedAttemptCount
        )
    `)
    .run({
      id,
      emailStatus,
      now,
      attemptedAt: metadata.attemptedAt ?? null,
      errorMessage: metadata.errorMessage ?? null,
      providerId: metadata.providerId ?? null,
      expectedAttemptCount: metadata.expectedAttemptCount ?? null,
    });
}

export async function beginRegistrationEmailAttempt(
  registrationId: string,
): Promise<{ delivery: EmailDelivery; created: boolean }> {
  const connection = getDatabase();
  const deliveryId = crypto.randomUUID();
  const now = new Date().toISOString();

  const claimAttempt = connection.transaction(() => {
    const registration = connection
      .prepare(`${selectRegistrationSql} WHERE id = ?`)
      .get(registrationId) as RegistrationRow | undefined;
    if (!registration) throw new RegistrationNotFoundError();

    const pendingDelivery = connection
      .prepare(`
        SELECT * FROM email_deliveries
        WHERE registration_id = ?
          AND kind = 'CONFIRMATION'
          AND status = 'PENDING'
        ORDER BY attempt_number DESC
        LIMIT 1
      `)
      .get(registrationId) as EmailDeliveryRow | undefined;
    if (pendingDelivery) {
      const pendingStartedAt = Date.parse(pendingDelivery.created_at);
      const pendingAge = Date.now() - pendingStartedAt;
      if (
        Number.isFinite(pendingStartedAt) &&
        pendingAge < confirmationAttemptLeaseMs
      ) {
        return {
          delivery: deliveryFromRow(pendingDelivery),
          created: false,
        };
      }

      connection
        .prepare(`
          UPDATE email_deliveries
          SET status = 'FAILED', error_message = ?, updated_at = ?
          WHERE id = ? AND status = 'PENDING'
        `)
        .run(
          "Confirmation email delivery lease expired",
          now,
          pendingDelivery.id,
        );
    }

    const attemptNumber = registration.email_attempt_count + 1;
    connection
      .prepare(`
        INSERT INTO email_deliveries (
          id, registration_id, campaign_id, kind, recipient_email,
          attempt_number, status, provider_id, error_message,
          created_at, sent_at, updated_at
        ) VALUES (?, ?, NULL, 'CONFIRMATION', ?, ?, 'PENDING', NULL, NULL, ?, NULL, ?)
      `)
      .run(
        deliveryId,
        registrationId,
        registration.email,
        attemptNumber,
        now,
        now,
      );
    connection
      .prepare(`
        UPDATE registrations SET
          email_status = 'PENDING',
          email_attempt_count = ?,
          email_last_attempt_at = ?,
          email_last_error = NULL,
          email_provider_id = NULL,
          updated_at = ?
        WHERE id = ?
      `)
      .run(attemptNumber, now, now, registrationId);

    return {
      delivery: deliveryFromRow(
        connection
          .prepare("SELECT * FROM email_deliveries WHERE id = ?")
          .get(deliveryId) as EmailDeliveryRow,
      ),
      created: true,
    };
  });

  // IMMEDIATE serializes the read-before-insert claim across processes sharing
  // the SQLite database, so only one request can own a pending confirmation.
  return claimAttempt.immediate();
}

export async function beginBroadcastEmailAttempt(
  campaignId: string,
  registrationId: string,
): Promise<EmailDelivery> {
  const connection = getDatabase();
  const deliveryId = crypto.randomUUID();
  const now = new Date().toISOString();

  const createAttempt = connection.transaction(() => {
    const campaign = connection
      .prepare("SELECT id FROM email_campaigns WHERE id = ?")
      .get(campaignId);
    if (!campaign) throw new EmailCampaignNotFoundError();
    const registration = connection
      .prepare("SELECT id, email FROM registrations WHERE id = ?")
      .get(registrationId) as { id: string; email: string } | undefined;
    if (!registration) throw new RegistrationNotFoundError();

    const previous = connection
      .prepare(`
        SELECT COALESCE(MAX(attempt_number), 0) AS attempt_number
        FROM email_deliveries
        WHERE campaign_id = ? AND registration_id = ? AND kind = 'BROADCAST'
      `)
      .get(campaignId, registrationId) as { attempt_number: number };
    const attemptNumber = previous.attempt_number + 1;

    connection
      .prepare(`
        INSERT INTO email_deliveries (
          id, registration_id, campaign_id, kind, recipient_email,
          attempt_number, status, provider_id, error_message,
          created_at, sent_at, updated_at
        ) VALUES (?, ?, ?, 'BROADCAST', ?, ?, 'PENDING', NULL, NULL, ?, NULL, ?)
      `)
      .run(
        deliveryId,
        registrationId,
        campaignId,
        registration.email,
        attemptNumber,
        now,
        now,
      );

    return deliveryFromRow(
      connection
        .prepare("SELECT * FROM email_deliveries WHERE id = ?")
        .get(deliveryId) as EmailDeliveryRow,
    );
  });

  return createAttempt.immediate();
}

export async function completeEmailAttempt(
  deliveryId: string,
  result:
    | { ok: true; providerId: string | null }
    | { ok: false; errorMessage: string },
): Promise<EmailDelivery> {
  const connection = getDatabase();
  const now = new Date().toISOString();

  const finishAttempt = connection.transaction(() => {
    const delivery = connection
      .prepare("SELECT * FROM email_deliveries WHERE id = ?")
      .get(deliveryId) as EmailDeliveryRow | undefined;
    if (!delivery) throw new Error("Email delivery not found");
    if (delivery.status !== "PENDING") return deliveryFromRow(delivery);

    const status: EmailStatus = result.ok ? "SENT" : "FAILED";
    const providerId = result.ok ? result.providerId : null;
    const errorMessage = result.ok ? null : result.errorMessage.slice(0, 1_000);
    connection
      .prepare(`
        UPDATE email_deliveries SET
          status = ?, provider_id = ?, error_message = ?,
          sent_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        status,
        providerId,
        errorMessage,
        result.ok ? now : null,
        now,
        deliveryId,
      );

    if (delivery.kind === "CONFIRMATION") {
      connection
        .prepare(`
          UPDATE registrations SET
            email_status = ?,
            email_sent_at = CASE WHEN ? = 'SENT' THEN ? ELSE email_sent_at END,
            email_last_error = ?,
            email_provider_id = ?,
            updated_at = ?
          WHERE id = ? AND email_attempt_count = ?
        `)
        .run(
          status,
          status,
          now,
          errorMessage,
          providerId,
          now,
          delivery.registration_id,
          delivery.attempt_number,
        );
    }

    return deliveryFromRow(
      connection
        .prepare("SELECT * FROM email_deliveries WHERE id = ?")
        .get(deliveryId) as EmailDeliveryRow,
    );
  });

  return finishAttempt.immediate();
}

export async function listEmailDeliveries(options: {
  registrationId?: string;
  campaignId?: string;
  limit?: number;
} = {}): Promise<EmailDelivery[]> {
  const clauses: string[] = [];
  const parameters: Array<string | number> = [];
  if (options.registrationId) {
    clauses.push("registration_id = ?");
    parameters.push(options.registrationId);
  }
  if (options.campaignId) {
    clauses.push("campaign_id = ?");
    parameters.push(options.campaignId);
  }
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  parameters.push(limit);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDatabase()
    .prepare(`SELECT * FROM email_deliveries ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...parameters) as EmailDeliveryRow[];
  return rows.map(deliveryFromRow);
}

export async function createEmailCampaign(
  input: NewEmailCampaign,
): Promise<EmailCampaign> {
  const now = new Date().toISOString();
  const connection = getDatabase();
  connection
    .prepare(`
      INSERT INTO email_campaigns (
        id, subject, message, cta_label, cta_url, status,
        recipient_count, sent_count, failed_count, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 0, 0, ?, NULL)
    `)
    .run(
      input.id,
      input.subject,
      input.message,
      input.ctaLabel,
      input.ctaUrl,
      input.recipientCount,
      now,
    );
  const campaign = await getEmailCampaign(input.id);
  if (!campaign) throw new Error("Created email campaign could not be read");
  return campaign;
}

export async function markEmailCampaignSending(id: string): Promise<void> {
  const result = getDatabase()
    .prepare("UPDATE email_campaigns SET status = 'SENDING' WHERE id = ?")
    .run(id);
  if (result.changes !== 1) throw new EmailCampaignNotFoundError();
}

export async function finalizeEmailCampaign(
  id: string,
): Promise<EmailCampaign> {
  const connection = getDatabase();
  const completedAt = new Date().toISOString();
  connection.transaction(() => {
    const campaign = connection
      .prepare("SELECT recipient_count FROM email_campaigns WHERE id = ?")
      .get(id) as { recipient_count: number } | undefined;
    if (!campaign) throw new EmailCampaignNotFoundError();
    const totals = connection
      .prepare(`
        SELECT
          SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sent_count,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count
        FROM email_deliveries
        WHERE campaign_id = ? AND kind = 'BROADCAST'
      `)
      .get(id) as { sent_count: number | null; failed_count: number | null };
    const sentCount = totals.sent_count ?? 0;
    const failedCount = totals.failed_count ?? 0;
    const status: EmailCampaignStatus =
      campaign.recipient_count === 0 || sentCount === campaign.recipient_count
        ? "COMPLETED"
        : sentCount > 0
          ? "PARTIAL"
          : "FAILED";
    connection
      .prepare(`
        UPDATE email_campaigns SET
          status = ?, sent_count = ?, failed_count = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(status, sentCount, failedCount, completedAt, id);
  })();

  const campaign = await getEmailCampaign(id);
  if (!campaign) throw new EmailCampaignNotFoundError();
  return campaign;
}

export async function getEmailCampaign(
  id: string,
): Promise<EmailCampaign | null> {
  const row = getDatabase()
    .prepare("SELECT * FROM email_campaigns WHERE id = ?")
    .get(id) as EmailCampaignRow | undefined;
  return row ? campaignFromRow(row) : null;
}

export async function listEmailCampaigns(limit = 50): Promise<EmailCampaign[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = getDatabase()
    .prepare("SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT ?")
    .all(safeLimit) as EmailCampaignRow[];
  return rows.map(campaignFromRow);
}

export async function consumeRegistrationRateLimit(
  fingerprint: string,
  now: number,
  windowSeconds: number,
  maxRequests: number,
): Promise<boolean> {
  const connection = getDatabase();
  return connection.transaction(() => {
    connection
      .prepare("DELETE FROM registration_rate_limits WHERE window_start < ?")
      .run(now - windowSeconds);
    const rateLimit = connection
      .prepare(`
        SELECT fingerprint, window_start, request_count
        FROM registration_rate_limits WHERE fingerprint = ?
      `)
      .get(fingerprint) as
      | {
          fingerprint: string;
          window_start: number;
          request_count: number;
        }
      | undefined;

    if (!rateLimit) {
      connection
        .prepare(`
          INSERT INTO registration_rate_limits (
            fingerprint, window_start, request_count
          ) VALUES (?, ?, 1)
        `)
        .run(fingerprint, now);
      return true;
    }

    if (now - rateLimit.window_start >= windowSeconds) {
      connection
        .prepare(`
          UPDATE registration_rate_limits
          SET window_start = ?, request_count = 1
          WHERE fingerprint = ?
        `)
        .run(now, fingerprint);
      return true;
    }
    if (rateLimit.request_count >= maxRequests) return false;

    connection
      .prepare(`
        UPDATE registration_rate_limits
        SET request_count = request_count + 1
        WHERE fingerprint = ?
      `)
      .run(fingerprint);
    return true;
  })();
}

export function closeDatabase(): void {
  if (database?.open) database.close();
  database = null;
  openedDatabasePath = null;
}
