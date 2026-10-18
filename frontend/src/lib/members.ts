// Integrantes de un proyecto: validación de lo que llega del formulario y redacción del
// historial de cambios. Sin dependencias de servidor: lo usan las acciones y las páginas.

import { normalizeUsername, usernameError } from "./auth";
import { TOTAL_BPS, bpsToPercent, percentToBps } from "./split";

export const MAX_MEMBERS = 20;
const MAX_ROLE = 60;

/** Fila del editor de integrantes, como la serializa MembersEditor. */
export type MemberInput = { username: string; role: string; pct: string; isAdmin: boolean };
export type ParsedMember = { username: string; role: string; share_bps: number; is_admin: boolean };

export function sharesError(bps: (number | null)[]): string | null {
  if (bps.some((b) => b === null || b < 1 || b > TOTAL_BPS)) {
    return "Cada porcentaje debe ser un número entre 0,01 y 100 (máximo dos decimales).";
  }
  const sum = (bps as number[]).reduce((a, b) => a + b, 0);
  if (sum !== TOTAL_BPS) {
    return `Los porcentajes deben sumar 100% (hoy suman ${bpsToPercent(sum)}%).`;
  }
  return null;
}

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Valida la lista completa de integrantes: @usuario válido y sin repetir, % que suman 100, algún admin. */
export function parseMembers(
  raw: unknown,
): { ok: true; members: ParsedMember[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length < 1) return { ok: false, error: "Agrega al menos un integrante." };
  if (raw.length > MAX_MEMBERS) {
    return { ok: false, error: `Máximo ${MAX_MEMBERS} integrantes por proyecto.` };
  }

  const members = (raw as Partial<Record<keyof MemberInput, unknown>>[]).map((m) => ({
    username: normalizeUsername(str(m?.username, 40)),
    role: str(m?.role, MAX_ROLE),
    share_bps: percentToBps(str(m?.pct, 10)),
    is_admin: m?.isAdmin === true,
  }));

  const seen = new Set<string>();
  for (const { username } of members) {
    if (!username) return { ok: false, error: "Escribe el @usuario de cada integrante." };
    if (usernameError(username)) {
      return { ok: false, error: `Revisa @${username}: no es un usuario válido.` };
    }
    if (seen.has(username)) return { ok: false, error: `@${username} está repetido en el proyecto.` };
    seen.add(username);
  }

  const shareErr = sharesError(members.map((m) => m.share_bps));
  if (shareErr) return { ok: false, error: shareErr };
  if (!members.some((m) => m.is_admin)) {
    return { ok: false, error: "Debe quedar al menos un admin en el proyecto." };
  }

  return { ok: true, members: members as ParsedMember[] };
}

/** Foto de un integrante tal como se guarda en share_changes.before / after. */
export type MemberSnapshot = {
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  share_bps: number;
  is_admin: boolean;
};

export type MemberChange =
  | { kind: "added" | "removed"; member: MemberSnapshot }
  | { kind: "share"; member: MemberSnapshot; from: number; to: number }
  | { kind: "role"; member: MemberSnapshot; from: string; to: string }
  | { kind: "admin"; member: MemberSnapshot; granted: boolean };

/** Cambios de `before` a `after`, en el orden de `after`; las salidas van al final. */
export function diffMembers(before: MemberSnapshot[], after: MemberSnapshot[]): MemberChange[] {
  const prev = new Map(before.map((m) => [m.user_id, m]));
  const next = new Set(after.map((m) => m.user_id));
  const changes: MemberChange[] = [];

  for (const member of after) {
    const old = prev.get(member.user_id);
    if (!old) {
      changes.push({ kind: "added", member });
      continue;
    }
    if (old.share_bps !== member.share_bps) {
      changes.push({ kind: "share", member, from: old.share_bps, to: member.share_bps });
    }
    if (old.role !== member.role) changes.push({ kind: "role", member, from: old.role, to: member.role });
    if (old.is_admin !== member.is_admin) changes.push({ kind: "admin", member, granted: member.is_admin });
  }
  for (const member of before) {
    if (!next.has(member.user_id)) changes.push({ kind: "removed", member });
  }
  return changes;
}

export function describeChange(change: MemberChange): string {
  const who = `${change.member.display_name} (@${change.member.username})`;
  switch (change.kind) {
    case "added": {
      const { role, share_bps, is_admin } = change.member;
      return [`Entró ${who} con ${bpsToPercent(share_bps)}%`, role && `como ${role}`, is_admin && "admin"]
        .filter(Boolean)
        .join(", ");
    }
    case "removed":
      return `Salió ${who}`;
    case "share":
      return `${who}: de ${bpsToPercent(change.from)}% a ${bpsToPercent(change.to)}%`;
    case "role":
      return change.to ? `${who}: rol «${change.to}»` : `${who}: sin rol`;
    case "admin":
      return change.granted ? `${who} ahora es admin` : `${who} ya no es admin`;
  }
}
