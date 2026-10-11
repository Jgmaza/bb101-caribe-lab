import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function PagadorShell({
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
      <header className="flex h-[72px] items-center justify-between border-b border-line bg-white px-8">
        <div className="flex items-center gap-4">
          <Logo href="/pagador/lotes" />
          {breadcrumb ? (
            <span className="hidden text-sm text-ink-muted sm:inline">
              {breadcrumb}
            </span>
          ) : null}
        </div>
        {right}
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
