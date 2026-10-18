"use client";

import { useState } from "react";
import { formatCop } from "@/lib/format";
import { TOTAL_BPS, percentToBps, splitAmount } from "@/lib/split";
import { Button, Input, ShareBar, shareColor } from "./ui";

export type MemberDraft = {
  key: string;
  id?: string;
  name: string;
  phone: string;
  role: string;
  pct: string;
};

const EXAMPLE_TOTAL = 1_000_000;

export function newMemberDraft(partial: Partial<MemberDraft> = {}): MemberDraft {
  const key = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return { key, name: "", phone: "", role: "", pct: "", ...partial };
}

/**
 * Filas editables de integrantes con su %. Serializa el estado en un input oculto `members`
 * para que la server action lo reciba como JSON.
 */
export function MembersEditor({
  initial,
  editablePhone,
  canAddRemove,
  maxMembers = 20,
}: {
  initial: MemberDraft[];
  editablePhone: boolean;
  canAddRemove: boolean;
  maxMembers?: number;
}) {
  const [members, setMembers] = useState(initial);

  const bps = members.map((m) => percentToBps(m.pct));
  const valid = bps.every((b): b is number => b !== null && b >= 1);
  const sum = bps.reduce<number>((acc, b) => acc + (b ?? 0), 0);
  const balanced = valid && sum === TOTAL_BPS;
  const preview = balanced
    ? splitAmount(
        EXAMPLE_TOTAL,
        members.map((m, i) => ({ id: m.key, shareBps: bps[i] as number })),
      )
    : null;

  function update(key: string, field: keyof MemberDraft, value: string) {
    setMembers((ms) => ms.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  }

  function splitEvenly() {
    const n = members.length;
    const base = Math.floor(TOTAL_BPS / n);
    const extra = TOTAL_BPS - base * n;
    setMembers((ms) =>
      ms.map((m, i) => ({ ...m, pct: String((base + (i < extra ? 1 : 0)) / 100) })),
    );
  }

  const payload = JSON.stringify(
    members.map(({ id, name, phone, role, pct }) => ({ id, name, phone, role, pct })),
  );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="members" value={payload} />

      <div className="hidden gap-3 px-1 text-xs font-semibold text-ink-muted md:grid md:grid-cols-[1.4fr_1.1fr_1fr_0.6fr_auto]">
        <span>Nombre</span>
        <span>Celular</span>
        <span>Rol</span>
        <span>%</span>
        <span className="w-8" />
      </div>

      <ul className="flex flex-col gap-3">
        {members.map((m, i) => (
          <li
            key={m.key}
            className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[1.4fr_1.1fr_1fr_0.6fr_auto] md:items-center md:gap-3 md:border-0 md:p-0"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: shareColor(i) }}
                aria-hidden
              />
              <Input
                aria-label={`Nombre del integrante ${i + 1}`}
                placeholder="Nombre"
                value={m.name}
                onChange={(e) => update(m.key, "name", e.target.value)}
                required
              />
            </div>
            <Input
              aria-label={`Celular del integrante ${i + 1}`}
              placeholder="300 555 0142"
              inputMode="tel"
              value={m.phone}
              onChange={(e) => update(m.key, "phone", e.target.value)}
              readOnly={!editablePhone}
              required
            />
            <Input
              aria-label={`Rol del integrante ${i + 1}`}
              placeholder="Guitarra, sonido…"
              value={m.role}
              onChange={(e) => update(m.key, "role", e.target.value)}
            />
            <div className="relative">
              <Input
                aria-label={`Porcentaje del integrante ${i + 1}`}
                placeholder="0"
                inputMode="decimal"
                value={m.pct}
                onChange={(e) => update(m.key, "pct", e.target.value)}
                className="pr-7 text-right"
                required
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">
                %
              </span>
            </div>
            {canAddRemove ? (
              <button
                type="button"
                onClick={() => setMembers((ms) => ms.filter((x) => x.key !== m.key))}
                disabled={members.length === 1}
                className="h-8 w-8 justify-self-end rounded-lg text-lg text-ink-muted hover:bg-bg-soft disabled:opacity-30"
                aria-label={`Quitar integrante ${i + 1}`}
              >
                ×
              </button>
            ) : (
              <span className="hidden w-8 md:block" />
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {canAddRemove ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMembers((ms) => [...ms, newMemberDraft()])}
            disabled={members.length >= maxMembers}
            className="py-2.5 text-sm"
          >
            + Agregar integrante
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={splitEvenly} className="py-2.5 text-sm">
          Repartir en partes iguales
        </Button>
      </div>

      <div className="rounded-xl bg-bg-soft p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Total</span>
          <span
            className={`font-display text-xl font-bold ${balanced ? "text-success" : "text-warn"}`}
            aria-live="polite"
          >
            {(sum / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })}% / 100%
          </span>
        </div>
        <ShareBar shares={members.map((m, i) => ({ label: m.name || `#${i + 1}`, bps: bps[i] ?? 0 }))} />
        {!valid ? (
          <p className="mt-2 text-xs text-warn">
            Usa números entre 0,01 y 100, con máximo dos decimales.
          </p>
        ) : !balanced ? (
          <p className="mt-2 text-xs text-warn">
            {sum < TOTAL_BPS
              ? `Faltan ${((TOTAL_BPS - sum) / 100).toLocaleString("es-CO")} puntos para llegar a 100%.`
              : `Te pasaste por ${((sum - TOTAL_BPS) / 100).toLocaleString("es-CO")} puntos.`}
          </p>
        ) : null}
        {preview ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-xs text-ink-muted">
              Si les pagan {formatCop(EXAMPLE_TOTAL)}, cada uno recibe:
            </p>
            <ul className="mt-2 grid gap-1 text-[13px] sm:grid-cols-2 sm:gap-x-10">
              {preview.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate text-ink-muted">{members[i].name || `Integrante ${i + 1}`}</span>
                  <span className="font-semibold text-ink">{formatCop(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
