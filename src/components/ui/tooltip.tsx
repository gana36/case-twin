import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          className={cn(
            "absolute -top-9 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
