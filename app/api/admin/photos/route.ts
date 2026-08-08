import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { adminMutationSecurityError } from "@/lib/admin-request-security";
import { uploadDirectory } from "@/lib/local-storage-paths";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 6 * 1024 * 1024;
const maxMultipartSize = maxFileSize + 256 * 1024;

function hasExpectedSignature(bytes: Uint8Array, extension: string) {
  if (extension === "jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === "png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

export async function POST(request: Request) {
  const securityError = adminMutationSecurityError(request);
  if (securityError) return securityError;

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxMultipartSize) {
    return NextResponse.json(
      { message: "Размер запроса слишком велик" },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Некорректный формат загрузки" },
      { status: 400 },
    );
  }
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
  if (file.size === 0 || file.size > maxFileSize) {
    return NextResponse.json(
      { message: "Размер изображения не должен превышать 6 МБ" },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedSignature(bytes, extension)) {
    return NextResponse.json(
      { message: "Содержимое файла не соответствует формату изображения" },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(
    join(/*turbopackIgnore: true*/ uploadDirectory, filename),
    bytes,
  );

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
