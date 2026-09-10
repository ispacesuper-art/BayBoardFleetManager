import { NextResponse } from "next/server";
import {
  cancelBooking,
  isAsset,
  isBooking,
  readFleet,
  removeAsset,
  upsertAsset,
  upsertBooking,
} from "@/lib/fleet-store";
import type { Asset, Booking } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await readFleet();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    id?: string;
    asset?: Asset;
    booking?: Booking;
    extras?: { resolution?: string; repairImageUrl?: string };
  };

  if (body.action === "remove" && typeof body.id === "string") {
    return NextResponse.json(await removeAsset(body.id));
  }

  if (body.action === "upsert" && isAsset(body.asset)) {
    return NextResponse.json(await upsertAsset(body.asset, body.extras));
  }

  if (body.action === "upsertBooking" && isBooking(body.booking)) {
    try {
      return NextResponse.json(await upsertBooking(body.booking));
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 400;
      const message =
        error instanceof Error ? error.message : "Could not save booking";
      return NextResponse.json({ error: message }, { status });
    }
  }

  if (body.action === "cancelBooking" && typeof body.id === "string") {
    return NextResponse.json(await cancelBooking(body.id));
  }

  return NextResponse.json({ error: "Invalid fleet update" }, { status: 400 });
}
