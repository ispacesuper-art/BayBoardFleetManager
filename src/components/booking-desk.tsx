"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Package } from "lucide-react";
import { AddBookingDialog } from "@/components/add-booking-dialog";
import { BookingLog } from "@/components/booking-log";
import { KitSlotMarks } from "@/components/kit-slot-marks";
import { SiteNav } from "@/components/site-nav";
import { StatusLed } from "@/components/status-led";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFleet } from "@/hooks/use-fleet";
import { activeBookingForAsset } from "@/lib/bookings";
import {
  kitStatus,
  kitVessel,
  kitsFromAssets,
  sortKitsForBooking,
} from "@/lib/kits";
import { displayName, STATUS_META, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookingDesk() {
  const {
    assets,
    bookings,
    upsertBooking,
    cancelBooking,
    retry,
    status,
    error,
  } = useFleet();
  const [query, setQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [presetKitId, setPresetKitId] = useState<string | null>(null);

  const kits = useMemo(
    () => sortKitsForBooking(kitsFromAssets(assets)),
    [assets]
  );
  const kitCounts = useMemo(() => {
    const counts: Record<Status, number> = { ready: 0, limited: 0, down: 0 };
    for (const kit of kits) counts[kitStatus(kit)] += 1;
    return counts;
  }, [kits]);

  function openBooking(kitId?: string) {
    setPresetKitId(kitId ?? null);
    setBookingOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/5 bg-black/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <SiteNav />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-sky-300/80 uppercase">
                Front desk
              </p>
              <h1 className="mt-1 font-heading text-3xl tracking-tight text-white sm:text-4xl">
                Book a box
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                See which transport boxes are green, then reserve one. Shop and
                repairs live on the hangar board.
              </p>
            </div>
            <Button onClick={() => openBooking()}>
              <CalendarClock data-icon="inline-start" />
              Add booking
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(["ready", "limited", "down"] as const).map((value) => (
              <div
                key={value}
                className="rounded-2xl border border-white/5 bg-card/60 px-3 py-3 sm:px-4 sm:py-4"
              >
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                  <StatusLed status={value} />
                  {STATUS_META[value].short}
                </span>
                <p className="mt-2 font-heading text-2xl tabular-nums text-white sm:text-3xl">
                  {kitCounts[value]}
                </p>
                <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                  {value === "ready"
                    ? "Boxes ready"
                    : value === "limited"
                      ? "Usable with limits"
                      : "Do not book"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
        {error ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-sm tracking-wide text-muted-foreground uppercase">
              Fleet status
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {kits.length} boxes
            </span>
          </div>
          {status === "loading" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-card/60 ring-1 ring-white/5"
                />
              ))}
            </div>
          ) : kits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
              <Package className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-heading text-base text-white">No boxes yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The hangar board is where robots and paired gear are logged.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {kits.map((kit) => {
                const boxStatus = kitStatus(kit);
                const booked = Boolean(
                  activeBookingForAsset(bookings, kit.robot.id)
                );
                return (
                  <button
                    key={kit.robot.id}
                    type="button"
                    onClick={() => openBooking(kit.robot.id)}
                    className="rounded-2xl border border-white/5 bg-card/70 p-3 text-left transition-colors hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm text-white">
                          {kitVessel(kit)} · {displayName(kit.robot)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {STATUS_META[boxStatus].meaning}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium">
                        <StatusLed status={boxStatus} size="sm" />
                        {STATUS_META[boxStatus].short}
                      </span>
                    </div>
                    <KitSlotMarks kit={kit} />
                    <p
                      className={cn(
                        "mt-2 text-[11px]",
                        booked ? "text-sky-300" : "text-muted-foreground"
                      )}
                    >
                      {booked ? "Out now — tap to book another window" : "Tap to book"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bookings…"
            className="h-9"
          />
          <BookingLog
            bookings={bookings}
            assets={assets}
            query={query}
            onAdd={() => openBooking()}
            onCancel={cancelBooking}
          />
        </section>
      </main>

      <AddBookingDialog
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open) setPresetKitId(null);
        }}
        assets={assets}
        bookings={bookings}
        onAdd={upsertBooking}
        initialKitId={presetKitId}
      />
    </div>
  );
}
