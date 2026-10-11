import type { ReactNode } from "react";
import { Logo } from "./Logo";

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
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-sm sm:my-6 sm:min-h-[844px] sm:rounded-[28px] sm:border sm:border-line sm:overflow-hidden">
      <div className="flex h-14 items-center justify-between px-5">
        <div className="text-sm font-semibold text-ink">
          {left ?? <span>9:41</span>}
        </div>
        <div className="text-xs text-ink-muted">
          {right ?? (showLogo ? <Logo href="/" size="sm" /> : <span>LTE</span>)}
        </div>
      </div>
      <div className="px-5 pb-10">{children}</div>
    </div>
  );
}
