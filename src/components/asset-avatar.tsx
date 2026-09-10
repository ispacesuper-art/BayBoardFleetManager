"use client";

import { useState } from "react";
import { KindIcon } from "@/components/kind-icon";
import { cn } from "@/lib/utils";
import { imageScale, portraitEmoji, portraitMode } from "@/lib/portrait";
import { callsignColorClass, type Asset } from "@/lib/types";

export function AssetAvatar({
  asset,
  size = "md",
  className,
}: {
  asset: Asset;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const dim =
    size === "sm" ? "size-10" : size === "lg" ? "size-20" : "size-12";
  const mode = portraitMode(asset);
  const scale = imageScale(asset);
  const fit = asset.imageFit === "contain" ? "object-contain" : "object-cover";
  const emojiSize =
    size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl";
  const showImage = mode === "image" && Boolean(asset.imageUrl) && !imageFailed;

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl bg-secondary ring-2",
        dim,
        callsignColorClass(asset.callsign),
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.imageUrl}
          alt=""
          className={cn("size-full", fit)}
          style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
          onError={() => setImageFailed(true)}
        />
      ) : mode === "emoji" ? (
        <span
          className={cn(
            "flex size-full items-center justify-center leading-none",
            emojiSize
          )}
          aria-hidden
        >
          {portraitEmoji(asset)}
        </span>
      ) : mode === "blank" ? (
        <span className="block size-full" />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <KindIcon
            asset={asset}
            className={size === "lg" ? "size-8" : "size-5"}
          />
        </span>
      )}
    </span>
  );
}
