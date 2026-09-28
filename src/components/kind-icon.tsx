import { Battery, Gamepad2, Package, Plug } from "lucide-react";
import type { Asset } from "@/lib/types";

function DogMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 14v4" />
      <path d="M9 16v4" />
      <path d="M15 16v4" />
      <path d="M20 14v4" />
      <path d="M3 14h18" />
      <path d="M5 14c0-3 2-6 5-6h2c1.5 0 2.5-2 4-2 1 0 2 .8 2 2v6" />
      <path d="M14 6.5 16 4" />
      <circle cx="8.2" cy="9.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

function HumanoidMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="5" r="2.2" />
      <path d="M8 10h8" />
      <path d="M12 10v6" />
      <path d="M8 22l2-6h4l2 6" />
      <path d="M6 13 8 10" />
      <path d="M18 13 16 10" />
    </svg>
  );
}

export function KindIcon({ asset, className }: { asset: Asset; className?: string }) {
  if (asset.kind === "battery") return <Battery className={className} />;
  if (asset.kind === "charger") return <Plug className={className} />;
  if (asset.kind === "remote") return <Gamepad2 className={className} />;
  if (asset.kind === "addon") return <Package className={className} />;
  if (asset.platform === "g1") return <HumanoidMark className={className} />;
  return <DogMark className={className} />;
}
