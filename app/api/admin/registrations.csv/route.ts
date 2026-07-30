import { listRegistrations } from "@/db";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const rows = await listRegistrations();

  const csv = [
    ["email", "guestsCount", "status", "emailStatus", "createdAt"],
    ...rows.map((row) => [
      row.email,
      row.guestsCount,
      row.status,
      row.emailStatus,
      row.createdAt,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="festival-registrations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
