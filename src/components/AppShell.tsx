import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface AppShellProps {
  breadcrumb: string;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-sm font-semibold tracking-tight text-slate-900">
            Case-Twin
          </Link>
          <span className="text-sm text-slate-600">{breadcrumb}</span>
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Docs placeholder link">
              <Button variant="secondary" size="sm">
                Docs
              </Button>
            </a>
            <Tooltip content="Export will be enabled in a later iteration.">
              <span>
                <Button size="sm" disabled>
                  Export
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
