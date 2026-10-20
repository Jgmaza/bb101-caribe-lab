import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Shell del trabajador: móvil-first limpio, sin marco de teléfono falso. */
export function MobileShell({
  children,
  showLogo = false,
  left,
  right,
}: {
  children: ReactNode;
  showLogo?: boolean;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-soft">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-3 px-4">
          <div className="min-w-0 font-semibold text-ink">
            {left ?? (showLogo ? <Logo href="/inicio" size="sm" /> : null)}
          </div>
          <div className="shrink-0 text-xs text-ink-muted">{right}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-6 pb-12">{children}</main>
    </div>
  );
}
