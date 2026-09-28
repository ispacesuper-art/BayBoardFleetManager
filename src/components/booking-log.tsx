"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Package } from "lucide-react";
import { BookingCalendar } from "@/components/booking-calendar";
import { Button } from "@/components/ui/button";
import { KitSlotMarks } from "@/components/kit-slot-marks";
import { StatusLed } from "@/components/status-led";
import { isActiveBooking, isCancelled } from "@/lib/bookings";
import { startOfMonth } from "@/lib/calendar";
import {
  bookingTakesFullKit,
  kitAssetIds,
  kitIsComplete,
  kitStatus,
  kitsFromAssets,
  kitVessel,
} from "@/lib/kits";
import { portraitEmoji } from "@/lib/portrait";
import { formatChecked } from "@/lib/storage";
import { displayName, STATUS_META, type Asset, type Booking } from "@/lib/types";

function isAutoKitNote(notes: string) {
  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.length > 0 &&
    lines.every((line) => /^Takes (box|case)\b/i.test(line))
  );
}

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
  onOpenAsset?: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const kits = kitsFromAssets(assets);
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

  useEffect(() => {
    if (selectedId && !ordered.some((booking) => booking.id === selectedId)) {
      setSelectedId(null);
    }
  }, [ordered, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`booking-${selectedId}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex justify-end">
        <Button size="sm" onClick={onAdd}>
          Add booking
        </Button>
      </div>
      <BookingCalendar
        cursor={month}
        onCursorChange={setMonth}
        bookings={ordered}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <CalendarClock className="mb-3 size-8 text-muted-foreground" />
          <p className="font-heading text-base text-white">
            {needle ? "No bookings match" : "No bookings yet"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {needle
              ? "Try a title, operator, or robot name."
              : "Add a reservation and it will show here as a coloured bar across the days that kit is out."}
          </p>
        </div>
      ) : null}
      <ol className="flex flex-col gap-2">
        {ordered.map((booking) => {
          const cancelled = isCancelled(booking);
          const live = isActiveBooking(booking);
          const held = booking.assetIds
            .map((id) => assets.find((item) => item.id === id))
            .filter((item): item is Asset => Boolean(item));
          const takenKits = kits.filter((kit) =>
            bookingTakesFullKit(booking, kit)
          );
          const packedIds = new Set(takenKits.flatMap((kit) => kitAssetIds(kit)));
          const extras = held.filter((asset) => !packedIds.has(asset.id));
          const notes =
            booking.notes && !isAutoKitNote(booking.notes)
              ? booking.notes
              : "";
          return (
            <li
              id={`booking-${booking.id}`}
              key={booking.id}
              className={`rounded-2xl border bg-card/70 p-3 ${
                selectedId === booking.id
                  ? "border-sky-300/50"
                  : "border-white/5"
              }`}
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
              {takenKits.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2">
                  {takenKits.map((kit) => {
                    const status = kitStatus(kit);
                    const vessel = kitVessel(kit);
                    const label =
                      kitIsComplete(kit) && status === "ready"
                        ? `Complete ${vessel.toLowerCase()}`
                        : vessel;
                    return (
                      <div key={kit.robot.id}>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2 py-1 text-[11px] text-sky-200">
                          <StatusLed status={status} size="sm" />
                          <Package className="size-3" />
                          {label} · {displayName(kit.robot)}
                        </span>
                        <KitSlotMarks kit={kit} onOpen={onOpenAsset} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {extras.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {extras.map((asset) => {
                    const title = `${displayName(asset)} · ${STATUS_META[asset.status].short}`;
                    const className =
                      "inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-background/50 px-1 py-0.5 text-[13px] leading-none";
                    if (onOpenAsset) {
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          title={title}
                          onClick={() => onOpenAsset(asset.id)}
                          className={`${className} hover:bg-card`}
                        >
                          <span aria-hidden>{portraitEmoji(asset)}</span>
                          <StatusLed status={asset.status} size="sm" />
                        </button>
                      );
                    }
                    return (
                      <span key={asset.id} title={title} className={className}>
                        <span aria-hidden>{portraitEmoji(asset)}</span>
                        <StatusLed status={asset.status} size="sm" />
                      </span>
                    );
                  })}
                </div>
              ) : null}
              {notes ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {notes}
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
