import { NextResponse } from "next/server";
import {
  buildBackup,
  parseBackup,
  writeUploads,
} from "@/lib/backup";
import { readFleet, replaceFleet } from "@/lib/fleet-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await readFleet();
  const backup = await buildBackup(state);
  const body = JSON.stringify(backup, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bay-board-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Backup file is not valid JSON" }, { status: 400 });
  }

  const backup = parseBackup(payload);
  if (!backup) {
    return NextResponse.json(
      { error: "Not a Bay Board backup (needs an assets list)" },
      { status: 400 }
    );
  }

  await writeUploads(backup.uploads);
  const state = await replaceFleet({
    assets: backup.assets,
    repairs: backup.repairs,
    bookings: backup.bookings,
  });

  return NextResponse.json({
    ...state,
    importedUploads: Object.keys(backup.uploads).length,
  });
}
