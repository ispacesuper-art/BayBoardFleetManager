import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isBooking, normalizeBookings } from "@/lib/bookings";
import { UPLOAD_DIR, type FleetState, isAsset } from "@/lib/fleet-store";
import type { Asset, Booking, RepairRecord } from "@/lib/types";

export const BACKUP_VERSION = 2 as const;

export interface FleetBackup {
  version: number;
  kind: "bay-board-backup";
  exportedAt: string;
  assets: Asset[];
  repairs: RepairRecord[];
  bookings: Booking[];
  /** Upload filenames → base64 JPEG bytes */
  uploads: Record<string, string>;
}

const UPLOAD_NAME = /^[a-zA-Z0-9-]+\.jpg$/;

export function isUploadName(name: string) {
  return UPLOAD_NAME.test(name);
}

function collectUploadNames(assets: Asset[], repairs: RepairRecord[]) {
  const names = new Set<string>();
  const take = (url?: string) => {
    if (!url) return;
    const match = url.match(/\/api\/uploads\/([a-zA-Z0-9-]+\.jpg)$/);
    if (match) names.add(match[1]);
  };
  for (const asset of assets) take(asset.imageUrl);
  for (const repair of repairs) take(repair.imageUrl);
  return names;
}

export async function buildBackup(state: FleetState): Promise<FleetBackup> {
  const uploads: Record<string, string> = {};
  const names = collectUploadNames(state.assets, state.repairs);

  try {
    const onDisk = await readdir(UPLOAD_DIR);
    for (const name of onDisk) {
      if (isUploadName(name)) names.add(name);
    }
  } catch {
    // uploads dir may be empty
  }

  for (const name of names) {
    try {
      const bytes = await readFile(path.join(UPLOAD_DIR, name));
      uploads[name] = bytes.toString("base64");
    } catch {
      // skip missing files
    }
  }

  return {
    version: BACKUP_VERSION,
    kind: "bay-board-backup",
    exportedAt: new Date().toISOString(),
    assets: state.assets,
    repairs: state.repairs,
    bookings: state.bookings,
    uploads,
  };
}

export function parseBackup(value: unknown): FleetBackup | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<FleetBackup> & Partial<FleetState>;

  if (!Array.isArray(raw.assets) || raw.assets.length === 0) return null;
  if (!raw.assets.every(isAsset)) return null;

  const repairs = Array.isArray(raw.repairs) ? (raw.repairs as RepairRecord[]) : [];
  const bookings = Array.isArray(raw.bookings)
    ? raw.bookings.filter(isBooking)
    : normalizeBookings(raw.bookings);
  const uploads: Record<string, string> = {};

  if (raw.uploads && typeof raw.uploads === "object") {
    for (const [name, data] of Object.entries(raw.uploads)) {
      if (isUploadName(name) && typeof data === "string" && data.length > 0) {
        uploads[name] = data;
      }
    }
  }

  return {
    version: BACKUP_VERSION,
    kind: "bay-board-backup",
    exportedAt:
      typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    assets: raw.assets,
    repairs,
    bookings,
    uploads,
  };
}

export async function writeUploads(uploads: Record<string, string>) {
  for (const [name, data] of Object.entries(uploads)) {
    if (!isUploadName(name)) continue;
    try {
      const bytes = Buffer.from(data, "base64");
      if (bytes.length === 0 || bytes.length > 5_000_000) continue;
      await writeFile(path.join(UPLOAD_DIR, name), bytes);
    } catch {
      // skip bad entries
    }
  }
}
