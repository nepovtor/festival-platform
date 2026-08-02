import { z } from "zod";
import { getSiteContent, saveSiteContent } from "@/db";
import { adminMutationSecurityError } from "@/lib/admin-request-security";

const maxRequestBytes = 128 * 1024;

const text = z.string().trim().min(1, "Заполните поле").max(2_000);
const featureSchema = z.object({
  title: text.max(80),
  description: text.max(400),
});
const programItemSchema = z.object({
  time: text.max(20),
  title: text.max(120),
  description: text.max(600),
  venue: text.max(120),
  category: text.max(80),
});
const imageSchema = z.object({
  src: text.max(260),
  alt: text.max(180),
  className: text.max(80),
  position: text.max(80),
});
const siteContentSchema = z.object({
  version: z.number().int().min(1),
  festival: z.object({
    name: text.max(100),
    date: text.max(100),
    time: text.max(100),
    place: text.max(160),
    address: text.max(240),
    description: text.max(800),
    about: text.max(2_000),
    features: z.array(featureSchema).min(1).max(6),
  }),
  program: z.array(programItemSchema).min(1).max(24),
  heroImage: text.max(260),
  programImage: text.max(260),
  gallery: z.array(imageSchema).length(6),
});

export async function GET() {
  return Response.json(await getSiteContent());
}

export async function PUT(request: Request) {
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

  const parsed = siteContentSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        message: "Проверьте заполнение полей",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  await saveSiteContent(parsed.data);
  return Response.json({ success: true });
}
