"use client";

import { m } from "motion/react";
import { Tabs as RadixTabs } from "radix-ui";
import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { slide } from "@/lib/motion";

const TabsContext = createContext<{ value: string | undefined; indicatorId: string } | null>(null);

type TabsProps = Omit<ComponentProps<typeof RadixTabs.Root>, "orientation">;

export function Tabs({ value, defaultValue, onValueChange, className, ...props }: TabsProps) {
  const indicatorId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  return (
    <TabsContext.Provider value={{ value: current, indicatorId }}>
      <RadixTabs.Root
        value={current}
        onValueChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
        className={cn("flex min-w-0 flex-col gap-4", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

/** Tab with a sliding underline indicator (design-system §8). */
export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: ComponentProps<typeof RadixTabs.Trigger>) {
  const tabs = useContext(TabsContext);
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        "relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-t-sm px-3 text-ui text-fg-muted transition-control",
        "hover:text-fg data-[state=active]:text-fg disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {tabs?.value === value && (
        <m.span
          layoutId={tabs.indicatorId}
          transition={slide}
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent"
        />
      )}
    </RadixTabs.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn("animate-fade-in data-[state=inactive]:hidden", className)}
      {...props}
    />
  );
}
