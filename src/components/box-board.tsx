"use client";

import { Package } from "lucide-react";
import { AssetAvatar } from "@/components/asset-avatar";
import { Button } from "@/components/ui/button";
import { StatusLed } from "@/components/status-led";
import {
  kitContentsLabel,
  kitSearchText,
  kitStatus,
  kitVessel,
  kitsFromAssets,
  looseAssets,
  missingKitSlots,
  type TransportKit,
} from "@/lib/kits";
import { displayName, KIND_META, type Asset, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

function SlotRow({
  label,
  asset,
  empty,
  onOpen,
}: {
  label: string;
  asset?: Asset;
  empty?: string;
  onOpen: (id: string) => void;
}) {
  if (!asset) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-[11px] text-amber-300/90">{empty ?? "Missing"}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(asset.id)}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-background/40 px-3 py-2 text-left hover:bg-card"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm text-white">{displayName(asset)}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px]">
        <StatusLed status={asset.status} size="sm" />
        {asset.status === "ready" ? "Green" : asset.status === "limited" ? "Yellow" : "Red"}
      </span>
    </button>
  );
}

function BoxCard({
  kit,
  onOpenAsset,
}: {
  kit: TransportKit;
  onOpenAsset: (id: string) => void;
}) {
  const vessel = kitVessel(kit);
  const status = kitStatus(kit);
  const missing = missingKitSlots(kit);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-card/70 p-3">
      <div className="flex items-start gap-3">
        <AssetAvatar asset={kit.robot} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm text-white">
            {vessel} · {displayName(kit.robot)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kit.robot.platform === "g1"
              ? "Travel case for the humanoid and its paired gear."
              : "Transport box holds the dog, remote, battery, and charger."}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium">
          <StatusLed status={status} size="sm" />
          {status === "ready" ? "Ready" : status === "limited" ? "Limits" : "Shop"}
        </span>
      </div>

      <div className="grid gap-1.5">
        <SlotRow
          label="Robot"
          asset={kit.robot}
          onOpen={onOpenAsset}
        />
        <SlotRow
          label="Remote"
          asset={kit.remote}
          empty="Not paired"
          onOpen={onOpenAsset}
        />
        {kit.batteries.length > 0 ? (
          kit.batteries.map((battery) => (
            <SlotRow
              key={battery.id}
              label="Battery"
              asset={battery}
              onOpen={onOpenAsset}
            />
          ))
        ) : (
          <SlotRow label="Battery" empty="Not assigned" onOpen={onOpenAsset} />
        )}
        {kit.chargers.length > 0 ? (
          kit.chargers.map((charger) => (
            <SlotRow
              key={charger.id}
              label="Charger"
              asset={charger}
              onOpen={onOpenAsset}
            />
          ))
        ) : (
          <SlotRow label="Charger" empty="Not assigned" onOpen={onOpenAsset} />
        )}
        {kit.addons.map((addon) => (
          <SlotRow
            key={addon.id}
            label="Add-on"
            asset={addon}
            onOpen={onOpenAsset}
          />
        ))}
      </div>

      {missing.length > 0 ? (
        <p className="text-[11px] text-amber-300/90">
          Missing {missing.join(", ")}. Pair them on the robot or accessory
          cards so they travel in this {vessel.toLowerCase()}.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Full {vessel.toLowerCase()}: {kitContentsLabel(kit)}
        </p>
      )}
    </article>
  );
}

export function BoxBoard({
  assets,
  query,
  statusFilter,
  onOpenAsset,
  onBook,
}: {
  assets: Asset[];
  query: string;
  statusFilter: "all" | Status;
  onOpenAsset: (id: string) => void;
  onBook?: () => void;
}) {
  const needle = query.trim().toLowerCase();
  const kits = kitsFromAssets(assets).filter((kit) => {
    if (statusFilter !== "all" && kitStatus(kit) !== statusFilter) return false;
    if (!needle) return true;
    return kitSearchText(kit).includes(needle);
  });
  const rack = looseAssets(assets).filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (!needle) return true;
    return [item.name, item.serial, item.model]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  if (assets.filter((item) => item.kind === "robot").length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Package className="mb-3 size-8 text-muted-foreground" />
        <p className="font-heading text-base text-white">No boxes yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add a Go2 dog, then pair its remote, battery, and charger. That set
          is the transport box. Add-ons can go in later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm tracking-wide text-muted-foreground uppercase">
            Transport boxes
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {kits.length}
            </span>
            {onBook ? (
              <Button size="sm" onClick={onBook}>
                Book a box
              </Button>
            ) : null}
          </div>
        </div>
        {kits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing matches that search or colour filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {kits.map((kit) => (
              <BoxCard
                key={kit.robot.id}
                kit={kit}
                onOpenAsset={onOpenAsset}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-sm tracking-wide text-muted-foreground uppercase">
            On the rack
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {rack.length}
          </span>
        </div>
        {rack.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every remote, battery, charger, and add-on is assigned to a box.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rack.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onOpenAsset(asset.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-card/60 px-3 py-2 text-left hover:bg-card"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {KIND_META[asset.kind].label} · {displayName(asset)}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {asset.serial}
                  </p>
                </div>
                <StatusLed status={asset.status} size="sm" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
