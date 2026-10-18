import "server-only";
import { Keypair } from "@stellar/stellar-sdk";
import { xlmToStroops } from "@/lib/money";
import { inFlightTxDecision } from "@/lib/payments";
import {
  FINAL_STATUSES,
  anchorTransition,
  parseAnchorMemo,
  parseDestination,
  sendingResolution,
  type WithdrawalStatus,
} from "@/lib/withdrawals";
import { getWithdrawTransaction, type AnchorTransaction } from "./anchor";
import { decryptSecret } from "./crypto";
import { db, type WithdrawalRow } from "./db";
import { TxError, lookupTransaction, sendNative } from "./stellar";

// Retiros: el envío sigue la misma regla que los pagos (hash guardado antes de enviar y
// reconciliación con Horizon). Los de banco además siguen el estado del anchor (SEP-24).
// Los mensajes en withdrawals.error se muestran tal cual: sin jerga.

const NOT_SENT = "No se descontó nada de tu saldo.";

export async function userKeypair(userId: string): Promise<Keypair> {
  const { data, error } = await db()
    .from("users")
    .select("stellar_secret_enc")
    .eq("id", userId)
    .single<{ stellar_secret_enc: string }>();
  if (error || !data) throw new Error(`No se pudo leer la cuenta de ${userId}: ${error?.message}`);
  return Keypair.fromSecret(decryptSecret(data.stellar_secret_enc));
}

/** Actualiza el retiro si sigue en `from`. Devuelve true si cambió. */
async function update(
  id: string,
  from: WithdrawalStatus | WithdrawalStatus[],
  patch: Partial<WithdrawalRow>,
): Promise<boolean> {
  const { data, error } = await db()
    .from("withdrawals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", Array.isArray(from) ? from : [from])
    .select("id");
  if (error) throw new Error(`No se pudo actualizar el retiro ${id}: ${error.message}`);
  return !!data?.length;
}

function sendErrorMessage(err: unknown): string {
  const codes = err instanceof TxError ? err.codes : [];
  if (codes.some((c) => c === "op_underfunded" || c === "tx_insufficient_balance")) {
    return `Tu saldo no alcanzó para el retiro. ${NOT_SENT}`;
  }
  if (codes.includes("op_no_destination")) return `Esa cuenta no existe en la red. ${NOT_SENT}`;
  if (codes.includes("op_already_exists")) return `Esa cuenta ya existe. ${NOT_SENT} Intenta de nuevo.`;
  return `La red no aceptó el retiro. ${NOT_SENT} Intenta de nuevo en un momento.`;
}

/**
 * Envía el XLM de un retiro ya reclamado (status 'sending'). Devuelve el estado en que quedó
 * y, si no salió, el mensaje para mostrar.
 */
export async function sendWithdrawal(w: WithdrawalRow, kp: Keypair): Promise<{ status: WithdrawalStatus; error?: string }> {
  try {
    if (!w.destination || !w.amount_stroops) throw new Error("Retiro sin destino o monto");
    const memo = w.memo && w.memo_type ? { type: w.memo_type, value: w.memo } : null;
    const hash = await sendNative({
      sourceSecret: kp.secret(),
      destination: w.destination,
      amountStroops: BigInt(w.amount_stroops),
      createAccount: w.creates_account,
      memo,
      onSigned: async ({ hash, deadline }) => {
        const saved = await update(w.id, "sending", { stellar_tx_hash: hash, tx_deadline: deadline.toISOString() });
        if (!saved) throw new Error("El retiro dejó de estar en envío");
      },
    });
    const status = w.kind === "banco" ? "processing" : "completed";
    // Si esto falla queda 'sending' con su hash y se confirma al reconciliar.
    await update(w.id, "sending", { status, stellar_tx_hash: hash, tx_deadline: null, error: null });
    return { status };
  } catch (err) {
    console.error(`Retiro ${w.id} fallido:`, err);
    if (err instanceof TxError && err.uncertain) {
      await update(w.id, "sending", { error: "Estamos confirmando el envío con la red." }).catch(() => {});
      return { status: "sending" };
    }
    // Rechazado o nunca enviado: seguro no salió. Al banco se le puede volver a intentar.
    const error = sendErrorMessage(err);
    const status = w.kind === "banco" ? "ready" : "failed";
    await update(w.id, "sending", { status, stellar_tx_hash: null, tx_deadline: null, error });
    return { status, error };
  }
}

