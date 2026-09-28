import { SEED_ASSETS, SEED_REPAIRS } from "./seed";
import type { Asset, FleetState } from "./types";

export type { FleetState };

export const EMPTY_FLEET: FleetState = {
  assets: [],
  repairs: [],
  bookings: [],
};

export const SEED_FLEET: FleetState = {
  assets: SEED_ASSETS,
  repairs: SEED_REPAIRS,
  bookings: [],
};

export function nextName(kind: Asset["kind"], platform: Asset["platform"], assets: Asset[]) {
  const same = assets.filter((a) => a.kind === kind && a.platform === platform);
  const n = String(same.length + 1).padStart(2, "0");
  if (kind === "robot") return platform === "g1" ? `G1-${n}` : `GO2-${n}`;
  if (kind === "battery") return platform === "g1" ? `BAT-G1-${n}` : `BAT-${n}`;
  if (kind === "charger") return platform === "g1" ? `CHG-G1-${n}` : `CHG-${n}`;
  if (kind === "addon") return platform === "g1" ? `ADD-G1-${n}` : `ADD-${n}`;
  return platform === "g1" ? `RC-G1-${n}` : `RC-${n}`;
}

export function chargerModels(platform: Asset["platform"]) {
  return platform === "g1"
    ? ["G1 charger"]
    : ["Go2 standard charger", "Go2 fast charger"];
}

export function defaultModel(kind: Asset["kind"], platform: Asset["platform"]) {
  if (kind === "robot") return platform === "g1" ? "Unitree G1" : "Unitree Go2 Pro";
  if (kind === "battery") return platform === "g1" ? "G1 battery pack" : "Go2 8000 mAh";
  if (kind === "charger") return chargerModels(platform)[0];
  if (kind === "addon") return platform === "g1" ? "G1 add-on" : "Go2 add-on";
  return platform === "g1" ? "G1 remote" : "Go2 remote";
}

export function formatChecked(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function readImageFile(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(max / image.width, max / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read image"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };
    image.src = objectUrl;
  });
}

export async function uploadImage(file: File): Promise<string> {
  const dataUrl = await readImageFile(file);
  const blob = await (await fetch(dataUrl)).blob();
  const body = new FormData();
  body.append("file", blob, "photo.jpg");
  const response = await fetch("/api/uploads", { method: "POST", body });
  if (!response.ok) throw new Error("Could not upload photo");
  const json = (await response.json()) as { url: string };
  return json.url;
}
