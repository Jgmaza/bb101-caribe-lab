import "server-only";
import { copToStroops } from "@/lib/money";
import { splitAmount } from "@/lib/split";
import { decryptSecret } from "./crypto";
import { db } from "./db";
import { getCopPerXlm } from "./price";
import { friendbotTopUp, getAvailableStroops, payMany } from "./stellar";

/**
 * Interfaz de dispersión de un lote.
 * Hoy: Horizon/SDK (payMany). Mañana: SDP detrás de la misma firma.
 */
export async function disburseLote(loteId: string, ownerId: string): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const { data: lote, error: loteErr } = await db().from("lotes").select("*").eq("id", loteId).maybeSingle();
  if (loteErr || !lote) return { ok: false, error: "El lote no existe." };
  if (lote.owner_id !== ownerId) return { ok: false, error: "Solo quien creó el lote puede cerrarlo." };
  if (lote.status === "closed") return { ok: false, error: "Este lote ya está cerrado." };
  if (lote.status === "closing") return { ok: false, error: "Ya se está cerrando este lote." };

  const { data: items, error: itemsErr } = await db()
    .from("lote_items")
    .select("*")
    .eq("lote_id", loteId)
    .order("created_at", { ascending: true });
  if (itemsErr || !items?.length) return { ok: false, error: "El lote no tiene personas." };
  if (items.length > 40) return { ok: false, error: "Máximo 40 personas por lote en este MVP." };

  const usernames = [...new Set(items.map((i) => i.username).filter(Boolean))] as string[];
  const { data: users } = await db()
    .from("users")
    .select("id, username, stellar_public_key")
    .in("username", usernames);
  const byUser = new Map((users ?? []).map((u) => [u.username, u]));

  for (const item of items) {
    const u = item.username ? byUser.get(item.username) : null;
    if (!u) {
      return {
        ok: false,
        error: `@${item.username || "?"} no tiene cuenta en Orilla. Pídele que se registre antes de cerrar.`,
      };
    }
    if (item.user_id !== u.id) {
      await db().from("lote_items").update({ user_id: u.id }).eq("id", item.id);
      item.user_id = u.id;
    }
  }

  let splits: { itemId: string; publicKey: string; amountStroops: bigint; amountCop: number }[];
  try {
    const copPerXlm = await getCopPerXlm();
    if (lote.mode === "percent") {
      const total = Number(lote.total_cop);
      if (!total || total <= 0) return { ok: false, error: "Falta el total del lote." };
      const parts = splitAmount(
        BigInt(total),
        items.map((i) => ({ id: i.id, shareBps: i.share_bps as number })),
      );
      splits = parts.map((p) => {
        const item = items.find((i) => i.id === p.id)!;
        const u = byUser.get(item.username!)!;
        const amountCop = Number(p.amount);
        return {
          itemId: item.id,
          publicKey: u.stellar_public_key,
          amountStroops: copToStroops(amountCop, copPerXlm),
          amountCop,
        };
      });
    } else {
      splits = items.map((item) => {
        const u = byUser.get(item.username!)!;
        const amountCop = Number(item.amount_cop);
        return {
          itemId: item.id,
          publicKey: u.stellar_public_key,
          amountStroops: copToStroops(amountCop, copPerXlm),
          amountCop,
        };
      });
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const totalStroops = splits.reduce((a, s) => a + s.amountStroops, 0n);
  if (totalStroops <= 0n) return { ok: false, error: "El total a pagar es 0." };

  const { data: owner, error: ownerErr } = await db()
    .from("users")
    .select("stellar_public_key, stellar_secret_enc")
    .eq("id", ownerId)
    .single();
  if (ownerErr || !owner) return { ok: false, error: "No encontramos tu cuenta." };

  await db().from("lotes").update({ status: "closing", error: null }).eq("id", loteId);

  try {
    const available = await getAvailableStroops(owner.stellar_public_key);
    const need = totalStroops;
    if (available === null || available < need) {
      await friendbotTopUp(owner.stellar_public_key, need - (available ?? 0n) + 5_000_000n);
    }

    const secret = decryptSecret(owner.stellar_secret_enc);
    const txHash = await payMany({
      payerSecret: secret,
      splits: splits.map((s) => ({ publicKey: s.publicKey, amountStroops: s.amountStroops })),
      memo: `orilla lote ${loteId.slice(0, 8)}`,
    });

    for (const s of splits) {
      await db()
        .from("lote_items")
        .update({ status: "paid", amount_cop: s.amountCop, error: null })
        .eq("id", s.itemId);
    }
    await db()
      .from("lotes")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        distribution_tx_hash: txHash,
        error: null,
      })
      .eq("id", loteId);

    return { ok: true, txHash };
  } catch (err) {
    const message = (err as Error).message || "No se pudo cerrar la noche.";
    await db().from("lotes").update({ status: "failed", error: message }).eq("id", loteId);
    await db().from("lote_items").update({ status: "failed", error: message }).eq("lote_id", loteId);
    return { ok: false, error: message };
  }
}
