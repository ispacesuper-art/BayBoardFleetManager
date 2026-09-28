import {
  bookingTakesFullKit,
  kitAssetIds,
  kitVessel,
  kitsFromAssets,
} from "./kits";
import { displayName, type Asset, type Booking } from "./types";

export type BookingWebhookAction = "created" | "updated" | "cancelled";

export function bookingWebhookPayload(
  action: BookingWebhookAction,
  booking: Booking,
  assets: Asset[]
) {
  const kits = kitsFromAssets(assets);
  const boxes = kits
    .filter(
      (kit) =>
        booking.assetIds.includes(kit.robot.id) ||
        bookingTakesFullKit(booking, kit)
    )
    .map((kit) => ({
      id: kit.robot.id,
      name: displayName(kit.robot),
      callsign: kit.robot.callsign ?? "",
      vessel: kitVessel(kit),
      platform: kit.robot.platform,
      staffKey: (kit.robot.callsign || kit.robot.name).trim(),
    }));
  const packed = new Set(
    kits
      .filter((kit) => boxes.some((box) => box.id === kit.robot.id))
      .flatMap((kit) => kitAssetIds(kit))
  );
  const extras = booking.assetIds
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is Asset => Boolean(asset))
    .filter((asset) => !packed.has(asset.id))
    .map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      name: displayName(asset),
    }));

  return {
    action,
    sentAt: new Date().toISOString(),
    booking: {
      id: booking.id,
      title: booking.title,
      bookedBy: booking.bookedBy,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      notes: booking.notes,
      createdAt: booking.createdAt,
      cancelledAt: booking.cancelledAt ?? null,
    },
    boxes,
    extras,
  };
}

export async function notifyBookingWebhook(
  action: BookingWebhookAction,
  booking: Booking,
  assets: Asset[]
) {
  const url = process.env.BOOKING_WEBHOOK_URL?.trim();
  if (!url) return;

  const secret = process.env.BOOKING_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers["X-Bay-Board-Secret"] = secret;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingWebhookPayload(action, booking, assets)),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error(
        `Booking webhook ${action} failed: HTTP ${response.status}`
      );
    }
  } catch (error) {
    console.error(
      `Booking webhook ${action} failed:`,
      error instanceof Error ? error.message : error
    );
  }
}
