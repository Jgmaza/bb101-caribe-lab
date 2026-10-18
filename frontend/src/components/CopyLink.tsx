"use client";

import { useState } from "react";

/** Copia la URL absoluta de `path` al portapapeles. */
export function CopyLink({ path, label = "Copiar link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center rounded-[10px] border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink cursor-pointer transition hover:border-blue hover:bg-bg-soft hover:text-blue focus-visible:ring-2 focus-visible:ring-blue focus-visible:outline-none"
    >
      <span aria-live="polite">{copied ? "¡Copiado!" : label}</span>
    </button>
  );
}
