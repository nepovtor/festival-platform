import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { NextResponse } from "next/server";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 6 * 1024 * 1024;

function uploadDirectory() {
  const dataFile =
    process.env.FESTIVAL_DATA_FILE ?? join(process.cwd(), "data", "registrations.json");
  return join(dirname(dataFile), "uploads");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Выберите изображение" }, { status: 400 });
  }

  const extension = acceptedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { message: "Поддерживаются только JPG, PNG и WebP" },
      { status: 400 },
    );
  }
  if (file.size > maxFileSize) {
    return NextResponse.json(
      { message: "Размер изображения не должен превышать 6 МБ" },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(
    join(uploadDirectory(), filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
