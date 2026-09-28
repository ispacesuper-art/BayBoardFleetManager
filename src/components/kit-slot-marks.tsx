"use client";

import { StatusLed } from "@/components/status-led";
import { kitSlotMarks, type TransportKit } from "@/lib/kits";
import { STATUS_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KitSlotMarks({
  kit,
  onOpen,
}: {
  kit: TransportKit;
  onOpen?: (id: string) => void;
}) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {kitSlotMarks(kit).map((mark) => {
        const title = mark.empty
          ? mark.label
          : `${mark.label} · ${STATUS_META[mark.status ?? "ready"].short}`;
        const className = cn(
          "inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[13px] leading-none",
          mark.empty
            ? "border-dashed border-white/15 opacity-35"
            : "border-white/10 bg-background/50",
          onOpen && !mark.empty && "hover:bg-card"
        );
        if (onOpen && !mark.empty) {
          return (
            <button
              key={mark.key}
              type="button"
              title={title}
              onClick={() => onOpen(mark.key)}
              className={className}
            >
              <span aria-hidden>{mark.emoji}</span>
              {mark.status ? <StatusLed status={mark.status} size="sm" /> : null}
            </button>
          );
        }
        return (
          <span key={mark.key} title={title} className={className}>
            <span aria-hidden>{mark.emoji}</span>
            {mark.status ? <StatusLed status={mark.status} size="sm" /> : null}
          </span>
        );
      })}
    </span>
  );
}
