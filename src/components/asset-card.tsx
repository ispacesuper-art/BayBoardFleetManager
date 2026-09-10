"use client";

import { CalendarClock, Wrench } from "lucide-react";
import { AssetAvatar } from "@/components/asset-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusLed } from "@/components/status-led";
import { cn } from "@/lib/utils";
import { formatChecked } from "@/lib/storage";
import { displayName, STATUS_META, type Asset } from "@/lib/types";

const border: Record<Asset["status"], string> = {
  ready: "border-l-emerald-400",
  limited: "border-l-amber-400",
  down: "border-l-red-400",
};

export function AssetCard({
  asset,
  assignedName,
  pairedRemotes,
  bookedNow,
  onOpen,
}: {
  asset: Asset;
  assignedName?: string;
  pairedRemotes?: string[];
  bookedNow?: boolean;
  onOpen: () => void;
}) {
  const meta = STATUS_META[asset.status];
  const needsShop = asset.status !== "ready";

  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card
        size="sm"
        className={cn(
          "h-full border-l-[3px] bg-card/80 transition-colors hover:bg-card",
          border[asset.status]
        )}
      >
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <AssetAvatar asset={asset} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-medium">
                  {displayName(asset)}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {asset.model}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium">
              <StatusLed status={asset.status} size="sm" />
              {meta.short}
            </span>
          </div>

          <p className="line-clamp-2 min-h-8 text-xs leading-5 text-muted-foreground">
            {asset.condition || asset.notes || meta.meaning}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate font-mono">{asset.serial}</span>
            {needsShop ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Wrench className="size-3" />
                Shop
              </span>
            ) : bookedNow ? (
              <span className="inline-flex items-center gap-1 text-sky-300">
                <CalendarClock className="size-3" />
                Booked
              </span>
            ) : assignedName ? (
              <span className="truncate">→ {assignedName}</span>
            ) : pairedRemotes && pairedRemotes.length > 0 ? (
              <span className="truncate">↔ {pairedRemotes.join(" · ")}</span>
            ) : (
              <span>Checked {formatChecked(asset.lastChecked)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
