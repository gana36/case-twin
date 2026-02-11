import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

export function Checkbox({ checked, onCheckedChange, id }: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border border-slate-300 transition-colors",
        checked ? "border-blue-600 bg-blue-600 text-white" : "bg-white text-transparent"
      )}
    >
      <Check className="h-3 w-3" />
    </button>
  );
}
