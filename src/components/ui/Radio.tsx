"use client";

import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadixRadioGroup.Root>) {
  return <RadixRadioGroup.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

type RadioProps = ComponentProps<typeof RadixRadioGroup.Item> & { label: ReactNode };

export function Radio({ label, className, id, ...props }: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <RadixRadioGroup.Item
        id={radioId}
        className={cn(
          "peer inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface transition-control",
          "hover:border-fg-muted data-[state=checked]:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        <RadixRadioGroup.Indicator className="size-2.5 rounded-full bg-accent" />
      </RadixRadioGroup.Item>
      <label
        htmlFor={radioId}
        className="cursor-pointer text-ui text-fg peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        {label}
      </label>
    </div>
  );
}
