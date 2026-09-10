import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const glow: Record<Status, string> = {
  ready: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]",
  limited: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]",
  down: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.85)]",
};

export function StatusLed({
  status,
  size = "md",
  className,
}: {
  status: Status;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-full",
        glow[status],
        size === "sm" && "size-2",
        size === "md" && "size-2.5",
        size === "lg" && "size-3.5",
        className
      )}
    />
  );
}
