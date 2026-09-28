import type { Booking } from "./types";

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function mondayOnOrBefore(date: Date) {
  const day = startOfLocalDay(date);
  const weekday = (day.getDay() + 6) % 7;
  return addDays(day, -weekday);
}

export function monthWeeks(cursor: Date) {
  const origin = mondayOnOrBefore(startOfMonth(cursor));
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(origin, week * 7 + day))
  );
}

export function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function bookingFirstDay(booking: Booking) {
  return startOfLocalDay(new Date(booking.startsAt));
}

export function bookingLastDay(booking: Booking) {
  const end = new Date(booking.endsAt).getTime();
  return startOfLocalDay(new Date(end - 1));
}

export function bookingTouchesDay(booking: Booking, day: Date) {
  const dayStart = startOfLocalDay(day).getTime();
  const next = addDays(startOfLocalDay(day), 1).getTime();
  const start = new Date(booking.startsAt).getTime();
  const end = new Date(booking.endsAt).getTime();
  return start < next && end > dayStart;
}

export interface WeekSpan {
  booking: Booking;
  startCol: number;
  endCol: number;
  lane: number;
}

export function spansForWeek(
  bookings: Booking[],
  week: Date[]
): WeekSpan[] {
  const weekStart = week[0];
  const weekEnd = addDays(week[6], 1);
  const raw = bookings
    .map((booking) => {
      const first = bookingFirstDay(booking);
      const last = bookingLastDay(booking);
      if (last.getTime() < weekStart.getTime()) return null;
      if (first.getTime() >= weekEnd.getTime()) return null;
      const startCol = Math.max(
        0,
        Math.round((first.getTime() - weekStart.getTime()) / 86_400_000)
      );
      const endCol = Math.min(
        6,
        Math.round((last.getTime() - weekStart.getTime()) / 86_400_000)
      );
      return { booking, startCol, endCol, lane: 0 };
    })
    .filter((span): span is WeekSpan => Boolean(span))
    .sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);

  const laneEnds: number[] = [];
  for (const span of raw) {
    let lane = laneEnds.findIndex((end) => end < span.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.endCol);
    } else {
      laneEnds[lane] = span.endCol;
    }
    span.lane = lane;
  }
  return raw;
}

const BAR_COLORS = [
  "bg-sky-400 text-sky-950",
  "bg-violet-400 text-violet-950",
  "bg-emerald-400 text-emerald-950",
  "bg-amber-300 text-amber-950",
  "bg-rose-400 text-rose-950",
  "bg-cyan-400 text-cyan-950",
  "bg-orange-400 text-orange-950",
  "bg-fuchsia-400 text-fuchsia-950",
  "bg-lime-400 text-lime-950",
  "bg-indigo-400 text-indigo-950",
] as const;

export function bookingBarClass(booking: Booking) {
  let hash = 0;
  for (const char of booking.id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return BAR_COLORS[hash % BAR_COLORS.length];
}
