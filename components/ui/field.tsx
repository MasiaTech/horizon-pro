"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical" | "responsive";
    "data-invalid"?: boolean;
  }
>(({ className, orientation = "vertical", "data-invalid": dataInvalid, ...props }, ref) => (
  <div
    ref={ref}
    data-invalid={dataInvalid}
    data-orientation={orientation}
    className={cn(
      "grid gap-2",
      orientation === "horizontal" && "grid-cols-[1fr_auto] items-center gap-4",
      orientation === "responsive" && "grid-cols-1 md:grid-cols-[1fr_auto] md:items-center md:gap-4",
      className
    )}
    {...props}
  />
));
Field.displayName = "Field";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
FieldGroup.displayName = "FieldGroup";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn(className)} {...props} />
));
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    errors?: (string | undefined)[] | string[] | undefined;
  }
>(({ className, errors, children, ...props }, ref) => {
  const list = Array.isArray(errors) ? errors.filter((e): e is string => typeof e === "string") : undefined;
  const message = list?.[0] ?? children;
  if (!message) return null;
  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      role="alert"
      {...props}
    >
      {message}
    </p>
  );
});
FieldError.displayName = "FieldError";

export {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
};
