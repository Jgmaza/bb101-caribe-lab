import type { ReactNode } from "react";
import Link from "next/link";
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
          <Logo href="/lotes" />
          <nav className="hidden items-center gap-3 text-sm font-semibold text-ink-muted sm:flex">
            <Link href="/lotes" className="hover:text-blue">
              Lotes
            </Link>
            <Link href="/inicio" className="hover:text-blue">
              Mi wallet
            </Link>
            <Link href="/proyectos/nuevo" className="hover:text-blue">
              Grupos %
            </Link>
          </nav>
          {breadcrumb ? (
            <span className="hidden truncate text-sm text-ink-muted lg:inline">· {breadcrumb}</span>
          ) : null}
        </div>
        {right}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
