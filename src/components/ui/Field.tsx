"use client";

import { CircleAlert } from "lucide-react";
import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** Wires a control inside <Field> to its label, description and error. */
export function useFieldControl() {
  return useContext(FieldContext);
}

type FieldProps = {
  label: ReactNode;
  description?: ReactNode;
  /** Error message: what happened and what to do (design-system §13). */
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ label, description, error, className, children }: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-ui text-fg">
          {label}
        </label>
        {children}
        {description && (
          <p id={descriptionId} className="text-small text-fg-muted">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-small text-danger">
            <CircleAlert aria-hidden className="size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Shared look of text-entry controls (design-system §8: Input / Textarea). */
export const fieldControlClasses = cn(
  "w-full rounded-md border border-border-strong bg-surface-2 text-body text-fg transition-control",
  "placeholder:text-fg-subtle hover:border-fg-muted",
  "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50",
);
