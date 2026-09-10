"use client";

import { useMemo, useState } from "react";
import { Check, ImagePlus, Link2, Trash2 } from "lucide-react";
import { PortraitField } from "@/components/portrait-field";
import { StatusLed } from "@/components/status-led";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { durationLabel, repairsFor } from "@/lib/repairs";
import { formatChecked, formatDate, uploadImage } from "@/lib/storage";
import {
  displayName,
  remoteForRobot,
  robotById,
  STATUS_META,
  type Asset,
  type RepairRecord,
  type Status,
} from "@/lib/types";

const STATUSES: Status[] = ["ready", "limited", "down"];

function SaveFieldButton({
  label,
  saved,
  disabled,
  onClick,
}: {
  label: string;
  saved: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-fit"
      disabled={disabled && !saved}
      onClick={onClick}
    >
      {saved ? <Check data-icon="inline-start" /> : null}
      {saved ? "Saved" : label}
    </Button>
  );
}

export function AssetEditor({
  asset,
  assets,
  robots,
  repairs,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onOpenAsset,
  defaultTab = "log",
}: {
  asset: Asset;
  assets: Asset[];
  robots: Asset[];
  repairs: RepairRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    asset: Asset,
    extras?: { resolution?: string; repairImageUrl?: string }
  ) => void;
  onDelete: (id: string) => void;
  onOpenAsset: (id: string) => void;
  defaultTab?: "log" | "repairs";
}) {
  const [draft, setDraft] = useState<Asset>(asset);
  const [resolution, setResolution] = useState("");
  const [repairImageUrl, setRepairImageUrl] = useState<string | undefined>();
  const [savedField, setSavedField] = useState<string | null>(null);
  const [remoteToLink, setRemoteToLink] = useState("none");
  const [robotToLink, setRobotToLink] = useState(asset.assignedToId ?? "none");

  const assignedOptions = useMemo(
    () => robots.filter((robot) => robot.platform === draft.platform),
    [robots, draft.platform]
  );

  const history = useMemo(
    () => repairsFor(repairs, asset.id),
    [repairs, asset.id]
  );

  const linkedRemote = useMemo(
    () => remoteForRobot(assets, asset.id),
    [assets, asset.id]
  );

  const linkableRemotes = useMemo(
    () =>
      assets.filter(
        (item) =>
          item.kind === "remote" &&
          item.platform === asset.platform &&
          item.id !== linkedRemote?.id
      ),
    [assets, asset.platform, linkedRemote?.id]
  );

  const pairedRobot = useMemo(
    () => robotById(assets, asset.assignedToId),
    [assets, asset.assignedToId]
  );

  const closingShop = asset.status !== "ready" && draft.status === "ready";

  const conditionHint =
    draft.status === "down"
      ? "What's broken, and should anyone use it?"
      : draft.status === "limited"
        ? "What are the conditions for using it?"
        : "Optional notes for the next person on shift.";

  const nameDirty =
    draft.name !== asset.name || (draft.callsign ?? "") !== (asset.callsign ?? "");
  const serialDirty = draft.serial !== asset.serial;
  const portraitDirty =
    draft.portrait !== asset.portrait ||
    draft.emoji !== asset.emoji ||
    draft.imageUrl !== asset.imageUrl ||
    draft.imageFit !== asset.imageFit ||
    draft.imageScale !== asset.imageScale;

  function flash(field: string) {
    setSavedField(field);
    window.setTimeout(() => {
      setSavedField((current) => (current === field ? null : current));
    }, 1600);
  }

  function persistPatch(patch: Partial<Asset>) {
    onSave({ ...asset, ...patch });
  }

  function saveName() {
    persistPatch({
      name: draft.name.trim() || asset.name,
      callsign: draft.callsign?.trim() || undefined,
    });
    flash("name");
  }

  function saveSerial() {
      persistPatch({ serial: draft.serial.trim() || asset.serial });
    flash("serial");
  }

  function savePortrait() {
    persistPatch({
      portrait: draft.portrait,
      emoji: draft.emoji,
      imageUrl: draft.imageUrl,
      imageFit: draft.imageFit,
      imageScale: draft.imageScale,
    });
    flash("portrait");
  }

  function pairRemote(remote: Asset, robotId: string | undefined) {
    onSave({
      ...remote,
      assignedToId: robotId,
    });
  }

  function saveLog() {
    const next: Asset = {
      ...asset,
      status: draft.status,
      condition: draft.condition,
      notes: draft.notes,
      lastChecked: new Date().toISOString(),
    };
    if (draft.kind === "battery") {
      next.cycles = draft.cycles;
    }
    if (draft.kind === "battery" || draft.kind === "charger") {
      next.assignedToId = draft.assignedToId;
    }
    onSave(next, {
      resolution: closingShop ? resolution : undefined,
      repairImageUrl,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <StatusLed status={draft.status} />
            {displayName(asset)}
          </SheetTitle>
          <SheetDescription>
            {asset.model} · {asset.serial} · last checked{" "}
            {formatChecked(asset.lastChecked)}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="repairs">
              Repairs
              {history.length > 0 ? (
                <span className="font-mono text-[11px]">{history.length}</span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="log"
            className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
          >
            <section className="grid gap-3 rounded-xl border border-white/10 bg-secondary/20 p-3">
              {asset.kind === "robot" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="callsign">Name</Label>
                    <Input
                      id="callsign"
                      value={draft.callsign ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          callsign: event.target.value || undefined,
                        })
                      }
                      placeholder="Red, Blue, Halo…"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tag">Bay tag</Label>
                    <Input
                      id="tag"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="asset-name">Name</Label>
                  <Input
                    id="asset-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                </div>
              )}
              <SaveFieldButton
                label="Save name"
                saved={savedField === "name"}
                disabled={!nameDirty}
                onClick={saveName}
              />
            </section>

            <section className="grid gap-3 rounded-xl border border-white/10 bg-secondary/20 p-3">
              <div className="grid gap-2">
                <Label htmlFor="serial">Serial</Label>
                <Input
                  id="serial"
                  value={draft.serial}
                  onChange={(event) =>
                    setDraft({ ...draft, serial: event.target.value })
                  }
                  placeholder="Unit serial or bay code"
                  className="font-mono"
                />
              </div>
              <SaveFieldButton
                label="Save serial"
                saved={savedField === "serial"}
                disabled={!serialDirty}
                onClick={saveSerial}
              />
            </section>

            <section className="grid gap-3 rounded-xl border border-white/10 bg-secondary/20 p-3">
              <PortraitField
                asset={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />
              <SaveFieldButton
                label="Save portrait"
                saved={savedField === "portrait"}
                disabled={!portraitDirty}
                onClick={savePortrait}
              />
            </section>

            {asset.kind === "robot" && (
              <section className="grid gap-3 rounded-xl border border-white/10 bg-secondary/20 p-3">
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Paired remote</h3>
                </div>
                {linkedRemote ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-background/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {linkedRemote.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {linkedRemote.serial}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenAsset(linkedRemote.id)}
                    >
                      Open remote
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => pairRemote(linkedRemote, undefined)}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No remote is linked. Each robot can hold only one remote at
                    a time.
                  </p>
                )}
                <div className="grid gap-2">
                  <Label>
                    {linkedRemote ? "Replace with another remote" : "Link a remote"}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={remoteToLink}
                      onValueChange={(value) => {
                        if (value) setRemoteToLink(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a remote" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start">
                        <SelectItem value="none">Choose a remote</SelectItem>
                        {linkableRemotes.map((remote) => {
                          const owner = robotById(assets, remote.assignedToId);
                          return (
                            <SelectItem key={remote.id} value={remote.id}>
                              {remote.name}
                              {owner
                                ? ` · on ${displayName(owner)}`
                                : " · on the rack"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={remoteToLink === "none"}
                      onClick={() => {
                        const remote = assets.find(
                          (item) => item.id === remoteToLink
                        );
                        if (!remote) return;
                        pairRemote(remote, asset.id);
                        setRemoteToLink("none");
                        flash("pair");
                      }}
                    >
                      {linkedRemote ? "Replace remote" : "Link remote"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    One remote per robot. Choosing another unlinks the current
                    pair (and moves a remote off any other unit it was on).
                  </p>
                </div>
              </section>
            )}

            {asset.kind === "remote" && (
              <section className="grid gap-3 rounded-xl border border-white/10 bg-secondary/20 p-3">
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Paired robot</h3>
                </div>
                {pairedRobot ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-background/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {displayName(pairedRobot)}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {pairedRobot.model} · {pairedRobot.serial}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenAsset(pairedRobot.id)}
                    >
                      Open robot
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        pairRemote(asset, undefined);
                        setRobotToLink("none");
                      }}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This remote is on the rack. Link it to a dog or humanoid to
                    jump between their profiles.
                  </p>
                )}
                <div className="grid gap-2">
                  <Label>Link to a robot</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={robotToLink}
                      onValueChange={(value) => {
                        if (value) setRobotToLink(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start">
                        <SelectItem value="none">Unassigned / on the rack</SelectItem>
                        {assignedOptions.map((robot) => {
                          const taken = remoteForRobot(assets, robot.id);
                          return (
                            <SelectItem key={robot.id} value={robot.id}>
                              {displayName(robot)}
                              {taken && taken.id !== asset.id
                                ? ` · has ${taken.name}`
                                : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        (robotToLink === "none" && !asset.assignedToId) ||
                        robotToLink === (asset.assignedToId ?? "none")
                      }
                      onClick={() => {
                        pairRemote(
                          asset,
                          robotToLink === "none" ? undefined : robotToLink
                        );
                        flash("pair");
                      }}
                    >
                      Save pairing
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    One remote per robot. If this unit already has a remote,
                    that remote goes back on the rack.
                  </p>
                </div>
              </section>
            )}

            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="grid gap-2">
                {STATUSES.map((status) => {
                  const meta = STATUS_META[status];
                  const selected = draft.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setDraft({ ...draft, status })}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-foreground/20 bg-secondary"
                          : "border-border bg-transparent hover:bg-muted/40"
                      }`}
                    >
                      <span className="mt-1">
                        <StatusLed status={status} />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">
                          {meta.short} · {meta.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {meta.meaning}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">{conditionHint}</Label>
              <Textarea
                id="condition"
                value={draft.condition}
                onChange={(event) =>
                  setDraft({ ...draft, condition: event.target.value })
                }
                placeholder={
                  draft.status === "ready"
                    ? "No restrictions."
                    : "Be specific so the next operator knows."
                }
              />
            </div>

            {closingShop && (
              <div className="grid gap-2">
                <Label htmlFor="resolution">How was this resolved?</Label>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  placeholder="What fixed it, and when can it go back out?"
                />
              </div>
            )}

            {draft.status !== "ready" && (
              <div className="grid gap-2">
                <Label>Photo of the issue</Label>
                <div className="flex items-center gap-3">
                  {repairImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={repairImageUrl}
                      alt=""
                      className="size-16 rounded-lg object-cover"
                    />
                  ) : null}
                  <label
                    className={buttonVariants({ variant: "outline" }) + " cursor-pointer"}
                  >
                    <ImagePlus data-icon="inline-start" />
                    {repairImageUrl ? "Replace photo" : "Attach photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        setRepairImageUrl(await uploadImage(file));
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Shop notes</Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
                placeholder="Parts on order, firmware, who last used it…"
              />
            </div>

            {(draft.kind === "battery" || draft.kind === "charger") && (
              <div className="grid gap-2">
                <Label>Assigned robot</Label>
                <Select
                  value={draft.assignedToId ?? "none"}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      assignedToId: value === "none" ? undefined : String(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start">
                    <SelectItem value="none">Unassigned / on the rack</SelectItem>
                    {assignedOptions.map((robot) => (
                      <SelectItem key={robot.id} value={robot.id}>
                        {displayName(robot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draft.kind === "battery" && (
              <div className="grid gap-2">
                <Label htmlFor="cycles">Charge cycles</Label>
                <Input
                  id="cycles"
                  type="number"
                  min={0}
                  value={draft.cycles ?? 0}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cycles: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Name, serial, and portrait each have their own save. Save log
              only writes status, notes, and shop details, and stamps
              last-checked as now. Yellow or red opens a repair ticket; green
              marks it resolved.
            </p>
          </TabsContent>

          <TabsContent
            value="repairs"
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          >
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tickets yet. This unit has never been logged yellow or red.
              </p>
            ) : (
              history.map((repair) => {
                const openTicket = !repair.resolvedAt;
                return (
                  <article
                    key={repair.id}
                    className="rounded-xl border border-white/10 bg-secondary/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{repair.title}</p>
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <StatusLed
                          status={openTicket ? repair.openedStatus : "ready"}
                          size="sm"
                        />
                        {openTicket ? "Open" : "Resolved"}
                      </span>
                    </div>
                    {repair.detail && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {repair.detail}
                      </p>
                    )}
                    {repair.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={repair.imageUrl}
                        alt=""
                        className="mt-2 h-28 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      Opened {formatDate(repair.openedAt)}
                      {repair.resolvedAt
                        ? ` · Resolved ${formatDate(repair.resolvedAt)} · ${durationLabel(repair.openedAt, repair.resolvedAt)}`
                        : ` · still open · ${durationLabel(repair.openedAt)}`}
                    </p>
                    {repair.resolution && (
                      <p className="mt-1 text-xs text-emerald-300/90">
                        {repair.resolution}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        <SheetFooter className="border-t">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(draft.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
              <Button onClick={saveLog}>Save log</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Remove also deletes this unit&apos;s repair history and any
              bookings that only cover it.
            </p>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
