import type { Lote } from "@/lib/domain/types";
import { lotes as seedLotes } from "@/lib/mock";

/**
 * Store en memoria para Fase 0–2.
 * En proceso de Node (dev) sobrevive entre requests del mismo server.
 * Luego: SQLite/Postgres + SDP.
 */

const globalStore = globalThis as typeof globalThis & {
  __orillaLotes?: Map<string, Lote>;
};

function orgIdFor(loteId: string, orgName: string): string {
  if (loteId.startsWith("carnaval") || orgName.includes("Carnaval")) {
    return "org-carnaval";
  }
  return "org-dann";
}

function seed(): Map<string, Lote> {
  const map = new Map<string, Lote>();
  for (const l of seedLotes) {
    map.set(l.id, {
      ...l,
      orgId: orgIdFor(l.id, l.org),
      estado: l.estado,
    });
  }
  return map;
}

export function getLotesStore(): Map<string, Lote> {
  if (!globalStore.__orillaLotes) {
    globalStore.__orillaLotes = seed();
  }
  return globalStore.__orillaLotes;
}

export function listLotes(orgId?: string): Lote[] {
  const all = Array.from(getLotesStore().values());
  if (!orgId) return all;
  return all.filter((l) => l.orgId === orgId);
}

export function getLoteById(id: string): Lote | undefined {
  return getLotesStore().get(id);
}

export function saveLote(lote: Lote): Lote {
  getLotesStore().set(lote.id, lote);
  return lote;
}
