"use client";

import { Slider as RadixSlider } from "radix-ui";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

type SliderProps = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Formats the readout and the screen-reader value, e.g. as a percentage. */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
};

/**
 * Single-value slider with its value in mono (design-system §8). Arrow keys
 * move by `step`, Page Up/Down by 10 steps, Home/End to the ends (Radix).
 */
export function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = min,
  onValueChange,
  formatValue = String,
  disabled,
  className,
}: SliderProps) {
  const labelId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const text = formatValue(current);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span id={labelId} className="text-ui text-fg">
          {label}
        </span>
        <span aria-hidden className="font-mono text-code text-fg-muted tabular-nums">
          {text}
        </span>
      </div>
      <RadixSlider.Root
        min={min}
        max={max}
        step={step}
        value={[current]}
        disabled={disabled}
        onValueChange={([next]) => {
          if (next === undefined) return;
          setInternal(next);
          onValueChange?.(next);
        }}
        className="relative flex h-6 touch-none items-center select-none data-disabled:opacity-50"
      >
        <RadixSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
          <RadixSlider.Range className="absolute h-full bg-accent" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-labelledby={labelId}
          aria-valuetext={text}
          className="block size-5 cursor-grab rounded-full border-2 border-accent bg-surface shadow-1 transition-control hover:scale-110 active:cursor-grabbing data-disabled:cursor-not-allowed"
        />
      </RadixSlider.Root>
    </div>
  );
}
