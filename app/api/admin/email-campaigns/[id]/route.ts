import {
  getEmailCampaign,
  listEmailDeliveries,
} from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length > 128) {
    return Response.json({ message: "Некорректный идентификатор" }, { status: 400 });
  }

  const campaign = await getEmailCampaign(id);
  if (!campaign) {
    return Response.json({ message: "Рассылка не найдена" }, { status: 404 });
  }

  return Response.json(
    {
      campaign,
      deliveries: await listEmailDeliveries({ campaignId: id, limit: 500 }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
