import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { uploadDirectory } from "@/lib/local-storage-paths";

const contentTypes = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const match = /^([a-f0-9-]+)\.(jpg|png|webp)$/.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(join(uploadDirectory, filename));
    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[match[2] as keyof typeof contentTypes],
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
