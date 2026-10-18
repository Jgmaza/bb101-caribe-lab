"use client";

import { useState } from "react";
import { formatCop } from "@/lib/format";
import { MAX_MEMBERS } from "@/lib/members";
import { TOTAL_BPS, percentToBps, splitAmount } from "@/lib/split";
import { Button, Input, ShareBar, shareColor } from "./ui";

export type MemberDraft = {
  key: string;
  username: string;
  /** Nombre visible de quien ya es integrante (su @usuario no se edita). */
  displayName?: string;
  role: string;
  pct: string;
  isAdmin: boolean;
  /** No se puede quitar ni dejar de ser admin (quien crea el proyecto). */
  locked?: boolean;
};

const EXAMPLE_TOTAL = 1_000_000;

export function newMemberDraft(partial: Partial<MemberDraft> = {}): MemberDraft {
  const key = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return { key, username: "", role: "", pct: "", isAdmin: false, ...partial };
}

/**
 * Filas editables de integrantes (@usuario, rol, %, admin). Serializa el estado en un input
 * oculto `members` para que la server action lo reciba como JSON.
 */
export function MembersEditor({ initial }: { initial: MemberDraft[] }) {
  const [members, setMembers] = useState(initial);

  const bps = members.map((m) => percentToBps(m.pct));
  const valid = bps.every((b): b is number => b !== null && b >= 1);
  const sum = bps.reduce<number>((acc, b) => acc + (b ?? 0), 0);
  const balanced = valid && sum === TOTAL_BPS;
  const hasAdmin = members.some((m) => m.isAdmin);
  const preview = balanced
    ? splitAmount(
        BigInt(EXAMPLE_TOTAL),
        members.map((m, i) => ({ id: m.key, shareBps: bps[i] as number })),
      )
    : null;
  const label = (m: MemberDraft, i: number) =>
    m.displayName ?? (m.username ? `@${m.username.replace(/^@/, "")}` : `Integrante ${i + 1}`);

  function update<K extends keyof MemberDraft>(key: string, field: K, value: MemberDraft[K]) {
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
    members.map(({ username, role, pct, isAdmin }) => ({ username, role, pct, isAdmin })),
  );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="members" value={payload} />

      <div className="hidden gap-3 px-1 text-xs font-semibold text-ink-muted md:grid md:grid-cols-[1.5fr_1.1fr_0.6fr_0.5fr_auto]">
        <span>Integrante</span>
        <span>Rol</span>
        <span>%</span>
        <span>Admin</span>
        <span className="w-8" />
      </div>

      <ul className="flex flex-col gap-3">
        {members.map((m, i) => (
          <li
            key={m.key}
            className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[1.5fr_1.1fr_0.6fr_0.5fr_auto] md:items-center md:gap-3 md:border-0 md:p-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: shareColor(i) }}
                aria-hidden
              />
              {m.displayName ? (
                <p className="min-w-0 truncate py-3 text-sm">
                  <span className="font-semibold text-ink">{m.displayName}</span>{" "}
                  <span className="text-ink-muted">@{m.username}</span>
                </p>
              ) : (
                <div className="relative w-full">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-ink-muted">
                    @
                  </span>
                  <Input
                    aria-label={`Usuario del integrante ${i + 1}`}
                    placeholder="usuario"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={m.username}
                    onChange={(e) => update(m.key, "username", e.target.value.replace(/^@/, ""))}
                    className="pl-7"
                    required
                  />
                </div>
              )}
            </div>
            <Input
              aria-label={`Rol del integrante ${i + 1}`}
              placeholder="Guitarra, sonido…"
              value={m.role}
              maxLength={60}
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
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink has-disabled:cursor-not-allowed">
              <input
                type="checkbox"
                checked={m.isAdmin}
                disabled={m.locked}
                onChange={(e) => update(m.key, "isAdmin", e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-blue disabled:cursor-not-allowed"
                aria-label={`${label(m, i)} es admin`}
              />
              <span className="md:hidden">Admin</span>
            </label>
            <button
              type="button"
              onClick={() => setMembers((ms) => ms.filter((x) => x.key !== m.key))}
              disabled={members.length === 1 || m.locked}
              className="h-8 w-8 justify-self-end rounded-lg cursor-pointer text-lg text-ink-muted transition hover:bg-bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
              aria-label={`Quitar a ${label(m, i)}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMembers((ms) => [...ms, newMemberDraft()])}
          disabled={members.length >= MAX_MEMBERS}
          className="py-2.5 text-sm"
        >
          + Agregar integrante
        </Button>
        <Button type="button" variant="ghost" onClick={splitEvenly} className="py-2.5 text-sm">
          Repartir en partes iguales
        </Button>
      </div>
      <p className="-mt-2 text-xs text-ink-muted">
        Cada integrante necesita una cuenta en Orilla. Los admins pueden cambiar los
        porcentajes, los roles y quién está en el proyecto.
      </p>

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
        <ShareBar shares={members.map((m, i) => ({ label: label(m, i), bps: bps[i] ?? 0 }))} />
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
        {!hasAdmin ? (
          <p className="mt-2 text-xs text-warn">Debe quedar al menos un admin.</p>
        ) : null}
        {preview ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-xs text-ink-muted">
              Si les pagan {formatCop(EXAMPLE_TOTAL)}, cada uno recibe:
            </p>
            <ul className="mt-2 grid gap-1 text-[13px] sm:grid-cols-2 sm:gap-x-10">
              {preview.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate text-ink-muted">{label(members[i], i)}</span>
                  <span className="font-semibold text-ink">{formatCop(Number(p.amount))}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
