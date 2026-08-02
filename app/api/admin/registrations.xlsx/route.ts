import ExcelJS from "exceljs";
import { listRegistrations } from "@/db";
import type { Registration } from "@/db/schema";

const registrationStatusLabels = {
  CONFIRMED: "Подтверждена",
  CANCELLED: "Отменена",
} as const;

const emailStatusLabels = {
  PENDING: "Ожидает",
  SENT: "Отправлено",
  FAILED: "Ошибка",
} as const;

function toSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function toDate(value: string | null) {
  return value ? new Date(value) : "—";
}

function registrationCells(registration: Registration, index: number) {
  return [
    index,
    toSpreadsheetText(registration.email),
    registration.guestsCount,
    registrationStatusLabels[registration.status],
    emailStatusLabels[registration.emailStatus],
    toDate(registration.createdAt),
    toDate(registration.consentAcceptedAt),
    toDate(registration.emailSentAt),
  ];
}

export async function GET() {
  const registrations = await listRegistrations();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Грибной фестиваль Lay’s";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Регистрации", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "№", key: "number", width: 7 },
    { header: "E-mail", key: "email", width: 32 },
    { header: "Гостей", key: "guests", width: 11 },
    { header: "Статус регистрации", key: "registrationStatus", width: 24 },
    { header: "Статус письма", key: "emailStatus", width: 18 },
    { header: "Дата регистрации", key: "createdAt", width: 21 },
    { header: "Согласие на данные", key: "consentAcceptedAt", width: 22 },
    { header: "Письмо отправлено", key: "emailSentAt", width: 21 },
  ];
  sheet.addRows(registrations.map(registrationCells));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3C2D21" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 24;

  sheet.autoFilter = `A1:H${Math.max(sheet.rowCount, 1)}`;
  sheet.getColumn("number").alignment = { horizontal: "center" };
  sheet.getColumn("guests").alignment = { horizontal: "center" };

  ["createdAt", "consentAcceptedAt", "emailSentAt"].forEach((key) => {
    sheet.getColumn(key).numFmt = "dd.mm.yyyy hh:mm";
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "middle" };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFE4DDD5" } },
      };
    });
  });

  const file = await workbook.xlsx.writeBuffer();
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="festival-registrations.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
