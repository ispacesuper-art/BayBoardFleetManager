"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCancelled } from "@/lib/bookings";
import {
  bookingBarClass,
  bookingFirstDay,
  bookingLastDay,
  monthWeeks,
  sameLocalDay,
  spansForWeek,
  startOfMonth,
} from "@/lib/calendar";
import type { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function BookingCalendar({
  cursor,
  onCursorChange,
  bookings,
  selectedId,
  onSelect,
}: {
  cursor: Date;
  onCursorChange: (next: Date) => void;
  bookings: Booking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const today = new Date();
  const month = cursor.getMonth();
  const weeks = monthWeeks(cursor).filter((week) =>
    week.some((day) => day.getMonth() === month)
  );
  const monthLabel = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  return (
    <section className="rounded-2xl border border-white/5 bg-card/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="outline"
            onClick={() =>
              onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onCursorChange(startOfMonth(today))}
          >
            Today
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            onClick={() =>
              onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week) => {
          const spans = clipToMonth(spansForWeek(bookings, week), week, month);
          const lanes = spans.reduce((max, span) => Math.max(max, span.lane + 1), 0);
          return (
            <div key={week[0].toISOString()}>
              <div className="grid grid-cols-7 gap-px">
                {week.map((day) => {
                  const inMonth = day.getMonth() === month;
                  const isToday = sameLocalDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-7 rounded-sm px-1 py-0.5 text-right font-mono text-[11px]",
                        inMonth ? "text-foreground" : "text-muted-foreground/40",
                        isToday && "rounded-md bg-sky-400/15 text-sky-200"
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
              <div
                className="relative mt-0.5 grid grid-cols-7 gap-px"
                style={{ minHeight: Math.max(lanes, 0) * 22 }}
              >
                {spans.map((span) => {
                  const days =
                    Math.round(
                      (bookingLastDay(span.booking).getTime() -
                        bookingFirstDay(span.booking).getTime()) /
                        86_400_000
                    ) + 1;
                  const single = days <= 1;
                  const selected = selectedId === span.booking.id;
                  const cancelled = isCancelled(span.booking);
                  return (
                    <button
                      key={`${span.booking.id}-${span.startCol}-${span.lane}`}
                      type="button"
                      title={`${span.booking.title || "Bay booking"} · ${span.booking.bookedBy || "Unnamed"}${cancelled ? " · Cancelled" : ""}`}
                      onClick={() => onSelect(span.booking.id)}
                      className={cn(
                        "mx-0.5 truncate px-1.5 text-left text-[11px] font-medium leading-5",
                        single ? "rounded-full text-center" : "rounded-md",
                        bookingBarClass(span.booking),
                        cancelled && "opacity-40 line-through",
                        selected && "ring-2 ring-white"
                      )}
                      style={{
                        gridColumn: `${span.startCol + 1} / ${span.endCol + 2}`,
                        gridRow: span.lane + 1,
                      }}
                    >
                      {single ? "•" : span.booking.title || "Booking"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A bar covers every day the kit is out. A dot is a same-day booking.
        Click a mark to open that reservation below.
      </p>
    </section>
  );
}

function clipToMonth(
  spans: ReturnType<typeof spansForWeek>,
  week: Date[],
  month: number
) {
  return spans.flatMap((span) => {
    let startCol = span.startCol;
    let endCol = span.endCol;
    while (startCol <= endCol && week[startCol].getMonth() !== month) {
      startCol += 1;
    }
    while (endCol >= startCol && week[endCol].getMonth() !== month) {
      endCol -= 1;
    }
    if (startCol > endCol) return [];
    return [{ ...span, startCol, endCol }];
  });
}
