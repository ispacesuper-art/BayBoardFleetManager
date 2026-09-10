import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyRepairTransition } from "@/lib/repairs";
import {
  conflictingBooking,
  dropBookingsForAsset,
  isBooking,
  normalizeBookings,
} from "@/lib/bookings";
import { SEED_ASSETS, SEED_REPAIRS } from "@/lib/seed";
import {
  applyExclusiveRemotePair,
  normalizeExclusiveRemotePairs,
  type Asset,
  type Booking,
  type FleetState,
  type RepairRecord,
} from "@/lib/types";

export type { FleetState };

const DATA_DIR = path.join(process.cwd(), "data");
const FLEET_PATH = path.join(DATA_DIR, "fleet.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function seedState(): FleetState {
  return {
    assets: SEED_ASSETS,
    repairs: SEED_REPAIRS,
    bookings: [],
    updatedAt: new Date().toISOString(),
  };
}

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

function fromParsed(parsed: Partial<FleetState>): FleetState | null {
  if (!Array.isArray(parsed.assets) || parsed.assets.length === 0) return null;
  return {
    assets: parsed.assets,
    repairs: Array.isArray(parsed.repairs) ? parsed.repairs : [],
    bookings: normalizeBookings(parsed.bookings),
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

async function writeFleetFile(state: FleetState) {
  const tmp = `${FLEET_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await copyFile(tmp, FLEET_PATH);
  await unlink(tmp).catch(() => undefined);
}

export async function readFleet(): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    try {
      const raw = await readFile(FLEET_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<FleetState>;
      const state = fromParsed(parsed);
      if (!state) {
        const seeded = seedState();
        await writeFleetFile(seeded);
        return seeded;
      }
      if (!Array.isArray(parsed.bookings)) {
        await writeFleetFile(state);
      }
      return state;
    } catch {
      const seeded = seedState();
      await writeFleetFile(seeded);
      return seeded;
    }
  });
}

async function persist(state: FleetState): Promise<FleetState> {
  const next = { ...state, updatedAt: new Date().toISOString() };
  await writeFleetFile(next);
  return next;
}

export async function upsertAsset(
  asset: Asset,
  extras?: { resolution?: string; repairImageUrl?: string }
): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    const current = await readUnlocked();
    const previous = current.assets.find((item) => item.id === asset.id);
    const assets =
      asset.kind === "remote"
        ? applyExclusiveRemotePair(current.assets, asset)
        : (() => {
            const index = current.assets.findIndex((item) => item.id === asset.id);
            return index === -1
              ? [asset, ...current.assets]
              : current.assets.map((item, i) => (i === index ? asset : item));
          })();
    return persist({
      assets,
      repairs: applyRepairTransition({
        previous,
        next: asset,
        repairs: current.repairs,
        resolution: extras?.resolution,
        repairImageUrl: extras?.repairImageUrl,
      }),
      bookings: current.bookings,
      updatedAt: current.updatedAt,
    });
  });
}

export async function removeAsset(id: string): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    const current = await readUnlocked();
    return persist({
      assets: current.assets.filter((item) => item.id !== id),
      repairs: current.repairs.filter((item) => item.assetId !== id),
      bookings: dropBookingsForAsset(current.bookings, id),
      updatedAt: current.updatedAt,
    });
  });
}

export async function replaceFleet(state: {
  assets: Asset[];
  repairs: RepairRecord[];
  bookings?: Booking[];
}): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    return persist({
      assets: normalizeExclusiveRemotePairs(state.assets),
      repairs: state.repairs,
      bookings: normalizeBookings(state.bookings),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function upsertBooking(booking: Booking): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    const current = await readUnlocked();
    const conflict = conflictingBooking(current.bookings, booking);
    if (conflict) {
      const error = new Error("That time overlaps another booking");
      (error as Error & { status?: number }).status = 409;
      throw error;
    }
    const index = current.bookings.findIndex((item) => item.id === booking.id);
    const bookings =
      index === -1
        ? [...current.bookings, booking]
        : current.bookings.map((item, i) => (i === index ? booking : item));
    return persist({
      ...current,
      bookings,
    });
  });
}

export async function cancelBooking(id: string): Promise<FleetState> {
  return withLock(async () => {
    await ensureDirs();
    const current = await readUnlocked();
    return persist({
      ...current,
      bookings: current.bookings.map((booking) =>
        booking.id === id && !booking.cancelledAt
          ? { ...booking, cancelledAt: new Date().toISOString() }
          : booking
      ),
    });
  });
}

async function readUnlocked(): Promise<FleetState> {
  try {
    const raw = await readFile(FLEET_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<FleetState>;
    return fromParsed(parsed) ?? seedState();
  } catch {
    return seedState();
  }
}

export function isAsset(value: unknown): value is Asset {
  if (!value || typeof value !== "object") return false;
  const asset = value as Asset;
  return (
    typeof asset.id === "string" &&
    typeof asset.name === "string" &&
    typeof asset.kind === "string" &&
    typeof asset.status === "string"
  );
}

export { isBooking };
