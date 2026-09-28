"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Download,
  Package,
  Plus,
  Search,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AddBookingDialog } from "@/components/add-booking-dialog";
import { AssetCard } from "@/components/asset-card";
import { AssetEditor } from "@/components/asset-editor";
import { BookingLog } from "@/components/booking-log";
import { BoxBoard } from "@/components/box-board";
import { RepairLog } from "@/components/repair-log";
import { SiteNav } from "@/components/site-nav";
import { StatusLed } from "@/components/status-led";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFleet } from "@/hooks/use-fleet";
import { activeBookingForAsset } from "@/lib/bookings";
import { formatChecked } from "@/lib/storage";
import {
  displayName,
  isAttention,
  KIND_META,
  remotesForRobot,
  STATUS_META,
  type Asset,
  type Status,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterId =
  | "all"
  | "robots"
  | "go2"
  | "g1"
  | "boxes"
  | "battery"
  | "charger"
  | "remote"
  | "addon"
  | "attention"
  | "history"
  | "bookings";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "robots", label: "Robots" },
  { id: "go2", label: "Go2 dogs" },
  { id: "g1", label: "G1 humanoids" },
  { id: "boxes", label: "Boxes" },
  { id: "remote", label: "Remotes" },
  { id: "battery", label: "Batteries" },
  { id: "charger", label: "Chargers" },
  { id: "addon", label: "Add-ons" },
  { id: "attention", label: "Needs repair" },
  { id: "history", label: "Repair log" },
  { id: "bookings", label: "Bookings" },
];

const STATUS_FILTERS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "Any color" },
  { id: "ready", label: "Green" },
  { id: "limited", label: "Yellow" },
  { id: "down", label: "Red" },
];

function matchesFilter(asset: Asset, filter: FilterId) {
  if (
    filter === "all" ||
    filter === "history" ||
    filter === "bookings" ||
    filter === "boxes"
  ) {
    return true;
  }
  if (filter === "robots") return asset.kind === "robot";
  if (filter === "go2") return asset.kind === "robot" && asset.platform === "go2";
  if (filter === "g1") return asset.kind === "robot" && asset.platform === "g1";
  if (filter === "attention") return isAttention(asset);
  return asset.kind === filter;
}

