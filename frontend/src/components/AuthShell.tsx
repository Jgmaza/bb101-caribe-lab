import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Marco centrado para registro e ingreso. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Logo href="/" />
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
