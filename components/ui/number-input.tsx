"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  formatNumberForInput,
  sanitizeNumberInput,
  parseNumberInput,
} from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input numérique : n'accepte que chiffres et virgule.
 * Au collage, supprime espaces, points et autres caractères invalides.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onBlur, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() =>
      formatNumberForInput(value),
    );
    const isFocusedRef = React.useRef(false);

    React.useEffect(() => {
      if (!isFocusedRef.current) {
        setDisplayValue(formatNumberForInput(value));
      }
    }, [value]);

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      const parsed = parseNumberInput(displayValue);
      setDisplayValue(formatNumberForInput(parsed));
      onChange(parsed);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeNumberInput(e.target.value);
      setDisplayValue(sanitized);
      onChange(parseNumberInput(sanitized));
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
