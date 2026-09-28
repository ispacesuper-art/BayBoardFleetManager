"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KitSlotMarks } from "@/components/kit-slot-marks";
import { StatusLed } from "@/components/status-led";
import { conflictingBooking } from "@/lib/bookings";
import {
  kitAssetIds,
  kitIncludesAll,
  kitIsComplete,
  kitStatus,
  kitVessel,
  kitsFromAssets,
  looseAssets,
  missingKitSlots,
  sortKitsForBooking,
  type TransportKit,
} from "@/lib/kits";
import {
  displayName,
  KIND_META,
  STATUS_META,
  type Asset,
  type Booking,
} from "@/lib/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export function AddBookingDialog({
  open,
  onOpenChange,
  assets,
  bookings,
  onAdd,
  initialKitId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  bookings: Booking[];
  onAdd: (booking: Booking) => void;
  initialKitId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const kits = useMemo(
    () => sortKitsForBooking(kitsFromAssets(assets)),
    [assets]
  );
  const rack = useMemo(() => looseAssets(assets), [assets]);
  const kitIdSet = useMemo(
    () => new Set(kits.flatMap((kit) => kitAssetIds(kit))),
    [kits]
  );
  const extras = useMemo(
    () => rack.filter((item) => item.kind === "addon" || !kitIdSet.has(item.id)),
    [kitIdSet, rack]
  );

  function resetForm() {
    const next = defaultWindow();
    setTitle("");
    setBookedBy("");
    setStartsAt(next.start);
    setEndsAt(next.end);
    setNotes("");
    setAssetIds([]);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    const next = defaultWindow();
    setTitle("");
    setBookedBy("");
    setStartsAt(next.start);
    setEndsAt(next.end);
    setNotes("");
    setError(null);
    const preset = kits.find((kit) => kit.robot.id === initialKitId);
    setAssetIds(preset ? kitAssetIds(preset) : []);
  }, [open, initialKitId, kits]);

  function toggleAsset(id: string) {
    setAssetIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleKit(kit: TransportKit) {
    const ids = kitAssetIds(kit);
    setAssetIds((current) => {
      if (kitIncludesAll(kit, current)) {
        return current.filter((id) => !ids.includes(id));
      }
      return [...new Set([...current, ...ids])];
    });
  }

  function submit() {
    if (assetIds.length === 0) {
      setError("Pick a transport box, or at least one unit.");
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Enter a valid start and end time.");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setError("End time must be after the start.");
      return;
    }

    const booking: Booking = {
      id: crypto.randomUUID(),
      assetIds,
      title: title.trim() || "Bay booking",
      bookedBy: bookedBy.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const conflict = conflictingBooking(bookings, booking);
    if (conflict) {
      setError("That time overlaps another booking for one of these units.");
      return;
    }

    onAdd(booking);
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>
            Book a transport box to take the dog plus its paired remote,
            battery, and charger. Add-ons can be packed later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="booking-title">Title</Label>
            <Input
              id="booking-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Demo, class, filming…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-who">Booked by</Label>
            <Input
              id="booking-who"
              value={bookedBy}
              onChange={(event) => setBookedBy(event.target.value)}
              placeholder="Name"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="booking-start">Starts</Label>
              <Input
                id="booking-start"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="booking-end">Ends</Label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Transport boxes</Label>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-3">
              {kits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add a robot first, then pair its gear.
                </p>
              ) : (
                kits.map((kit) => {
                  const vessel = kitVessel(kit);
                  const selected = kitIncludesAll(kit, assetIds);
                  const missing = missingKitSlots(kit);
                  const status = kitStatus(kit);
                  const complete = kitIsComplete(kit);
                  return (
                    <label
                      key={kit.robot.id}
                      className="flex items-start gap-2 rounded-lg px-1 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleKit(kit)}
                        className="mt-1 size-3.5 accent-sky-400"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <StatusLed status={status} size="sm" />
                          <span className="truncate text-foreground">
                            Take {vessel.toLowerCase()} · {displayName(kit.robot)}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {complete && status === "ready"
                              ? "Complete"
                              : STATUS_META[status].short}
                          </span>
                        </span>
                        {missing.length > 0 ? (
                          <span className="mt-0.5 block text-[11px] leading-4 text-amber-300/90">
                            Missing {missing.join(", ")}
                          </span>
                        ) : null}
                        <KitSlotMarks kit={kit} />
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {extras.length > 0 ? (
            <div className="grid gap-2">
              <Label>Add-ons and loose gear</Label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 p-3">
                {extras.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={assetIds.includes(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      className="size-3.5 accent-sky-400"
                    />
                    <span className="truncate">
                      {KIND_META[asset.kind].label} · {displayName(asset)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No extra add-ons on the rack yet. When you add them, they will
              show up here to pack with a box.
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="booking-notes">Notes</Label>
            <Textarea
              id="booking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Location, operator, extras…"
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit}>Save booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
