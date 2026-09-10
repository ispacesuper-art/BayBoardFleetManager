export type Status = "ready" | "limited" | "down";
export type Kind = "robot" | "battery" | "charger" | "remote";
export type RobotPlatform = "go2" | "g1";

export interface Asset {
  id: string;
  kind: Kind;
  name: string;
  callsign?: string;
  model: string;
  platform: RobotPlatform;
  serial: string;
  status: Status;
  condition: string;
  notes: string;
  lastChecked: string;
  assignedToId?: string;
  cycles?: number;
  imageUrl?: string;
  portrait?: PortraitMode;
  emoji?: string;
  imageFit?: ImageFit;
  imageScale?: number;
}

export type PortraitMode = "image" | "emoji" | "blank";
export type ImageFit = "cover" | "contain";

export interface RepairRecord {
  id: string;
  assetId: string;
  openedAt: string;
  resolvedAt?: string;
  openedStatus: Exclude<Status, "ready">;
  title: string;
  detail: string;
  resolution?: string;
  imageUrl?: string;
}

export interface Booking {
  id: string;
  /** One or more assets held for this reservation (robot, battery, remote, …). */
  assetIds: string[];
  title: string;
  bookedBy: string;
  startsAt: string;
  endsAt: string;
  notes: string;
  createdAt: string;
  cancelledAt?: string;
}

export interface FleetState {
  assets: Asset[];
  repairs: RepairRecord[];
  bookings: Booking[];
  updatedAt?: string;
}

export const STATUS_META: Record<
  Status,
  { label: string; short: string; meaning: string }
> = {
  ready: {
    label: "Working",
    short: "Green",
    meaning: "Ready to deploy",
  },
  limited: {
    label: "With conditions",
    short: "Yellow",
    meaning: "Usable, but with limits",
  },
  down: {
    label: "Out of commission",
    short: "Red",
    meaning: "Do not use — needs repair",
  },
};

export const KIND_META: Record<Kind, { label: string; plural: string }> = {
  robot: { label: "Robot", plural: "Robots" },
  battery: { label: "Battery", plural: "Batteries" },
  charger: { label: "Charger", plural: "Chargers" },
  remote: { label: "Remote", plural: "Remotes" },
};

export const COLOR_NAMES = ["Red", "Blue", "Black", "White", "Orange"] as const;

export function isAttention(asset: Asset) {
  return asset.status === "limited" || asset.status === "down";
}

export function displayName(asset: Asset) {
  return asset.callsign ? `${asset.name} · ${asset.callsign}` : asset.name;
}

export function remotesForRobot(assets: Asset[], robotId: string) {
  return assets.filter(
    (item) => item.kind === "remote" && item.assignedToId === robotId
  );
}

/** At most one remote may be paired to a robot. */
export function remoteForRobot(assets: Asset[], robotId: string) {
  return remotesForRobot(assets, robotId)[0];
}

export function robotById(assets: Asset[], id?: string) {
  if (!id) return undefined;
  return assets.find((item) => item.kind === "robot" && item.id === id);
}

/**
 * Upsert a remote and clear any other remotes already assigned to the same robot.
 * Non-remote assets (or remotes with no assignment) pass through unchanged aside from the upsert.
 */
export function applyExclusiveRemotePair(
  assets: Asset[],
  remote: Asset
): Asset[] {
  const index = assets.findIndex((item) => item.id === remote.id);
  let next =
    index === -1
      ? [remote, ...assets]
      : assets.map((item, i) => (i === index ? remote : item));

  if (remote.kind === "remote" && remote.assignedToId) {
    const robotId = remote.assignedToId;
    next = next.map((item) => {
      if (
        item.kind === "remote" &&
        item.id !== remote.id &&
        item.assignedToId === robotId
      ) {
        const { assignedToId: _cleared, ...rest } = item;
        return { ...rest };
      }
      return item;
    });
  }

  return next;
}

/** Keep only the first remote per robot when data somehow has duplicates. */
export function normalizeExclusiveRemotePairs(assets: Asset[]): Asset[] {
  const seen = new Set<string>();
  return assets.map((item) => {
    if (item.kind !== "remote" || !item.assignedToId) return item;
    if (seen.has(item.assignedToId)) {
      const { assignedToId: _cleared, ...rest } = item;
      return { ...rest };
    }
    seen.add(item.assignedToId);
    return item;
  });
}

export function isOpenRepair(repair: RepairRecord) {
  return !repair.resolvedAt;
}

export function callsignColorClass(callsign?: string) {
  const key = callsign?.trim().toLowerCase();
  if (key === "red") return "ring-red-500";
  if (key === "blue") return "ring-blue-400";
  if (key === "black") return "ring-zinc-400";
  if (key === "white") return "ring-white";
  if (key === "orange") return "ring-orange-500";
  return "ring-white/15";
}
