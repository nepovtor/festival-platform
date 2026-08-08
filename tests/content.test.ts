import { describe, expect, it } from "vitest";
import { artists, festival, festivalRecord, zones } from "@/content/festival";
import { program } from "@/content/program";
import { defaultSiteContent } from "@/content/site-content";

describe("канонические данные фестиваля", () => {
  it("использует актуальные дату и время", () => {
    expect(festival.date).toBe("16 августа 2026");
    expect(festival.dateShort).toBe("16 августа");
    expect(festival.time).toBe("12:00–22:00");
    expect(defaultSiteContent.festival.date).toBe("16 августа 2026");
    expect(defaultSiteContent.festival.time).toBe("12:00–22:00");
  });

  it("содержит полную актуальную программу", () => {
    expect(program.map((item) => item.time)).toEqual([
      "12:00–13:40",
      "13:40–13:50",
      "13:50–15:00",
      "15:00–16:00",
      "16:00–17:00",
      "17:00–17:30",
      "17:30–18:10",
      "18:10–18:40",
      "18:40–19:15",
      "19:15–20:15",
      "20:15–20:30",
      "20:30–22:00",
    ]);
    expect(program).toHaveLength(12);
  });

  it("заменяет музыкальный сет подведением итогов", () => {
    const finale = program.find((item) => item.time === "20:15–20:30");
    expect(finale).toMatchObject({
      title: "Подведение итогов",
      description: "Подведение итогов фестиваля",
    });
    expect(
      program.some(
        (item) =>
          item.time === "20:15–20:30" &&
          /музыкальн(?:ый|ого) сет/iu.test(`${item.title} ${item.description}`),
      ),
    ).toBe(false);
  });

  it("последовательно использует Police in Paris", () => {
    const serialized = JSON.stringify({ artists, program });
    expect(serialized).toContain("Police in Paris");
    expect(serialized).not.toContain("Polis in Paris");
  });

  it("показывает рекорд отдельно от шести фестивальных зон", () => {
    expect(festivalRecord.title).toBe("Грибной рекорд");
    expect(zones).toHaveLength(6);
    expect(zones.map((zone) => zone.title)).toContain("Активации");
    expect(zones.map((zone) => zone.title)).not.toContain("Грибной рекорд");
  });

  it("не оставляет конечные точки в коротких описаниях", () => {
    expect(program.every((item) => !item.description.endsWith("."))).toBe(true);
  });
});
