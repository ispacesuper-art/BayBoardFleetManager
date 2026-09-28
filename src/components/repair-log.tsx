"use client";

import { ImagePlus, Wrench } from "lucide-react";
import { AssetAvatar } from "@/components/asset-avatar";
import { StatusLed } from "@/components/status-led";
import { durationLabel } from "@/lib/repairs";
import { formatDate } from "@/lib/storage";
import {
  displayName,
  type Asset,
  type RepairRecord,
} from "@/lib/types";

function issueSummary(repair: RepairRecord) {
  const title = repair.title.trim();
  const detail = repair.detail.trim();
  if (title && detail && detail !== title) return { title, detail };
  if (title) return { title, detail: "" };
  if (detail) return { title: detail, detail: "" };
  return { title: "Repair", detail: "" };
}

export function RepairLog({
  repairs,
  assets,
  onOpenAsset,
}: {
  repairs: RepairRecord[];
  assets: Asset[];
  onOpenAsset: (id: string) => void;
}) {
  const ordered = repairs.slice().sort((a, b) => {
    if (!a.resolvedAt && b.resolvedAt) return -1;
    if (a.resolvedAt && !b.resolvedAt) return 1;
    const aTime = a.resolvedAt ?? a.openedAt;
    const bTime = b.resolvedAt ?? b.openedAt;
    return bTime.localeCompare(aTime);
  });

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Wrench className="mb-3 size-8 text-muted-foreground" />
        <p className="font-heading text-base text-white">No repair history yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Flip a unit to yellow or red to open a ticket. When it goes green
          again, the ticket is marked resolved with a timestamp.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2 pb-10">
      {ordered.map((repair) => {
        const asset = assets.find((item) => item.id === repair.assetId);
        if (!asset) return null;
        const open = !repair.resolvedAt;
        const issue = issueSummary(repair);
        return (
          <li key={repair.id}>
            <button
              type="button"
              onClick={() => onOpenAsset(asset.id)}
              className="flex w-full gap-3 rounded-2xl border border-white/5 bg-card/70 p-3 text-left transition-colors hover:bg-card"
            >
              <AssetAvatar asset={asset} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-heading text-sm text-white">
                    {displayName(asset)}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium">
                    <StatusLed
                      status={open ? repair.openedStatus : "ready"}
                      size="sm"
                    />
                    {open ? "Open" : "Resolved"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Issue
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-foreground/90">
                  {issue.title}
                </p>
                {issue.detail ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {issue.detail}
                  </p>
                ) : null}
                {repair.resolution ? (
                  <>
                    <p className="mt-2 text-[11px] font-medium tracking-wide text-emerald-400/80 uppercase">
                      Fix
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-emerald-300/90">
                      {repair.resolution}
                    </p>
                  </>
                ) : null}
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  Opened {formatDate(repair.openedAt)}
                  {repair.resolvedAt
                    ? ` · Resolved ${formatDate(repair.resolvedAt)} · ${durationLabel(repair.openedAt, repair.resolvedAt)}`
                    : ` · still open · ${durationLabel(repair.openedAt)}`}
                </p>
              </div>
              {repair.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={repair.imageUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="hidden size-14 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:flex">
                  <ImagePlus className="size-4" />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
