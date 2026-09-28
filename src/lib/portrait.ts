import type { Asset, Kind } from "./types";

export type PortraitMode = "image" | "emoji" | "blank";
export type ImageFit = "cover" | "contain";

export const EMOJI_SUGGESTIONS = [
  "🐕",
  "🐶",
  "🤖",
  "🔋",
  "🔌",
  "🎮",
  "🔴",
  "🔵",
  "⬛",
  "⚪",
  "🟠",
  "⚠️",
  "🛠️",
  "📦",
  "📡",
  "🧪",
] as const;

export function defaultEmoji(kind: Kind, platform?: Asset["platform"]) {
  if (kind === "battery") return "🔋";
  if (kind === "charger") return "🔌";
  if (kind === "remote") return "🎮";
  if (kind === "addon") return "📦";
  if (platform === "g1") return "🤖";
  return "🐕";
}

export function portraitMode(asset: Pick<Asset, "portrait" | "imageUrl" | "emoji">): PortraitMode {
  if (asset.portrait === "image" || asset.portrait === "emoji" || asset.portrait === "blank") {
    return asset.portrait;
  }
  if (asset.imageUrl) return "image";
  if (asset.emoji) return "emoji";
  return "blank";
}

export function portraitEmoji(asset: Pick<Asset, "emoji" | "kind" | "platform">) {
  return asset.emoji?.trim() || defaultEmoji(asset.kind, asset.platform);
}

export function imageScale(asset: Pick<Asset, "imageScale">) {
  const value = asset.imageScale ?? 1;
  return Math.min(2.4, Math.max(0.6, value));
}
