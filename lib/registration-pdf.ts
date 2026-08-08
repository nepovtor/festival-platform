import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { SiteContent } from "@/content/site-content";

type RegistrationPdfInput = {
  content: SiteContent;
  registration: {
    guestsCount: number;
  };
};

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type PageState = {
  page: PDFPage;
  y: number;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const pageMargin = 48;
const contentWidth = pageWidth - pageMargin * 2;
const bottomMargin = 64;
const maxPdfPages = 3;
const compactProgramItemHeight = 50;
const continuationProgramStartY = pageHeight - 122;

const colors = {
  background: rgb(1, 249 / 255, 239 / 255),
  cream: rgb(1, 233 / 255, 190 / 255),
  orange: rgb(188 / 255, 122 / 255, 38 / 255),
  darkGreen: rgb(25 / 255, 43 / 255, 9 / 255),
  brown: rgb(86 / 255, 55 / 255, 33 / 255),
  line: rgb(225 / 255, 190 / 255, 126 / 255),
};

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const chunks: string[] = [];
  let current = "";

  for (const character of word) {
    const candidate = `${current}${character}`;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const lines: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const originalWord of words) {
      const wordParts =
        font.widthOfTextAtSize(originalWord, size) > maxWidth
          ? splitLongWord(originalWord, font, size, maxWidth)
          : [originalWord];

      for (const word of wordParts) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function fitSingleLine(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  forceEllipsis = false,
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const ellipsis = "…";
  const complete = forceEllipsis ? `${normalized}${ellipsis}` : normalized;
  if (font.widthOfTextAtSize(complete, size) <= maxWidth) return complete;

  const characters = Array.from(normalized);
  let lowerBound = 0;
  let upperBound = characters.length;
  while (lowerBound < upperBound) {
    const midpoint = Math.ceil((lowerBound + upperBound) / 2);
    const candidate = `${characters.slice(0, midpoint).join("").trimEnd()}${ellipsis}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      lowerBound = midpoint;
    } else {
      upperBound = midpoint - 1;
    }
  }

  if (lowerBound === 0) {
    return font.widthOfTextAtSize(ellipsis, size) <= maxWidth ? ellipsis : "";
  }
  return `${characters.slice(0, lowerBound).join("").trimEnd()}${ellipsis}`;
}

function limitedWrappedLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines?: number,
) {
  const lines = wrapText(text, font, size, maxWidth);
  if (maxLines === undefined || lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const finalLine = visible[maxLines - 1]?.trim() || "";
  visible[maxLines - 1] = fitSingleLine(finalLine, font, size, maxWidth, true);
  return visible;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth: number;
    lineHeight: number;
    color: ReturnType<typeof rgb>;
    maxLines?: number;
  },
) {
  const lines = limitedWrappedLines(
    text,
    options.font,
    options.size,
    options.maxWidth,
    options.maxLines,
  );
  lines.forEach((line, index) => {
    if (!line) return;
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      font: options.font,
      size: options.size,
      color: options.color,
    });
  });
  return options.y - lines.length * options.lineHeight;
}

function programFitsWithinPageLimit(
  startY: number,
  itemHeights: number[],
  closingHeight: number,
) {
  let pageNumber = 1;
  let y = startY;

  for (const height of itemHeights) {
    const reservedClosingHeight =
      pageNumber === maxPdfPages ? closingHeight : 0;
    if (y - height < bottomMargin + reservedClosingHeight) {
      pageNumber += 1;
      if (pageNumber > maxPdfPages) return false;
      y = continuationProgramStartY;
      const nextReservedClosingHeight =
        pageNumber === maxPdfPages ? closingHeight : 0;
      if (y - height < bottomMargin + nextReservedClosingHeight) return false;
    }
    y -= height;
  }

  return y - closingHeight >= bottomMargin || pageNumber < maxPdfPages;
}

function addPage(document: PDFDocument, fonts: Fonts, continuation = false) {
  const page = document.addPage([pageWidth, pageHeight]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: colors.background,
  });
  page.drawRectangle({
    x: 0,
    y: pageHeight - 12,
    width: pageWidth,
    height: 12,
    color: colors.orange,
  });

  if (continuation) {
    page.drawText("ГРИБНОЙ ФЕСТИВАЛЬ LAY’S", {
      x: pageMargin,
      y: pageHeight - 48,
      font: fonts.bold,
      size: 10,
      color: colors.orange,
    });
    page.drawLine({
      start: { x: pageMargin, y: pageHeight - 60 },
      end: { x: pageWidth - pageMargin, y: pageHeight - 60 },
      thickness: 0.8,
      color: colors.line,
    });
  }

  return {
    page,
    y: continuation ? pageHeight - 90 : pageHeight - 52,
  } satisfies PageState;
}

function programItemHeight(
  title: string,
  description: string,
  fonts: Fonts,
) {
  const textWidth = contentWidth - 144;
  const titleLines = wrapText(title, fonts.bold, 12.5, textWidth);
  const descriptionLines = wrapText(description, fonts.regular, 10.2, textWidth);
  return Math.max(
    62,
    18 + titleLines.length * 15 + descriptionLines.length * 13 + 12,
  );
}

function drawProgramItem(
  state: PageState,
  item: SiteContent["program"][number],
  fonts: Fonts,
) {
  const itemHeight = programItemHeight(item.title, item.description, fonts);
  const markerX = pageMargin + 12;
  const timeX = pageMargin + 34;
  const textX = pageMargin + 144;
  const top = state.y;

  state.page.drawLine({
    start: { x: markerX, y: top - 4 },
    end: { x: markerX, y: top - itemHeight + 8 },
    thickness: 1.1,
    color: colors.orange,
  });
  state.page.drawCircle({
    x: markerX,
    y: top - 8,
    size: 5,
    color: colors.background,
    borderColor: colors.orange,
    borderWidth: 1.2,
  });
  state.page.drawCircle({
    x: markerX,
    y: top - 8,
    size: 2,
    color: colors.darkGreen,
  });
  state.page.drawText(item.time, {
    x: timeX,
    y: top - 13,
    font: fonts.bold,
    size: 10.5,
    color: colors.darkGreen,
  });

  const titleBottom = drawWrappedText(state.page, item.title.toLocaleUpperCase("ru-RU"), {
    x: textX,
    y: top - 13,
    font: fonts.bold,
    size: 12.5,
    maxWidth: contentWidth - 144,
    lineHeight: 15,
    color: colors.orange,
  });
  drawWrappedText(state.page, item.description, {
    x: textX,
    y: titleBottom - 3,
    font: fonts.regular,
    size: 10.2,
    maxWidth: contentWidth - 144,
    lineHeight: 13,
    color: colors.darkGreen,
  });
  state.page.drawLine({
    start: { x: timeX, y: top - itemHeight + 5 },
    end: { x: pageWidth - pageMargin, y: top - itemHeight + 5 },
    thickness: 0.7,
    color: colors.line,
  });

  state.y -= itemHeight;
}

function drawCompactProgramItem(
  state: PageState,
  item: SiteContent["program"][number],
  fonts: Fonts,
) {
  const markerX = pageMargin + 12;
  const timeX = pageMargin + 34;
  const textX = pageMargin + 144;
  const textWidth = contentWidth - 144;
  const top = state.y;

  state.page.drawLine({
    start: { x: markerX, y: top - 4 },
    end: { x: markerX, y: top - compactProgramItemHeight + 8 },
    thickness: 1,
    color: colors.orange,
  });
  state.page.drawCircle({
    x: markerX,
    y: top - 8,
    size: 4.5,
    color: colors.background,
    borderColor: colors.orange,
    borderWidth: 1.1,
  });
  state.page.drawCircle({
    x: markerX,
    y: top - 8,
    size: 1.8,
    color: colors.darkGreen,
  });
  state.page.drawText(
    fitSingleLine(item.time, fonts.bold, 9.4, textX - timeX - 14),
    {
      x: timeX,
      y: top - 12,
      font: fonts.bold,
      size: 9.4,
      color: colors.darkGreen,
    },
  );
  state.page.drawText(
    fitSingleLine(
      item.title.toLocaleUpperCase("ru-RU"),
      fonts.bold,
      10.5,
      textWidth,
    ),
    {
      x: textX,
      y: top - 12,
      font: fonts.bold,
      size: 10.5,
      color: colors.orange,
    },
  );
  state.page.drawText(
    fitSingleLine(item.description, fonts.regular, 8.7, textWidth),
    {
      x: textX,
      y: top - 29,
      font: fonts.regular,
      size: 8.7,
      color: colors.darkGreen,
    },
  );
  state.page.drawLine({
    start: { x: timeX, y: top - compactProgramItemHeight + 5 },
    end: { x: pageWidth - pageMargin, y: top - compactProgramItemHeight + 5 },
    thickness: 0.7,
    color: colors.line,
  });

  state.y -= compactProgramItemHeight;
}

export async function generateRegistrationPdf({
  content,
  registration,
}: RegistrationPdfInput): Promise<Buffer> {
  const assetsRoot = join(process.cwd(), "public");
  const [regularBytes, boldBytes, logoBytes] = await Promise.all([
    readFile(join(assetsRoot, "fonts", "NotoSans-Regular.ttf")),
    readFile(join(assetsRoot, "fonts", "NotoSans-Bold.ttf")),
    readFile(join(assetsRoot, "favicon.png")),
  ]);

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle("Регистрация на грибной фестиваль Lay’s");
  document.setSubject("Информация о фестивале и программа");
  document.setCreator("Грибной фестиваль Lay’s");
  document.setProducer("Грибной фестиваль Lay’s");

  const fonts: Fonts = {
    regular: await document.embedFont(regularBytes, { subset: true }),
    bold: await document.embedFont(boldBytes, { subset: true }),
  };
  const logo = await document.embedPng(logoBytes);
  let state = addPage(document, fonts);

  const logoSize = logo.scaleToFit(64, 64);
  state.page.drawImage(logo, {
    x: pageMargin,
    y: state.y - logoSize.height,
    width: logoSize.width,
    height: logoSize.height,
  });
  state.page.drawText("ГРИБНОЙ ФЕСТИВАЛЬ", {
    x: pageMargin + 84,
    y: state.y - 24,
    font: fonts.bold,
    size: 13,
    color: colors.orange,
  });
  state.page.drawText("LAY’S", {
    x: pageMargin + 84,
    y: state.y - 48,
    font: fonts.bold,
    size: 25,
    color: colors.darkGreen,
  });
  state.y -= 94;

  state.y = drawWrappedText(
    state.page,
    content.registrationEmail.heading.toLocaleUpperCase("ru-RU"),
    {
      x: pageMargin,
      y: state.y,
      font: fonts.bold,
      size: 25,
      maxWidth: contentWidth,
      lineHeight: 30,
      color: colors.orange,
      maxLines: 3,
    },
  );
  state.y = drawWrappedText(state.page, content.registrationEmail.intro, {
    x: pageMargin,
    y: state.y - 4,
    font: fonts.regular,
    size: 12,
    maxWidth: contentWidth,
    lineHeight: 17,
    color: colors.darkGreen,
    maxLines: 6,
  });
  state.y -= 16;

  const locationTextWidth = contentWidth - 218;
  const placeLines = limitedWrappedLines(
    content.festival.place.toLocaleUpperCase("ru-RU"),
    fonts.bold,
    12,
    locationTextWidth,
    2,
  );
  const addressLines = limitedWrappedLines(
    content.festival.address,
    fonts.regular,
    10.5,
    locationTextWidth,
    2,
  );
  const locationHeight = placeLines.length * 15 + addressLines.length * 14 + 4;
  const topDetailsHeight = Math.max(58, locationHeight);
  const detailsHeight = topDetailsHeight + 78;
  const dividerY = state.y - topDetailsHeight - 18;
  state.page.drawRectangle({
    x: pageMargin,
    y: state.y - detailsHeight,
    width: contentWidth,
    height: detailsHeight,
    color: colors.cream,
    borderColor: colors.line,
    borderWidth: 0.8,
  });
  state.page.drawText(
    fitSingleLine(
      content.festival.date.toLocaleUpperCase("ru-RU"),
      fonts.bold,
      15,
      164,
    ),
    {
      x: pageMargin + 18,
      y: state.y - 28,
      font: fonts.bold,
      size: 15,
      color: colors.orange,
    },
  );
  state.page.drawText(
    fitSingleLine(content.festival.time, fonts.bold, 14, 164),
    {
      x: pageMargin + 18,
      y: state.y - 52,
      font: fonts.bold,
      size: 14,
      color: colors.darkGreen,
    },
  );
  const placeBottom = drawWrappedText(
    state.page,
    content.festival.place.toLocaleUpperCase("ru-RU"),
    {
      x: pageMargin + 200,
      y: state.y - 28,
      font: fonts.bold,
      size: 12,
      maxWidth: locationTextWidth,
      lineHeight: 15,
      color: colors.darkGreen,
      maxLines: 2,
    },
  );
  drawWrappedText(state.page, content.festival.address, {
    x: pageMargin + 200,
    y: placeBottom - 2,
    font: fonts.regular,
    size: 10.5,
    maxWidth: locationTextWidth,
    lineHeight: 14,
    color: colors.brown,
    maxLines: 2,
  });
  state.page.drawLine({
    start: { x: pageMargin + 18, y: dividerY },
    end: { x: pageWidth - pageMargin - 18, y: dividerY },
    thickness: 0.8,
    color: colors.line,
  });
  state.page.drawText("КОЛИЧЕСТВО ЗАРЕГИСТРИРОВАННЫХ ПОСЕТИТЕЛЕЙ", {
    x: pageMargin + 18,
    y: dividerY - 26,
    font: fonts.bold,
    size: 9.5,
    color: colors.brown,
  });
  state.page.drawText(String(registration.guestsCount), {
    x: pageWidth - pageMargin - 45,
    y: dividerY - 38,
    font: fonts.bold,
    size: 27,
    color: colors.orange,
  });
  state.y -= detailsHeight + 30;

  const closingLines = limitedWrappedLines(
    content.registrationEmail.closing,
    fonts.regular,
    11,
    contentWidth,
    6,
  );
  const closingHeight = 86 + closingLines.length * 15;
  const fullProgramHeights = content.program.map((item) =>
    programItemHeight(item.title, item.description, fonts),
  );
  const compactProgram = !programFitsWithinPageLimit(
    state.y - 34,
    fullProgramHeights,
    closingHeight,
  );
  const programHeading = compactProgram
    ? "ПРОГРАММА ФЕСТИВАЛЯ · КРАТКО"
    : "ПРОГРАММА ФЕСТИВАЛЯ";

  state.page.drawText(programHeading, {
    x: pageMargin,
    y: state.y,
    font: fonts.bold,
    size: 18,
    color: colors.orange,
  });
  state.y -= 34;

  for (const [index, item] of content.program.entries()) {
    const height = compactProgram
      ? compactProgramItemHeight
      : fullProgramHeights[index];
    const reservedClosingHeight =
      document.getPageCount() === maxPdfPages ? closingHeight : 0;
    if (state.y - height < bottomMargin + reservedClosingHeight) {
      if (document.getPageCount() >= maxPdfPages) {
        throw new Error("Registration PDF content exceeds the page limit");
      }
      state = addPage(document, fonts, true);
      state.page.drawText(`${programHeading} · ПРОДОЛЖЕНИЕ`, {
        x: pageMargin,
        y: state.y,
        font: fonts.bold,
        size: 15,
        color: colors.orange,
      });
      state.y -= 32;
    }
    if (compactProgram) drawCompactProgramItem(state, item, fonts);
    else drawProgramItem(state, item, fonts);
  }

  if (state.y - closingHeight < bottomMargin) {
    if (document.getPageCount() >= maxPdfPages) {
      throw new Error("Registration PDF closing block exceeds the page limit");
    }
    state = addPage(document, fonts, true);
  }
  state.page.drawLine({
    start: { x: pageMargin, y: state.y - 4 },
    end: { x: pageWidth - pageMargin, y: state.y - 4 },
    thickness: 1.2,
    color: colors.orange,
  });
  state.page.drawText("ВХОД БЕСПЛАТНЫЙ", {
    x: pageMargin,
    y: state.y - 36,
    font: fonts.bold,
    size: 18,
    color: colors.orange,
  });
  state.page.drawText("Спасибо за регистрацию!", {
    x: pageMargin,
    y: state.y - 64,
    font: fonts.bold,
    size: 13,
    color: colors.darkGreen,
  });
  drawWrappedText(state.page, content.registrationEmail.closing, {
    x: pageMargin,
    y: state.y - 86,
    font: fonts.regular,
    size: 11,
    maxWidth: contentWidth,
    lineHeight: 15,
    color: colors.brown,
    maxLines: 6,
  });

  const pages = document.getPages();
  pages.forEach((page, index) => {
    const pageLabel = `${index + 1} / ${pages.length}`;
    page.drawText(pageLabel, {
      x: pageWidth - pageMargin - fonts.regular.widthOfTextAtSize(pageLabel, 8),
      y: 28,
      font: fonts.regular,
      size: 8,
      color: colors.brown,
    });
  });

  return Buffer.from(await document.save());
}
