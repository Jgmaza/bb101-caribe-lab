import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function DesktopShell({
  right,
  breadcrumb,
  children,
}: {
  right?: ReactNode;
  breadcrumb?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-soft">
      <header className="flex h-[72px] items-center justify-between gap-4 border-b border-line bg-white px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Logo href="/" />
          {breadcrumb ? (
            <span className="hidden truncate text-sm text-ink-muted sm:inline">
              {breadcrumb}
            </span>
          ) : null}
        </div>
        {right}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
