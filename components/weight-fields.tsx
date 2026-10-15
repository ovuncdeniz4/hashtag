"use client";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { STAT_LABELS, type WeightKey, type Weights } from "@/lib/types";

/** Shared weight controls for the rankings sheet and the league screen. */
export function WeightFields({
  weights,
  keys,
  onChange,
}: {
  weights: Weights;
  keys: readonly WeightKey[];
  onChange: (key: WeightKey, value: number) => void;
}) {
  return (
    <div className="grid gap-4">
      {keys.map((key) => (
        <div key={key} className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span>{STAT_LABELS[key]}</span>
            <div className="w-24">
              <Input
                aria-label={STAT_LABELS[key]}
                type="number"
                step="0.1"
                value={weights[key]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) onChange(key, next);
                }}
              />
            </div>
          </div>
          <Slider
            min={-3}
            max={3}
            step={0.1}
            value={[weights[key]]}
            onValueChange={(next) => {
              const raw = Array.isArray(next) ? next[0] : next;
              if (typeof raw === "number") onChange(key, Math.round(raw * 10) / 10);
            }}
          />
        </div>
      ))}
    </div>
  );
}
