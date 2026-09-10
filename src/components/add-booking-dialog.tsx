"use client";

import { useMemo, useState } from "react";
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
import { conflictingBooking } from "@/lib/bookings";
import { displayName, KIND_META, type Asset, type Booking } from "@/lib/types";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  bookings: Booking[];
  onAdd: (booking: Booking) => void;
}) {
  const [title, setTitle] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const order: Asset["kind"][] = ["robot", "battery", "charger", "remote"];
    return order
      .map((kind) => ({
        kind,
        items: assets.filter((asset) => asset.kind === kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [assets]);

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

  function toggleAsset(id: string) {
    setAssetIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function submit() {
    if (assetIds.length === 0) {
      setError("Pick at least one robot or accessory.");
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
        if (next) resetForm();
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>
            Holds the selected units for that window. Overlapping reservations
            on the same gear are blocked.
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
            <Label>Units</Label>
            <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-white/10 p-3">
              {grouped.map((group) => (
                <div key={group.kind} className="space-y-1.5">
                  <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    {KIND_META[group.kind].plural}
                  </p>
                  {group.items.map((asset) => (
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
                      <span className="truncate">{displayName(asset)}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
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
