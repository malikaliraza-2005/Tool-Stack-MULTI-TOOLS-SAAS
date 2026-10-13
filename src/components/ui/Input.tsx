"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClasses, useFieldControl } from "./Field";

export function Input({ className, id, ...props }: ComponentProps<"input">) {
  const field = useFieldControl();
  return (
    <input
      id={id ?? field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(fieldControlClasses, "h-10 px-3", className)}
      {...props}
    />
  );
}
