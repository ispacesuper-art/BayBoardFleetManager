import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { mkdir } from "node:fs/promises";
import { UPLOAD_DIR } from "@/lib/fleet-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2_000_000;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${id}.jpg`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
