import { STATUS_META, type Asset, type RepairRecord } from "./types";

export function openRepairFor(repairs: RepairRecord[], assetId: string) {
  return repairs.find((repair) => repair.assetId === assetId && !repair.resolvedAt);
}

export function repairsFor(repairs: RepairRecord[], assetId: string) {
  return repairs
    .filter((repair) => repair.assetId === assetId)
    .slice()
    .sort((a, b) => {
      if (!a.resolvedAt && b.resolvedAt) return -1;
      if (a.resolvedAt && !b.resolvedAt) return 1;
      return b.openedAt.localeCompare(a.openedAt);
    });
}

export function applyRepairTransition(args: {
  previous: Asset | undefined;
  next: Asset;
  repairs: RepairRecord[];
  resolution?: string;
  repairImageUrl?: string;
}): RepairRecord[] {
  const { previous, next, repairs, resolution, repairImageUrl } = args;
  const wasOpen = previous ? previous.status !== "ready" : false;
  const isOpen = next.status !== "ready";
  const existing = openRepairFor(repairs, next.id);
  const now = next.lastChecked;
  const openedStatus: RepairRecord["openedStatus"] =
    next.status === "down" ? "down" : "limited";
  const title =
    next.condition.trim() ||
    (next.status === "ready"
      ? existing?.title
      : STATUS_META[next.status].label) ||
    "Repair";

  if (!wasOpen && isOpen && next.status !== "ready") {
    const record: RepairRecord = {
      id: crypto.randomUUID(),
      assetId: next.id,
      openedAt: now,
      openedStatus,
      title,
      detail: next.notes.trim(),
      imageUrl: repairImageUrl,
    };
    return [record, ...repairs];
  }

  if (wasOpen && !isOpen && existing) {
    return repairs.map((repair) =>
      repair.id === existing.id
        ? {
            ...repair,
            resolvedAt: now,
            resolution: (resolution ?? next.notes).trim() || "Returned to service",
            imageUrl: repairImageUrl ?? repair.imageUrl,
            title: existing.title || title,
          }
        : repair
    );
  }

  if (wasOpen && isOpen && existing) {
    return repairs.map((repair) =>
      repair.id === existing.id
        ? {
            ...repair,
            openedStatus,
            title,
            detail: next.notes.trim(),
            imageUrl: repairImageUrl ?? repair.imageUrl,
          }
        : repair
    );
  }

  if (!previous && isOpen) {
    const record: RepairRecord = {
      id: crypto.randomUUID(),
      assetId: next.id,
      openedAt: now,
      openedStatus,
      title,
      detail: next.notes.trim(),
      imageUrl: repairImageUrl,
    };
    return [record, ...repairs];
  }

  return repairs;
}

export function durationLabel(openedAt: string, resolvedAt?: string) {
  const start = new Date(openedAt).getTime();
  const end = new Date(resolvedAt ?? Date.now()).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "";
  const days = Math.max(0, Math.round((end - start) / 86_400_000));
  if (days === 0) return "same day";
  if (days === 1) return "1 day";
  return `${days} days`;
}
