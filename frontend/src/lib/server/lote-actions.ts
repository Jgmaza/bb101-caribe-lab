"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  detectColumns,
  detectMode,
  mapRows,
  parseSpreadsheetText,
  validateLote,
  type LoteMode,
  type ParsedRow,
} from "@/lib/excel";
import { parseCop } from "@/lib/money";
import { disburseLote } from "./disburse";
import { db } from "./db";
import { requireUser } from "./session";

export type FormState = { error: string | null };

function text(v: unknown, max = 120) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function searchUsers(query: string): Promise<{ username: string; display_name: string }[]> {
  await requireUser("/lotes");
  const q = query.trim().replace(/^@/, "").toLowerCase().slice(0, 20);
  if (q.length < 1) return [];
  const { data } = await db()
    .from("users")
    .select("username, display_name")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(8);
  return data ?? [];
}

export async function createLoteFromUpload(
  _prev: FormState & { loteId?: string },
  formData: FormData,
): Promise<FormState & { loteId?: string }> {
  const user = await requireUser("/lotes/nuevo");
  const name = text(formData.get("name")) || "Lote sin nombre";
  const notes = text(formData.get("notes"), 500);
  const modeRaw = text(formData.get("mode")) as LoteMode;
  const totalRaw = text(formData.get("total_cop"), 20);
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Sube un archivo CSV (desde Excel: Guardar como CSV)." };
  }
  if (file.size > 1_500_000) return { error: "El archivo es demasiado grande (máx. 1,5 MB)." };

  const textContent = await file.text();
  const { headers, rows } = parseSpreadsheetText(textContent);
  if (!headers.length) return { error: "No pudimos leer columnas en el archivo." };

  const map = detectColumns(headers);
  const mode: LoteMode = modeRaw === "percent" || modeRaw === "amounts" ? modeRaw : detectMode(map);
  const totalCop = mode === "percent" ? parseCop(totalRaw) : null;
  const parsed = mapRows(rows, map, mode).filter((r) => r.username || r.displayName || r.phone);
  const errors = validateLote(parsed, mode, totalCop);
  if (errors.length) return { error: errors.join(" ") };

  const matched = await attachUsers(parsed);

  const { data: lote, error } = await db()
    .from("lotes")
    .insert({
      owner_id: user.id,
      name,
      mode,
      total_cop: totalCop,
      status: "draft",
      notes,
    })
    .select("id")
    .single();
  if (error || !lote) return { error: "No pudimos crear el lote." };

  const { error: itemsErr } = await db().from("lote_items").insert(
    matched.map((r) => ({
      lote_id: lote.id,
      user_id: r.userId,
      username: r.username || null,
      display_name: r.displayName,
      phone: r.phone,
      role: r.role,
      amount_cop: r.amountCop,
      share_bps: r.shareBps,
      status: "pending",
    })),
  );
  if (itemsErr) {
    await db().from("lotes").delete().eq("id", lote.id);
    return { error: "No pudimos guardar las filas del Excel." };
  }

  redirect(`/lotes/${lote.id}`);
}

async function attachUsers(rows: ParsedRow[]) {
  const names = [...new Set(rows.map((r) => r.username).filter(Boolean))];
  const { data: users } = names.length
    ? await db().from("users").select("id, username").in("username", names)
    : { data: [] as { id: string; username: string }[] };
  const by = new Map((users ?? []).map((u) => [u.username, u.id]));
  return rows.map((r) => ({ ...r, userId: r.username ? by.get(r.username) ?? null : null }));
}

export async function scheduleLote(loteId: string): Promise<FormState> {
  const user = await requireUser(`/lotes/${loteId}`);
  const { data: lote } = await db().from("lotes").select("owner_id, status").eq("id", loteId).maybeSingle();
  if (!lote || lote.owner_id !== user.id) return { error: "Lote no encontrado." };
  if (lote.status !== "draft" && lote.status !== "scheduled") {
    return { error: "Este lote ya no se puede programar." };
  }
  await db()
    .from("lotes")
    .update({ status: "scheduled", scheduled_for: new Date().toISOString() })
    .eq("id", loteId);
  refresh();
  return { error: null };
}

export async function closeLoteNight(loteId: string): Promise<FormState> {
  const user = await requireUser(`/lotes/${loteId}`);
  const result = await disburseLote(loteId, user.id);
  if (!result.ok) return { error: result.error };
  redirect(`/lotes/${loteId}?cerrado=1`);
}
