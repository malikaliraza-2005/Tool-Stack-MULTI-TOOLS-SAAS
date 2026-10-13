import { cn } from "@/lib/cn";

// Shared surfaces for Select, Combobox, DropdownMenu and Popover (design-system §8).
export const floatingSurfaceClasses = cn(
  "z-50 rounded-md border border-border bg-surface text-fg shadow-2",
  "animate-pop-in data-[state=closed]:animate-pop-out",
);

const itemBase = cn(
  "relative flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-ui outline-none select-none",
  "[&_svg]:size-4 [&_svg]:shrink-0",
);

// Radix marks the active item with `data-highlighted` and disabled items with
// a bare `data-disabled`.
export const menuItemClasses = cn(
  itemBase,
  "data-highlighted:bg-surface-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
);

// cmdk always sets `data-selected` and `data-disabled` to "true" or "false".
export const commandItemClasses = cn(
  itemBase,
  "data-[selected=true]:bg-surface-2",
  "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
);
