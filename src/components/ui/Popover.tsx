"use client";

import { Popover as RadixPopover } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { floatingSurfaceClasses } from "./menu-styles";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export function PopoverContent({
  className,
  sideOffset = 6,
  align = "start",
  ...props
}: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          floatingSurfaceClasses,
          "w-popover max-w-(--radix-popover-content-available-width) p-4",
          "origin-(--radix-popover-content-transform-origin)",
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
