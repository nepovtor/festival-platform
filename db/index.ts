import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { defaultSiteContent, type SiteContent } from "@/content/site-content";
import { getDataFilePath } from "@/lib/local-storage-paths";
import type { EmailStatus, RateLimit, Registration } from "./schema";

type Store = {
  registrations: Registration[];
  rateLimits: RateLimit[];
  siteContent?: SiteContent;
};

type NewRegistration = Pick<
  Registration,
  "id" | "email" | "guestsCount" | "consentAcceptedAt"
>;

const emptyStore = (): Store => ({ registrations: [], rateLimits: [] });
let writeQueue: Promise<void> = Promise.resolve();

export class RegistrationAlreadyExistsError extends Error {
  constructor() {
    super("Registration already exists");
  }
}

export async function listRegistrations(): Promise<Registration[]> {
  const store = await readStore();
  return [...store.registrations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getSiteContent(): Promise<SiteContent> {
  const store = await readStore();
  const content = store.siteContent;
  if (!content) return structuredClone(defaultSiteContent);

  return {
    ...structuredClone(defaultSiteContent),
    ...content,
    festival: {
      ...structuredClone(defaultSiteContent.festival),
      ...content.festival,
      features: content.festival?.features ?? defaultSiteContent.festival.features,
    },
    program: content.program ?? defaultSiteContent.program,
    gallery: content.gallery ?? defaultSiteContent.gallery,
  };
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  await updateStore((store) => {
    store.siteContent = structuredClone(content);
  });
}

export async function createRegistration(
  input: NewRegistration,
): Promise<Registration> {
  return updateStore((store) => {
    if (store.registrations.some((item) => item.email === input.email)) {
      throw new RegistrationAlreadyExistsError();
    }

    const now = new Date().toISOString();
    const registration: Registration = {
      ...input,
      status: "CONFIRMED",
      emailStatus: "PENDING",
      emailSentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.registrations.push(registration);
    return registration;
  });
}

export async function updateRegistrationEmailStatus(
  id: string,
  emailStatus: EmailStatus,
): Promise<void> {
  await updateStore((store) => {
    const registration = store.registrations.find((item) => item.id === id);
    if (!registration) return;

    registration.emailStatus = emailStatus;
    registration.emailSentAt = emailStatus === "SENT" ? new Date().toISOString() : null;
    registration.updatedAt = new Date().toISOString();
  });
}

export async function consumeRegistrationRateLimit(
  fingerprint: string,
  now: number,
  windowSeconds: number,
  maxRequests: number,
): Promise<boolean> {
  return updateStore((store) => {
    const rateLimit = store.rateLimits.find(
      (item) => item.fingerprint === fingerprint,
    );

    if (!rateLimit) {
      store.rateLimits.push({ fingerprint, windowStart: now, requestCount: 1 });
      return true;
    }

    if (now - rateLimit.windowStart >= windowSeconds) {
      rateLimit.windowStart = now;
      rateLimit.requestCount = 1;
      return true;
    }

    if (rateLimit.requestCount >= maxRequests) return false;

    rateLimit.requestCount += 1;
    return true;
  });
}

async function readStore(): Promise<Store> {
  try {
    const value = JSON.parse(await readFile(getDataFilePath(), "utf8")) as Store;
    if (!Array.isArray(value.registrations) || !Array.isArray(value.rateLimits)) {
      throw new Error("invalid store shape");
    }
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw new Error("Не удалось прочитать локальное хранилище регистраций", {
      cause: error,
    });
  }
}

async function updateStore<T>(mutate: (store: Store) => T): Promise<T> {
  const operation = writeQueue.then(async () => {
    const store = await readStore();
    const result = mutate(store);
    const destination = getDataFilePath();
    await mkdir(dirname(destination), { recursive: true });

    const temporary = `${destination}.tmp`;
    await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}
