import { getRegistration } from "@/db";
import { deliverRegistrationConfirmation } from "@/lib/email";
import { adminMutationSecurityError } from "@/lib/admin-request-security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const securityError = adminMutationSecurityError(request);
  if (securityError) return securityError;

  const { id } = await params;
  if (!id || id.length > 128) {
    return Response.json({ message: "Некорректный идентификатор" }, { status: 400 });
  }

  const registration = await getRegistration(id);
  if (!registration) {
    return Response.json({ message: "Регистрация не найдена" }, { status: 404 });
  }
  if (registration.status !== "CONFIRMED") {
    return Response.json(
      { message: "Нельзя отправить подтверждение отменённой регистрации" },
      { status: 409 },
    );
  }

  try {
    const { delivery, result } =
      await deliverRegistrationConfirmation(registration);
    const updatedRegistration = await getRegistration(id);
    const status = result.ok
      ? 200
      : result.reason === "ALREADY_IN_PROGRESS"
        ? 409
      : result.reason === "NOT_CONFIGURED"
        ? 503
        : 502;
    return Response.json(
      {
        success: result.ok,
        emailDelivered: result.ok,
        registration: updatedRegistration,
        delivery,
        message: result.ok
          ? "Письмо отправлено повторно"
          : result.reason === "ALREADY_IN_PROGRESS"
            ? "Отправка письма уже выполняется"
          : "Письмо не отправлено; попытка сохранена в журнале",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Confirmation resend failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { message: "Не удалось обработать повторную отправку" },
      { status: 500 },
    );
  }
}
