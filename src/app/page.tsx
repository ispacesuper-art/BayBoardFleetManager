import Link from "next/link";
import { CalendarClock, Wrench } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-sky-300/80 uppercase">
            Bay Board
          </p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight text-white sm:text-5xl">
            Unitree hangar
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Pick where you need to go. Bookings stay on this PC with the fleet
            log until the university page is wired later.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/book"
            className="rounded-2xl border border-white/10 bg-card/70 p-5 transition-colors hover:bg-card"
          >
            <CalendarClock className="size-6 text-sky-300" />
            <h2 className="mt-4 font-heading text-xl text-white">Book</h2>
          </Link>
          <Link
            href="/shop"
            className="rounded-2xl border border-white/10 bg-card/70 p-5 transition-colors hover:bg-card"
          >
            <Wrench className="size-6 text-amber-300" />
            <h2 className="mt-4 font-heading text-xl text-white">Shop</h2>
          </Link>
        </div>
      </main>
    </div>
  );
}
