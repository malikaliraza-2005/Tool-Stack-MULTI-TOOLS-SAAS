"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClasses, useFieldControl } from "./Field";

export function Textarea({ className, id, ...props }: ComponentProps<"textarea">) {
  const field = useFieldControl();
  return (
    <textarea
      id={id ?? field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(fieldControlClasses, "min-h-24 resize-y px-3 py-2", className)}
      {...props}
    />
  );
}
