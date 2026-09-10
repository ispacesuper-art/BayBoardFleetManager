"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PortraitField } from "@/components/portrait-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultModel, nextName } from "@/lib/storage";
import type { Asset, Kind, RobotPlatform, Status } from "@/lib/types";
import { KIND_META } from "@/lib/types";

const KINDS: Kind[] = ["robot", "battery", "charger", "remote"];
const PLATFORMS: { id: RobotPlatform; label: string }[] = [
  { id: "go2", label: "Go2 (dog)" },
  { id: "g1", label: "G1 (humanoid)" },
];

export function AddAssetDialog({
  open,
  onOpenChange,
  assets,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onAdd: (asset: Asset) => void;
}) {
  const [kind, setKind] = useState<Kind>("robot");
  const [platform, setPlatform] = useState<RobotPlatform>("go2");
  const [model, setModel] = useState(defaultModel("robot", "go2"));
  const [callsign, setCallsign] = useState("");
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<Status>("ready");
  const [condition, setCondition] = useState("");
  const [portrait, setPortrait] = useState<Partial<Asset>>({ portrait: "blank" });

  const name = useMemo(
    () => nextName(kind, platform, assets),
    [kind, platform, assets]
  );

  const robotModels =
    platform === "g1"
      ? ["Unitree G1"]
      : ["Unitree Go2 Pro", "Unitree Go2 Edu"];
  const batteryModels =
    platform === "g1" ? ["G1 battery pack"] : ["Go2 8000 mAh", "Go2 15000 mAh"];
  const chargerModels =
    platform === "g1" ? ["G1 charger"] : ["Go2 charger 54V"];
  const remoteModels = platform === "g1" ? ["G1 remote"] : ["Go2 remote"];

  const models =
    kind === "robot"
      ? robotModels
      : kind === "battery"
        ? batteryModels
        : kind === "charger"
          ? chargerModels
          : remoteModels;

  function applyKind(nextKind: Kind) {
    setKind(nextKind);
    const nextModel = defaultModel(nextKind, platform);
    setModel(nextModel);
  }

  function applyPlatform(nextPlatform: RobotPlatform) {
    setPlatform(nextPlatform);
    setModel(defaultModel(kind, nextPlatform));
  }

  function submit() {
    const asset: Asset = {
      id: crypto.randomUUID(),
      kind,
      name,
      callsign: kind === "robot" && callsign.trim() ? callsign.trim() : undefined,
      model,
      platform,
      serial: serial.trim() || `${name}-SN`,
      status,
      condition: condition.trim(),
      notes: "",
      lastChecked: new Date().toISOString(),
      imageUrl: portrait.imageUrl,
      portrait: portrait.portrait ?? "blank",
      emoji: portrait.emoji,
      imageFit: portrait.imageFit,
      imageScale: portrait.imageScale,
    };
    onAdd(asset);
    onOpenChange(false);
    setCallsign("");
    setSerial("");
    setCondition("");
    setStatus("ready");
    setPortrait({ portrait: "blank" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add to the bay</DialogTitle>
          <DialogDescription>
            Log a robot or a piece of gear. Suggested tag: {name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(value) => applyKind(value as Kind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {KINDS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {KIND_META[item].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Platform</Label>
            <Select
              value={platform}
              onValueChange={(value) => applyPlatform(value as RobotPlatform)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {PLATFORMS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={(value) => setModel(String(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {models.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === "robot" && (
            <div className="grid gap-2">
              <Label htmlFor="callsign">Name</Label>
              <Input
                id="callsign"
                value={callsign}
                onChange={(event) => setCallsign(event.target.value)}
                placeholder="Red, Blue, Halo…"
              />
            </div>
          )}

          <PortraitField
            asset={{
              id: "new",
              kind,
              name,
              callsign: callsign || undefined,
              model,
              platform,
              serial: serial || `${name}-SN`,
              status: "ready",
              condition: "",
              notes: "",
              lastChecked: "",
              imageUrl: portrait.imageUrl,
              portrait: portrait.portrait ?? "blank",
              emoji: portrait.emoji,
              imageFit: portrait.imageFit,
              imageScale: portrait.imageScale,
            }}
            onChange={(patch) => setPortrait({ ...portrait, ...patch })}
          />

          <div className="grid gap-2">
            <Label htmlFor="serial">Serial</Label>
            <Input
              id="serial"
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              placeholder="Optional — we'll stub one if blank"
            />
          </div>

          <div className="grid gap-2">
            <Label>Starting status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as Status)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="ready">Green · working</SelectItem>
                <SelectItem value="limited">Yellow · with conditions</SelectItem>
                <SelectItem value="down">Red · out of commission</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status !== "ready" && (
            <div className="grid gap-2">
              <Label htmlFor="add-condition">Condition / repair note</Label>
              <Textarea
                id="add-condition"
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                placeholder="Why isn't this green?"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add {name}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
