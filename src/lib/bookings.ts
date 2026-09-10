import type { Booking } from "./types";

export function isIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export function isBooking(value: unknown): value is Booking {
  if (!value || typeof value !== "object") return false;
  const booking = value as Booking;
  if (typeof booking.id !== "string" || booking.id.trim() === "") return false;
  if (!Array.isArray(booking.assetIds) || booking.assetIds.length === 0) {
    return false;
  }
  if (!booking.assetIds.every((id) => typeof id === "string" && id.length > 0)) {
    return false;
  }
  if (typeof booking.title !== "string") return false;
  if (typeof booking.bookedBy !== "string") return false;
  if (typeof booking.notes !== "string") return false;
  if (typeof booking.createdAt !== "string" || !isIsoDate(booking.createdAt)) {
    return false;
  }
  if (typeof booking.startsAt !== "string" || !isIsoDate(booking.startsAt)) {
    return false;
  }
  if (typeof booking.endsAt !== "string" || !isIsoDate(booking.endsAt)) {
    return false;
  }
  if (new Date(booking.endsAt).getTime() <= new Date(booking.startsAt).getTime()) {
    return false;
  }
  if (booking.cancelledAt !== undefined) {
    if (typeof booking.cancelledAt !== "string" || !isIsoDate(booking.cancelledAt)) {
      return false;
    }
  }
  return true;
}

export function normalizeBookings(value: unknown): Booking[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isBooking);
}

export function isCancelled(booking: Booking) {
  return Boolean(booking.cancelledAt);
}

export function isActiveBooking(booking: Booking, at = new Date()) {
  if (isCancelled(booking)) return false;
  const start = new Date(booking.startsAt).getTime();
  const end = new Date(booking.endsAt).getTime();
  const time = at.getTime();
  return start <= time && time < end;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime()
  );
}

export function bookingTouchesAsset(booking: Booking, assetId: string) {
  return booking.assetIds.includes(assetId);
}

export function dropBookingsForAsset(
  bookings: Booking[],
  assetId: string
): Booking[] {
  return bookings
    .map((booking) => ({
      ...booking,
      assetIds: booking.assetIds.filter((id) => id !== assetId),
    }))
    .filter((booking) => booking.assetIds.length > 0);
}

export function conflictingBooking(
  bookings: Booking[],
  candidate: Booking
): Booking | undefined {
  if (isCancelled(candidate)) return undefined;
  const held = new Set(candidate.assetIds);
  return bookings.find((booking) => {
    if (booking.id === candidate.id) return false;
    if (isCancelled(booking)) return false;
    if (!booking.assetIds.some((id) => held.has(id))) return false;
    return rangesOverlap(
      candidate.startsAt,
      candidate.endsAt,
      booking.startsAt,
      booking.endsAt
    );
  });
}

export function activeBookingForAsset(
  bookings: Booking[],
  assetId: string,
  at = new Date()
) {
  return bookings.find(
    (booking) =>
      bookingTouchesAsset(booking, assetId) && isActiveBooking(booking, at)
  );
}
