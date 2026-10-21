"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  detectColumns,
  detectMode,
  parseSpreadsheetFile,
  reviewLote,
  spreadsheetFileError,
  type LoteMode,
  type ParsedRow,
} from "@/lib/excel";
import { parseCop } from "@/lib/money";
import { disburseLote } from "./disburse";
import { db } from "./db";
import { requireUser } from "./session";

export type FormState = { error: string | null };

/** Solo consulta destinatarios; nunca crea cuentas ni envía pagos. */
export async function checkLoteRecipients(usernames: string[]): Promise<{
  error: string | null;
  registered: string[];
}> {
  await requireUser("/lotes/nuevo");
  if (!Array.isArray(usernames) || !usernames.length || usernames.length > 40 ||
      usernames.some((name) => typeof name !== "string" || !/^[a-z0-9_]{3,20}$/.test(name))) {
    return { error: "Corrige los usuarios del archivo antes de comprobar sus cuentas.", registered: [] };
  }
  const { data, error } = await db().from("users").select("username").in("username", usernames);
  if (error) return { error: "No pudimos comprobar las cuentas Orilla. Intenta de nuevo.", registered: [] };
  return { error: null, registered: (data ?? []).map((u) => u.username) };
}

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
    return { error: "Sube el Excel (.xlsx) o un CSV UTF-8." };
  }
  const fileError = spreadsheetFileError(file);
  if (fileError) return { error: fileError };

  let headers: string[];
  let rows: Record<string, string>[];
  try {
    ({ headers, rows } = await parseSpreadsheetFile(file));
  } catch {
    return { error: "No pudimos leer ese Excel/CSV. Usa la plantilla del Entregable 4." };
  }
  if (!headers.length) return { error: "No pudimos leer columnas en el archivo." };

  const map = detectColumns(headers);
  const mode: LoteMode = modeRaw === "percent" || modeRaw === "amounts" ? modeRaw : detectMode(map);
  const totalCop = mode === "percent" ? parseCop(totalRaw) : null;
  const { rows: parsed, errors } = reviewLote(headers, rows, mode, totalCop);
  if (errors.length) {
    const details = parsed.filter((r) => r.errors.length)
      .map((r) => `Fila ${r.row}: ${r.errors.join(" · ")}`);
    return { error: [...errors, ...details].join(" ") };
  }

  const matched = await attachUsers(parsed);
  if (matched.error) return { error: matched.error };
  const missing = matched.rows.filter((r) => !r.userId);
  if (missing.length) {
    return { error: `Sin cuenta Orilla: ${missing.map((r) => `@${r.username} (fila ${r.row})`).join(", ")}. Corrige el usuario o pide que se registre y vuelve a comprobar.` };
  }

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
    matched.rows.map((r) => ({
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
  const { data: users, error } = names.length
    ? await db().from("users").select("id, username").in("username", names)
    : { data: [] as { id: string; username: string }[], error: null };
  const by = new Map((users ?? []).map((u) => [u.username, u.id]));
  return {
    error: error ? "No pudimos comprobar las cuentas Orilla. Intenta de nuevo." : null,
    rows: rows.map((r) => ({ ...r, userId: r.username ? by.get(r.username) ?? null : null })),
  };
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
