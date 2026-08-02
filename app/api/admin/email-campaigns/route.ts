import { z } from "zod";
import {
  createEmailCampaign,
  finalizeEmailCampaign,
  getSiteContent,
  listConfirmedRegistrations,
  listEmailCampaigns,
  markEmailCampaignSending,
} from "@/db";
import { deliverBroadcastMessage } from "@/lib/email";
import { adminMutationSecurityError } from "@/lib/admin-request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const campaignSchema = z
  .object({
    subject: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(5_000),
    ctaLabel: z.string().trim().min(1).max(80).optional(),
    ctaUrl: z
      .string()
      .trim()
      .url()
      .refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === "https:" || protocol === "http:";
      }, "Разрешены только HTTP(S)-ссылки")
      .optional(),
  })
  .refine(
    (value) => Boolean(value.ctaLabel) === Boolean(value.ctaUrl),
    "Текст и ссылка кнопки должны быть заполнены вместе",
  );
const maxRequestBytes = 16 * 1024;

export async function GET() {
  return Response.json(
    { campaigns: await listEmailCampaigns() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const securityError = adminMutationSecurityError(request);
  if (securityError) return securityError;

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return Response.json({ message: "Слишком большой запрос" }, { status: 413 });
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxRequestBytes) {
      return Response.json(
        { message: "Слишком большой запрос" },
        { status: 413 },
      );
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json({ message: "Некорректный формат данных" }, { status: 400 });
  }

  const parsed = campaignSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        message: "Проверьте параметры рассылки",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const registrations = await listConfirmedRegistrations();
  const campaign = await createEmailCampaign({
    id: crypto.randomUUID(),
    subject: parsed.data.subject,
    message: parsed.data.message,
    ctaLabel: parsed.data.ctaLabel ?? null,
    ctaUrl: parsed.data.ctaUrl ?? null,
    recipientCount: registrations.length,
  });
  await markEmailCampaignSending(campaign.id);

  const content = await getSiteContent();
  const concurrency = 4;
  for (let index = 0; index < registrations.length; index += concurrency) {
    const batch = registrations.slice(index, index + concurrency);
    await Promise.all(
      batch.map(async (registration) => {
        try {
          await deliverBroadcastMessage(campaign, registration, content);
        } catch (error) {
          console.error(
            "Broadcast recipient processing failed",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }),
    );
  }

  const completedCampaign = await finalizeEmailCampaign(campaign.id);
  return Response.json(
    {
      success:
        completedCampaign.status === "COMPLETED" ||
        completedCampaign.status === "PARTIAL",
      campaign: completedCampaign,
      message:
        completedCampaign.failedCount === 0
          ? "Рассылка завершена"
          : "Рассылка завершена с ошибками; детали сохранены в журнале",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