export function FleetBoard() {
  const {
    assets,
    repairs,
    bookings,
    upsert,
    remove,
    upsertBooking,
    cancelBooking,
    replace,
    retry,
    stats,
    robots,
    status,
    error,
    updatedAt,
  } = useFleet();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"log" | "repairs">("log");
  const [addOpen, setAddOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const selected = assets.find((asset) => asset.id === selectedId) ?? null;

  function assignedName(id?: string) {
    if (!id) return undefined;
    const robot = robots.find((item) => item.id === id);
    return robot ? displayName(robot) : undefined;
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const nameFor = (id?: string) => {
      if (!id) return "";
      const robot = robots.find((item) => item.id === id);
      return robot ? displayName(robot) : "";
    };
    return assets.filter((asset) => {
      if (!matchesFilter(asset, filter)) return false;
      if (statusFilter !== "all" && asset.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [
        asset.name,
        asset.callsign,
        asset.model,
        asset.serial,
        asset.condition,
        asset.notes,
        nameFor(asset.assignedToId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [assets, filter, statusFilter, query, robots]);

  const grouped = useMemo(() => {
    const order: Asset["kind"][] = [
      "robot",
      "remote",
      "battery",
      "charger",
      "addon",
    ];
    return order
      .map((kind) => ({
        kind,
        items: visible.filter((asset) => asset.kind === kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [visible]);

  async function confirmImport() {
    if (!pendingImport) return;
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const state = await replace(pendingImport);
      setBackupMessage(
        `Imported ${state.assets.length} assets, ${state.repairs.length} repair records, and ${state.bookings.length} bookings.`
      );
      setImportOpen(false);
      setPendingImport(null);
    } catch (err) {
      setBackupMessage(
        err instanceof Error ? err.message : "Could not import backup"
      );
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/5 bg-black/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <SiteNav />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-sky-300/80 uppercase">
                Hangar ops
              </p>
              <h1 className="mt-1 font-heading text-3xl tracking-tight text-white sm:text-4xl">
                Bay Board
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Saved on this hangar PC — everyone who opens this same address
                sees the same robots, photos, repairs, and bookings. Pros are
                named by colour.
              </p>
              <p
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-sky-300/80"
                suppressHydrationWarning
              >
                <Users className="size-3.5" />
                {updatedAt
                  ? `Last change ${formatChecked(updatedAt)}`
                  : "Live for every operator"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/book" className={buttonVariants()}>
                <CalendarClock data-icon="inline-start" />
                Book
              </Link>
              <a
                href="/api/fleet/backup"
                download
                className={buttonVariants({ variant: "outline" })}
              >
                <Download data-icon="inline-start" />
                Export
              </a>
              <Button
                variant="outline"
                disabled={backupBusy}
                onClick={() => importInputRef.current?.click()}
              >
                <Upload data-icon="inline-start" />
                Import
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                suppressHydrationWarning
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setPendingImport(file);
                  setImportOpen(true);
                }}
              />
              <Button onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                Add asset
              </Button>
            </div>
          </div>

          {backupMessage ? (
            <p className="text-xs text-sky-300/90">{backupMessage}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(
              [
                ["ready", stats.ready],
                ["limited", stats.limited],
                ["down", stats.down],
              ] as const
            ).map(([status, count]) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setFilter("all");
                }}
                className={cn(
                  "rounded-2xl border border-white/5 bg-card/60 px-3 py-3 text-left sm:px-4 sm:py-4",
                  statusFilter === status && "ring-1 ring-white/20"
                )}
              >
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                  <StatusLed status={status} />
                  {STATUS_META[status].short}
                </span>
                <p className="mt-2 font-heading text-2xl tabular-nums text-white sm:text-3xl">
                  {count}
                </p>
                <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                  {STATUS_META[status].label}
                </p>
              </button>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground sm:grid-cols-5 sm:text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider">Go2 dogs</dt>
              <dd className="font-mono text-foreground">{stats.go2} / 9</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider">G1 humanoids</dt>
              <dd className="font-mono text-foreground">{stats.g1} / 2</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider">Batteries</dt>
              <dd className="font-mono text-foreground">{stats.batteries}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider">Chargers</dt>
              <dd className="font-mono text-foreground">{stats.chargers}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider">Remotes</dt>
              <dd className="font-mono text-foreground">{stats.remotes}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        {error && (
          <div className="flex flex-col gap-2 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, serial, notes, assigned robot…"
              className="h-9 pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={filter === item.id ? "default" : "outline"}
                onClick={() => setFilter(item.id)}
              >
                {item.id === "boxes" && <Package data-icon="inline-start" />}
                {item.id === "attention" && <Wrench data-icon="inline-start" />}
                {item.id === "bookings" && (
                  <CalendarClock data-icon="inline-start" />
                )}
                {item.label}
                {item.id === "attention" && stats.attention > 0 ? (
                  <span className="ml-1 font-mono text-[11px]">{stats.attention}</span>
                ) : null}
                {item.id === "history" && repairs.length > 0 ? (
                  <span className="ml-1 font-mono text-[11px]">{repairs.length}</span>
                ) : null}
                {item.id === "bookings" && stats.openBookings > 0 ? (
                  <span className="ml-1 font-mono text-[11px]">
                    {stats.openBookings}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.id}
                size="xs"
                variant={statusFilter === item.id ? "secondary" : "ghost"}
                onClick={() => setStatusFilter(item.id)}
              >
                {item.id !== "all" && <StatusLed status={item.id} size="sm" />}
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {status === "loading" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl bg-card/60 ring-1 ring-white/5"
              />
            ))}
          </div>
        ) : status === "error" && assets.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <Users className="mb-3 size-8 text-muted-foreground" />
            <p className="font-heading text-base text-white">Shared bay is offline</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              The log lives on this server so every operator sees the same
              information. Retry when the app is reachable.
            </p>
            <Button className="mt-4" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : filter === "history" ? (
          <RepairLog
            repairs={repairs.filter((repair) => {
              const needle = query.trim().toLowerCase();
              if (!needle) return true;
              const asset = assets.find((item) => item.id === repair.assetId);
              const haystack = [
                asset?.name,
                asset?.callsign,
                repair.title,
                repair.detail,
                repair.resolution,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(needle);
            })}
            assets={assets}
            onOpenAsset={(id) => {
              setEditorTab("repairs");
              setSelectedId(id);
            }}
          />
        ) : filter === "bookings" ? (
          <BookingLog
            bookings={bookings}
            assets={assets}
            query={query}
            onAdd={() => setBookingOpen(true)}
            onCancel={cancelBooking}
            onOpenAsset={(id) => {
              setEditorTab("log");
              setSelectedId(id);
            }}
          />
        ) : filter === "boxes" ? (
          <BoxBoard
            assets={assets}
            query={query}
            statusFilter={statusFilter}
            onBook={() => setBookingOpen(true)}
            onOpenAsset={(id) => {
              setEditorTab("log");
              setSelectedId(id);
            }}
          />
        ) : visible.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <Wrench className="mb-3 size-8 text-muted-foreground" />
            <p className="font-heading text-base text-white">
              {filter === "attention"
                ? "Shop is empty"
                : "Nothing matches"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {filter === "attention"
                ? "Every logged asset is green. Flip a unit to yellow or red when it needs conditions or repair."
                : "Try another filter, or add the missing robot or accessory."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-10">
            {grouped.map((group) => (
              <section key={group.kind} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-sm tracking-wide text-muted-foreground uppercase">
                    {KIND_META[group.kind].plural}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      assignedName={assignedName(asset.assignedToId)}
                      pairedRemotes={
                        asset.kind === "robot"
                          ? remotesForRobot(assets, asset.id).map((item) => item.name)
                          : undefined
                      }
                      bookedNow={Boolean(activeBookingForAsset(bookings, asset.id))}
                      onOpen={() => {
                        setEditorTab("log");
                        setSelectedId(asset.id);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <AssetEditor
          key={`${selected.id}-${editorTab}`}
          asset={selected}
          assets={assets}
          robots={robots}
          repairs={repairs}
          open={selectedId !== null}
          defaultTab={editorTab}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          onSave={upsert}
          onDelete={remove}
          onOpenAsset={(id) => {
            setEditorTab("log");
            setSelectedId(id);
          }}
        />
      )}
      <AddAssetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        assets={assets}
        onAdd={upsert}
      />
      <AddBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        assets={assets}
        bookings={bookings}
        onAdd={upsertBooking}
      />
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setPendingImport(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import backup?</DialogTitle>
            <DialogDescription>
              This replaces the current bay — including photos, repairs, and
              bookings — with{" "}
              <span className="font-mono text-foreground">
                {pendingImport?.name ?? "the selected file"}
              </span>
              . Export a copy first if you might need the current log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={backupBusy}
              onClick={() => {
                setImportOpen(false);
                setPendingImport(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={backupBusy || !pendingImport}
              onClick={() => void confirmImport()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