/** Datos que el anchor dicta para pagarle (cuenta, memo, monto, comisión). null si no sirven. */
function anchorPaymentDetails(tx: AnchorTransaction): Partial<WithdrawalRow> | null {
  const destination = parseDestination(tx.withdraw_anchor_account ?? "");
  const memo = parseAnchorMemo(tx.withdraw_memo, tx.withdraw_memo_type);
  let amount: bigint;
  let fee: bigint;
  try {
    amount = xlmToStroops(tx.amount_in ?? "");
    fee = xlmToStroops(tx.fee_details?.total ?? tx.amount_fee ?? "0");
  } catch {
    return null;
  }
  if (!destination.ok || !memo || amount <= 0n) return null;
  return {
    destination: destination.value,
    memo: memo.value,
    memo_type: memo.type,
    amount_stroops: Number(amount),
    fee_stroops: Number(fee),
  };
}

function anchorFailureMessage(current: WithdrawalStatus, tx: AnchorTransaction): string {
  if (current !== "processing") return `El banco canceló el retiro. ${NOT_SENT}`;
  return tx.refunded
    ? "El banco no completó el retiro y te devolvió el dinero."
    : "El banco no pudo completar el retiro. Si el dinero no vuelve a tu saldo, escríbenos.";
}

/**
 * Pone al día un retiro: confirma o revierte el envío en vuelo (Horizon) y, si es de banco,
 * sigue el estado del anchor. Idempotente; devuelve true si cambió algo.
 */
export async function syncWithdrawal(w: WithdrawalRow): Promise<boolean> {
  if (FINAL_STATUSES.includes(w.status)) return false;

  if (w.status === "sending") {
    const lookup = w.stellar_tx_hash ? await lookupTransaction(w.stellar_tx_hash) : null;
    // 'since' = cuándo se reclamó para enviar (updated_at), no cuándo se creó el retiro.
    const decision = inFlightTxDecision(
      { hash: w.stellar_tx_hash, deadline: w.tx_deadline, since: w.updated_at },
      lookup,
      new Date(),
    );
    const next = sendingResolution(w.kind, decision);
    if (!next) return false;
    return update(
      w.id,
      "sending",
      decision === "confirm"
        ? { status: next, tx_deadline: null, error: null }
        : { status: next, stellar_tx_hash: null, tx_deadline: null, error: `El envío no se completó. ${NOT_SENT}` },
    );
  }

  if (w.kind !== "banco" || !w.anchor_tx_id) return false;
  const tx = await getWithdrawTransaction(await userKeypair(w.user_id), w.anchor_tx_id);
  const next = anchorTransition(w.status, tx.status);
  if (!next) {
    return tx.status !== w.anchor_status ? update(w.id, w.status, { anchor_status: tx.status }) : false;
  }
  if (next === "ready") {
    const details = anchorPaymentDetails(tx);
    if (!details) {
      console.error(`Datos de pago del anchor inválidos (retiro ${w.id}):`, tx);
      return update(w.id, w.status, {
        status: "failed",
        anchor_status: tx.status,
        error: `El banco de prueba envió datos que no reconocemos. ${NOT_SENT}`,
      });
    }
    return update(w.id, w.status, { ...details, status: "ready", anchor_status: tx.status, error: null });
  }
  return update(w.id, w.status, {
    status: next,
    anchor_status: tx.status,
    error: next === "failed" ? anchorFailureMessage(w.status, tx) : null,
  });
}

/** Sincroniza varios retiros (p. ej. los de una página). true si alguno cambió. */
export async function syncWithdrawals(withdrawals: WithdrawalRow[]): Promise<boolean> {
  const results = await Promise.all(
    withdrawals
      .filter((w) => !FINAL_STATUSES.includes(w.status))
      .map((w) =>
        syncWithdrawal(w).catch((err) => {
          console.error(`No se pudo sincronizar el retiro ${w.id}:`, err);
          return false;
        }),
      ),
  );
  return results.some(Boolean);
}
