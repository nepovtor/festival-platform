import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { defaultSiteContent } from "@/content/site-content";
import { generateRegistrationPdf } from "@/lib/registration-pdf";

describe("registration PDF", () => {
  it("generates a readable A4 PDF with the full Cyrillic program", async () => {
    const content = structuredClone(defaultSiteContent);
    content.registrationEmail.heading = "Спасибо за регистрацию";
    content.registrationEmail.closing = "До встречи на грибном фестивале";
    expect(content.program).toHaveLength(12);
    expect(content.program).toContainEqual(
      expect.objectContaining({
        time: "20:15–20:30",
        title: "Подведение итогов",
      }),
    );

    const result = await generateRegistrationPdf({
      content,
      registration: { guestsCount: 7 },
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.byteLength).toBeGreaterThan(10_000);
    expect(result.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const document = await PDFDocument.load(result);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(document.getPageCount()).toBeLessThanOrEqual(3);
    expect(document.getTitle()).toBe("Регистрация на грибной фестиваль Lay’s");
  });

  it("bounds multiline editable copy without creating clipped extra pages", async () => {
    const content = structuredClone(defaultSiteContent);
    const multiline = Array.from({ length: 260 }, () => "А").join("\n");
    expect(multiline.length).toBeLessThan(800);
    content.registrationEmail.intro = multiline;
    content.registrationEmail.closing = multiline;

    const result = await generateRegistrationPdf({
      content,
      registration: { guestsCount: 2 },
    });
    const document = await PDFDocument.load(result);

    expect(document.getPageCount()).toBeLessThanOrEqual(3);
  });

  it("uses a compact three-page layout for the largest valid program", async () => {
    const content = structuredClone(defaultSiteContent);
    const multiline = Array.from({ length: 260 }, () => "Текст").join("\n");
    content.registrationEmail.intro = multiline.slice(0, 800);
    content.registrationEmail.closing = multiline.slice(0, 800);
    const description =
      "Очень подробное описание события с музыкой и активностями для гостей. "
        .repeat(10)
        .slice(0, 600);
    content.program = Array.from({ length: 24 }, (_, index) => ({
      time: "12:00–12:30",
      title: `Событие ${index + 1}: большая фестивальная программа`,
      description,
      venue: "Главная сцена",
      category: "Музыка",
    }));

    const result = await generateRegistrationPdf({
      content,
      registration: { guestsCount: 10 },
    });
    const document = await PDFDocument.load(result);

    expect(document.getPageCount()).toBe(3);
  });
});
