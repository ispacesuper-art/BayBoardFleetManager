"use client";

import { ImagePlus } from "lucide-react";
import { AssetAvatar } from "@/components/asset-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  defaultEmoji,
  EMOJI_SUGGESTIONS,
  portraitMode,
  type PortraitMode,
} from "@/lib/portrait";
import type { Asset, ImageFit } from "@/lib/types";

const MODES: { id: PortraitMode; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "emoji", label: "Emoji" },
  { id: "blank", label: "Blank" },
];

export function PortraitField({
  asset,
  onChange,
}: {
  asset: Asset;
  onChange: (patch: Partial<Asset>) => void;
}) {
  const mode = portraitMode(asset);
  const scale = asset.imageScale ?? 1;
  const fit: ImageFit = asset.imageFit === "contain" ? "contain" : "cover";

  return (
    <div className="grid gap-3">
      <Label>Portrait</Label>
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={mode === item.id ? "default" : "outline"}
            onClick={() =>
              onChange({
                portrait: item.id,
                emoji:
                  item.id === "emoji"
                    ? asset.emoji || defaultEmoji(asset.kind, asset.platform)
                    : asset.emoji,
              })
            }
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex items-start gap-3">
        <AssetAvatar asset={{ ...asset, portrait: mode }} size="lg" />
        <div className="grid min-w-0 flex-1 gap-2">
          {mode === "image" && (
            <>
              <label
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-fit cursor-pointer"
                )}
              >
                <ImagePlus data-icon="inline-start" />
                {asset.imageUrl ? "Replace photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const { uploadImage } = await import("@/lib/storage");
                    onChange({
                      portrait: "image",
                      imageUrl: await uploadImage(file),
                      imageFit: asset.imageFit ?? "cover",
                      imageScale: asset.imageScale ?? 1,
                    });
                  }}
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                Use Cover to fill the square, or Contain to show the whole
                picture. Drag Size until it sits right.
              </p>
            </>
          )}
          {mode === "emoji" && (
            <>
              <Input
                value={asset.emoji ?? ""}
                onChange={(event) =>
                  onChange({
                    portrait: "emoji",
                    emoji: event.target.value,
                  })
                }
                placeholder="Paste an emoji"
                aria-label="Portrait emoji"
              />
              <p className="text-[11px] text-muted-foreground">
                Paste an emoji, or pick one below. On Windows press Win + .
              </p>
            </>
          )}
          {mode === "blank" && (
            <p className="text-[11px] text-muted-foreground">
              No portrait. The card shows an empty square.
            </p>
          )}
        </div>
      </div>

      {mode === "image" && asset.imageUrl && (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-secondary/30 p-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Fit</Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={fit === "cover" ? "default" : "outline"}
                onClick={() => onChange({ imageFit: "cover" })}
              >
                Cover
              </Button>
              <Button
                type="button"
                size="sm"
                variant={fit === "contain" ? "default" : "outline"}
                onClick={() => onChange({ imageFit: "contain" })}
              >
                Contain
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="image-scale" className="text-xs">
                Size
              </Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <input
              id="image-scale"
              type="range"
              min={0.6}
              max={2.4}
              step={0.05}
              value={scale}
              onChange={(event) =>
                onChange({ imageScale: Number(event.target.value) })
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-sky-300"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Smaller</span>
              <span>Larger</span>
            </div>
          </div>
        </div>
      )}

      {mode === "emoji" && (
        <div className="flex flex-wrap gap-1">
          {EMOJI_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ portrait: "emoji", emoji })}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-lg hover:bg-muted",
                asset.emoji === emoji && "bg-muted ring-1 ring-white/20"
              )}
              aria-label={`Use ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
