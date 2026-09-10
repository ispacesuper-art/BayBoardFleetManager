"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { dropBookingsForAsset } from "@/lib/bookings";
import { applyRepairTransition } from "@/lib/repairs";
import { EMPTY_FLEET, type FleetState } from "@/lib/storage";
import {
  applyExclusiveRemotePair,
  isAttention,
  type Asset,
  type Booking,
  type RepairRecord,
} from "@/lib/types";

type Status = "loading" | "ready" | "error";

type Snapshot = {
  state: FleetState;
  status: Status;
  error: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();
const LOADING: Snapshot = { state: EMPTY_FLEET, status: "loading", error: null };
let snapshot: Snapshot = LOADING;
let inFlight = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function fetchFleet(): Promise<FleetState> {
  const response = await fetch("/api/fleet", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the shared bay");
  const state = (await response.json()) as FleetState;
  return {
    assets: Array.isArray(state.assets) ? state.assets : [],
    repairs: Array.isArray(state.repairs) ? state.repairs : [],
    bookings: Array.isArray(state.bookings) ? state.bookings : [],
    updatedAt: state.updatedAt,
  };
}

async function mutate(body: unknown): Promise<FleetState> {
  const response = await fetch("/api/fleet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(err?.error ?? "Could not save to the shared bay");
  }
  return response.json() as Promise<FleetState>;
}

async function refresh() {
  if (inFlight > 0) return;
  try {
    const state = await fetchFleet();
    if (inFlight > 0) return;
    setSnapshot({ state, status: "ready", error: null });
  } catch (error) {
    if (snapshot.status === "ready") return;
    setSnapshot({
      state: snapshot.state,
      status: "error",
      error: error instanceof Error ? error.message : "Could not load the shared bay",
    });
  }
}

function applyLocal(state: FleetState) {
  setSnapshot({
    state: {
      assets: Array.isArray(state.assets) ? state.assets : [],
      repairs: Array.isArray(state.repairs) ? state.repairs : [],
      bookings: Array.isArray(state.bookings) ? state.bookings : [],
      updatedAt: state.updatedAt,
    },
    status: "ready",
    error: null,
  });
}

async function persist(next: FleetState, body: unknown) {
  applyLocal(next);
  inFlight += 1;
  try {
    const saved = await mutate(body);
    applyLocal(saved);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save to the shared bay";
    try {
      const state = await fetchFleet();
      setSnapshot({ state, status: "ready", error: message });
    } catch {
      setSnapshot({
        state: snapshot.state,
        status: "error",
        error: message,
      });
    }
  } finally {
    inFlight -= 1;
  }
}

export function useFleet() {
  const snapshotState = useSyncExternalStore(subscribe, () => snapshot, () => LOADING);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 4000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const { assets, repairs, bookings } = snapshotState.state;

  const upsert = useCallback(
    (
      asset: Asset,
      extras?: { resolution?: string; repairImageUrl?: string }
    ) => {
      const current = snapshot.state;
      const previous = current.assets.find((item) => item.id === asset.id);
      const nextAssets =
        asset.kind === "remote"
          ? applyExclusiveRemotePair(current.assets, asset)
          : (() => {
              const index = current.assets.findIndex((item) => item.id === asset.id);
              return index === -1
                ? [asset, ...current.assets]
                : current.assets.map((item, i) => (i === index ? asset : item));
            })();
      const next: FleetState = {
        assets: nextAssets,
        repairs: applyRepairTransition({
          previous,
          next: asset,
          repairs: current.repairs,
          resolution: extras?.resolution,
          repairImageUrl: extras?.repairImageUrl,
        }),
        bookings: current.bookings,
        updatedAt: new Date().toISOString(),
      };
      void persist(next, { action: "upsert", asset, extras });
    },
    []
  );

  const remove = useCallback((id: string) => {
    const current = snapshot.state;
    const next: FleetState = {
      assets: current.assets.filter((item) => item.id !== id),
      repairs: current.repairs.filter((item) => item.assetId !== id),
      bookings: dropBookingsForAsset(current.bookings, id),
      updatedAt: new Date().toISOString(),
    };
    void persist(next, { action: "remove", id });
  }, []);

  const upsertBooking = useCallback((booking: Booking) => {
    const current = snapshot.state;
    const index = current.bookings.findIndex((item) => item.id === booking.id);
    const next: FleetState = {
      ...current,
      bookings:
        index === -1
          ? [...current.bookings, booking]
          : current.bookings.map((item, i) => (i === index ? booking : item)),
      updatedAt: new Date().toISOString(),
    };
    void persist(next, { action: "upsertBooking", booking });
  }, []);

  const cancelBooking = useCallback((id: string) => {
    const current = snapshot.state;
    const next: FleetState = {
      ...current,
      bookings: current.bookings.map((booking) =>
        booking.id === id && !booking.cancelledAt
          ? { ...booking, cancelledAt: new Date().toISOString() }
          : booking
      ),
      updatedAt: new Date().toISOString(),
    };
    void persist(next, { action: "cancelBooking", id });
  }, []);

  const replace = useCallback(async (file: File) => {
    const text = await file.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("That file is not valid JSON");
    }
    inFlight += 1;
    try {
      const response = await fetch("/api/fleet/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error ?? "Could not import backup");
      }
      const state = (await response.json()) as FleetState;
      const next: FleetState = {
        assets: Array.isArray(state.assets) ? state.assets : [],
        repairs: Array.isArray(state.repairs) ? state.repairs : [],
        bookings: Array.isArray(state.bookings) ? state.bookings : [],
        updatedAt: state.updatedAt,
      };
      applyLocal(next);
      return next;
    } finally {
      inFlight -= 1;
    }
  }, []);

  const exportBackup = useCallback(async () => {
    const response = await fetch("/api/fleet/backup", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not export backup");
    const blob = await response.blob();
    const stamp = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bay-board-backup-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const retry = useCallback(() => {
    setSnapshot({ ...snapshot, status: "loading", error: null });
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const count = (status: Asset["status"]) =>
      assets.filter((a) => a.status === status).length;
    const kind = (k: Asset["kind"]) => assets.filter((a) => a.kind === k).length;
    const robotList = assets.filter((a) => a.kind === "robot");
    return {
      total: assets.length,
      ready: count("ready"),
      limited: count("limited"),
      down: count("down"),
      attention: assets.filter(isAttention).length,
      robots: kind("robot"),
      go2: robotList.filter((a) => a.platform === "go2").length,
      g1: robotList.filter((a) => a.platform === "g1").length,
      batteries: kind("battery"),
      chargers: kind("charger"),
      remotes: kind("remote"),
      openRepairs: repairs.filter((repair) => !repair.resolvedAt).length,
      openBookings: bookings.filter((booking) => !booking.cancelledAt).length,
    };
  }, [assets, repairs, bookings]);

  const robots = useMemo(
    () => assets.filter((a) => a.kind === "robot"),
    [assets]
  );

  return {
    assets,
    repairs,
    bookings,
    upsert,
    remove,
    upsertBooking,
    cancelBooking,
    replace,
    exportBackup,
    retry,
    stats,
    robots,
    status: snapshotState.status,
    error: snapshotState.error,
    updatedAt: snapshotState.state.updatedAt,
  };
}

export type { RepairRecord };
