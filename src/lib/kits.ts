import { defaultEmoji, portraitEmoji } from "./portrait";
import {
  displayName,
  remoteForRobot,
  type Asset,
  type Booking,
  type Kind,
  type Status,
} from "./types";

export interface KitSlotMark {
  key: string;
  emoji: string;
  label: string;
  status?: Status;
  empty?: boolean;
}

export interface TransportKit {
  robot: Asset;
  remote?: Asset;
  batteries: Asset[];
  chargers: Asset[];
  addons: Asset[];
}

const CORE_SLOTS: { kind: Exclude<Kind, "robot">; label: string }[] = [
  { kind: "remote", label: "remote" },
  { kind: "battery", label: "battery" },
  { kind: "charger", label: "charger" },
];

export function kitVessel(kit: TransportKit) {
  return kit.robot.platform === "g1" ? "Case" : "Box";
}

export function accessoriesForRobot(
  assets: Asset[],
  robotId: string,
  kind: Exclude<Kind, "robot">
) {
  return assets.filter(
    (item) => item.kind === kind && item.assignedToId === robotId
  );
}

export function kitForRobot(assets: Asset[], robot: Asset): TransportKit {
  return {
    robot,
    remote: remoteForRobot(assets, robot.id),
    batteries: accessoriesForRobot(assets, robot.id, "battery"),
    chargers: accessoriesForRobot(assets, robot.id, "charger"),
    addons: accessoriesForRobot(assets, robot.id, "addon"),
  };
}

export function kitsFromAssets(assets: Asset[]): TransportKit[] {
  return assets
    .filter((item) => item.kind === "robot")
    .map((robot) => kitForRobot(assets, robot));
}

export function kitMembers(kit: TransportKit): Asset[] {
  return [
    kit.robot,
    kit.remote,
    ...kit.batteries,
    ...kit.chargers,
    ...kit.addons,
  ].filter((item): item is Asset => Boolean(item));
}

export function kitAssetIds(kit: TransportKit) {
  return kitMembers(kit).map((item) => item.id);
}

export function missingKitSlots(kit: TransportKit) {
  const missing: string[] = [];
  if (!kit.remote) missing.push("remote");
  if (kit.batteries.length === 0) missing.push("battery");
  if (kit.chargers.length === 0) missing.push("charger");
  return missing;
}

export function kitStatus(kit: TransportKit): Status {
  const members = kitMembers(kit);
  if (members.some((item) => item.status === "down")) return "down";
  if (members.some((item) => item.status === "limited")) return "limited";
  if (missingKitSlots(kit).length > 0) return "limited";
  return "ready";
}

const STATUS_RANK: Record<Status, number> = {
  ready: 0,
  limited: 1,
  down: 2,
};

/** Complete green boxes first, then other full sets, then incomplete. */
export function sortKitsForBooking(kits: TransportKit[]) {
  return kits.slice().sort((a, b) => {
    const completeDiff = Number(kitIsComplete(b)) - Number(kitIsComplete(a));
    if (completeDiff !== 0) return completeDiff;
    const statusDiff = STATUS_RANK[kitStatus(a)] - STATUS_RANK[kitStatus(b)];
    if (statusDiff !== 0) return statusDiff;
    return displayName(a.robot).localeCompare(displayName(b.robot));
  });
}

export function kitSlotMarks(kit: TransportKit): KitSlotMark[] {
  const marks: KitSlotMark[] = [
    {
      key: kit.robot.id,
      emoji: portraitEmoji(kit.robot),
      label: displayName(kit.robot),
      status: kit.robot.status,
    },
  ];
  if (kit.remote) {
    marks.push({
      key: kit.remote.id,
      emoji: portraitEmoji(kit.remote),
      label: displayName(kit.remote),
      status: kit.remote.status,
    });
  } else {
    marks.push({
      key: "remote-missing",
      emoji: defaultEmoji("remote"),
      label: "Remote missing",
      empty: true,
    });
  }
  if (kit.batteries.length > 0) {
    for (const battery of kit.batteries) {
      marks.push({
        key: battery.id,
        emoji: portraitEmoji(battery),
        label: displayName(battery),
        status: battery.status,
      });
    }
  } else {
    marks.push({
      key: "battery-missing",
      emoji: defaultEmoji("battery"),
      label: "Battery missing",
      empty: true,
    });
  }
  if (kit.chargers.length > 0) {
    for (const charger of kit.chargers) {
      marks.push({
        key: charger.id,
        emoji: portraitEmoji(charger),
        label: displayName(charger),
        status: charger.status,
      });
    }
  } else {
    marks.push({
      key: "charger-missing",
      emoji: defaultEmoji("charger"),
      label: "Charger missing",
      empty: true,
    });
  }
  for (const addon of kit.addons) {
    marks.push({
      key: addon.id,
      emoji: portraitEmoji(addon),
      label: displayName(addon),
      status: addon.status,
    });
  }
  return marks;
}

export function kitIsComplete(kit: TransportKit) {
  return missingKitSlots(kit).length === 0;
}

export function kitIncludesAll(kit: TransportKit, assetIds: string[]) {
  const held = new Set(assetIds);
  return kitAssetIds(kit).every((id) => held.has(id));
}

export function bookingTakesFullKit(booking: Booking, kit: TransportKit) {
  return kitIncludesAll(kit, booking.assetIds);
}

export function looseAssets(assets: Asset[]) {
  const robotIds = new Set(
    assets.filter((item) => item.kind === "robot").map((item) => item.id)
  );
  return assets.filter(
    (item) =>
      item.kind !== "robot" &&
      (!item.assignedToId || !robotIds.has(item.assignedToId))
  );
}

export function kitContentsLabel(kit: TransportKit) {
  const parts = [
    kit.robot.platform === "g1" ? "humanoid" : "dog",
    kit.remote ? displayName(kit.remote) : null,
    ...kit.batteries.map((item) => displayName(item)),
    ...kit.chargers.map((item) => displayName(item)),
    ...kit.addons.map((item) => displayName(item)),
  ].filter(Boolean);
  return parts.join(" · ");
}

export function kitSearchText(kit: TransportKit) {
  return kitMembers(kit)
    .flatMap((item) => [item.name, item.callsign, item.serial, item.model])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export { CORE_SLOTS };
