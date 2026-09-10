"use client";

import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isActiveBooking, isCancelled } from "@/lib/bookings";
import { formatChecked } from "@/lib/storage";
import { displayName, KIND_META, type Asset, type Booking } from "@/lib/types";

export function BookingLog({
  bookings,
  assets,
  query,
  onAdd,
  onCancel,
  onOpenAsset,
}: {
  bookings: Booking[];
  assets: Asset[];
  query: string;
  onAdd: () => void;
  onCancel: (id: string) => void;
  onOpenAsset: (id: string) => void;
}) {
  const needle = query.trim().toLowerCase();
  const named = (ids: string[]) =>
    ids
      .map((id) => {
        const asset = assets.find((item) => item.id === id);
        return asset ? displayName(asset) : id;
      })
      .join(" · ");

  const ordered = bookings
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .filter((booking) => {
      if (!needle) return true;
      const haystack = [
        booking.title,
        booking.bookedBy,
        booking.notes,
        named(booking.assetIds),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <CalendarClock className="mb-3 size-8 text-muted-foreground" />
        <p className="font-heading text-base text-white">No bookings yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Reservations are saved on this PC with the fleet log, so they come
          back when you reopen the board.
        </p>
        <Button className="mt-4" onClick={onAdd}>
          Add booking
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-10">
      <div className="flex justify-end">
        <Button size="sm" onClick={onAdd}>
          Add booking
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {ordered.map((booking) => {
          const cancelled = isCancelled(booking);
          const live = isActiveBooking(booking);
          const held = booking.assetIds
            .map((id) => assets.find((item) => item.id === id))
            .filter((item): item is Asset => Boolean(item));
          return (
            <li
              key={booking.id}
              className="rounded-2xl border border-white/5 bg-card/70 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm text-white">
                    {booking.title || "Bay booking"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {booking.bookedBy || "Unnamed operator"}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-sky-300/90">
                  {cancelled ? "Cancelled" : live ? "In use now" : "Scheduled"}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {formatChecked(booking.startsAt)} – {formatChecked(booking.endsAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {held.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onOpenAsset(asset.id)}
                    className="rounded-full bg-secondary px-2 py-1 text-[11px] text-foreground hover:bg-secondary/80"
                  >
                    {KIND_META[asset.kind].label} · {displayName(asset)}
                  </button>
                ))}
              </div>
              {booking.notes ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {booking.notes}
                </p>
              ) : null}
              {!cancelled ? (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onCancel(booking.id)}
                  >
                    Cancel booking
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
