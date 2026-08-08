import {
  consumeRegistrationRateLimit,
  createRegistration,
  RegistrationAlreadyExistsError,
  updateRegistrationEmailStatus,
} from "@/db";
import type { Registration } from "@/db/schema";
import { deliverRegistrationConfirmation } from "@/lib/email";
import { isSameOriginMutation } from "@/lib/admin-request-security";
import { registrationSchema } from "@/lib/registration-schema";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 5;

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    { success: false, code, message, ...extra },
    { status },
  );
}

async function clientFingerprint(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function consumeRateLimit(request: Request) {
  const fingerprint = await clientFingerprint(request);
  const now = Math.floor(Date.now() / 1000);
  return consumeRegistrationRateLimit(
    fingerprint,
    now,
    WINDOW_SECONDS,
    MAX_REQUESTS,
  );
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return errorResponse(
        403,
        "ORIGIN_NOT_ALLOWED",
        "Запрос отклонён политикой безопасности",
      );
    }

    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return errorResponse(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Ожидается JSON-запрос",
      );
    }

    const bodyText = await request.text();
    if (bodyText.length > 8_192) {
      return errorResponse(413, "PAYLOAD_TOO_LARGE", "Слишком большой запрос");
    }

    if (!(await consumeRateLimit(request))) {
      console.warn("Registration rate limit exceeded");
      return errorResponse(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Слишком много запросов. Попробуйте позже.",
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Проверьте введённые данные",
      );
    }

    const parsed = registrationSchema.safeParse(payload);
    if (!parsed.success) {
      console.info("Registration payload rejected by validation");
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Проверьте введённые данные",
        { fieldErrors: parsed.error.flatten().fieldErrors },
      );
    }

    if (parsed.data.website) {
      return Response.json(
        { success: true, message: "Регистрация успешно создана" },
        { status: 201 },
      );
    }

    const registrationId = crypto.randomUUID();
    const now = new Date().toISOString();

    let registration: Registration;
    try {
      registration = await createRegistration({
        id: registrationId,
        email: parsed.data.email,
        guestsCount: parsed.data.guestsCount,
        consentAcceptedAt: now,
      });
    } catch (error) {
      if (error instanceof RegistrationAlreadyExistsError) {
        return errorResponse(
          409,
          "REGISTRATION_ALREADY_EXISTS",
          "Этот email уже зарегистрирован",
        );
      }
      throw error;
    }

    let emailDelivered = false;
    try {
      const emailDelivery = await deliverRegistrationConfirmation(registration);
      emailDelivered = emailDelivery.result.ok;
    } catch (error) {
      console.error(
        "Registration was saved, but confirmation processing failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      try {
        await updateRegistrationEmailStatus(registrationId, "FAILED", {
          attemptedAt: new Date().toISOString(),
          errorMessage: "Confirmation processing failed",
          expectedAttemptCount: registration.emailAttemptCount + 1,
        });
      } catch (statusError) {
        console.error(
          "Failed to persist confirmation error status",
          statusError instanceof Error ? statusError.message : "Unknown error",
        );
      }
    }

    console.info("Festival registration created");

    return Response.json(
      {
        success: true,
        registrationId,
        emailDelivered,
        message: emailDelivered
          ? "Спасибо! Вы зарегистрированы. Подтверждение отправлено на email."
          : "Спасибо! Регистрация сохранена. Письмо с подтверждением будет отправлено дополнительно.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Registration failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Не удалось выполнить регистрацию. Попробуйте ещё раз.",
    );
  }
}
