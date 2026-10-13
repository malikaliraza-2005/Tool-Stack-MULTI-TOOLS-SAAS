"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = ComponentProps<typeof RadixSwitch.Root> & { label: ReactNode };

export function Switch({ label, className, id, ...props }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <RadixSwitch.Root
        id={switchId}
        className={cn(
          "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-border-strong p-0.5 transition-control",
          "data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        <RadixSwitch.Thumb className="block size-5 rounded-full bg-surface shadow-1 transition-control data-[state=checked]:translate-x-4" />
      </RadixSwitch.Root>
      <label
        htmlFor={switchId}
        className="cursor-pointer text-ui text-fg peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        {label}
      </label>
    </div>
  );
}
