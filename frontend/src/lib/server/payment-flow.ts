import "server-only";
import { inFlightHash, reconcileDecision, topUpShortfall } from "@/lib/payments";
import { splitAmount } from "@/lib/split";
import { decryptSecret } from "./crypto";
import { db, type PaymentRow, type ProjectRow } from "./db";
import {
  TxError,
  distribute,
  ensureUsdcTrustline,
  getAvailableStroops,
  lookupTransaction,
  payToProject,
  usdcTopUp,
  type TopupRound,
} from "./stellar";

// Pago → reparto, con el hash de cada transacción guardado ANTES de enviarla (ver lib/payments.ts).
// Los mensajes en payments.error se muestran tal cual a quien paga y a los integrantes: sin
// jerga. El detalle técnico va al log del servidor.

const PAYMENT_NOT_SENT = "No se descontó nada de tu saldo.";
const MONEY_SAFE = "El dinero está seguro en la cuenta del proyecto.";

export function memoFor(paymentId: string) {
  return `orilla ${paymentId.slice(0, 8)}`;
}

export async function recordTopup(
  userId: string,
  round: TopupRound,
  copPerXlm: number,
  paymentId: string | null = null,
) {
  const { error } = await db().from("topups").insert({
    user_id: userId,
    amount_stroops: round.amountStroops.toString(),
    cop_per_xlm: copPerXlm,
    tx_hash: round.txHash,
    source: "prueba",
    payment_id: paymentId,
  });
  if (error) throw new Error(`La recarga ${round.txHash} llegó pero no se pudo registrar: ${error.message}`);
}

function paymentErrorMessage(err: unknown): string {
  if (err instanceof TxError && err.codes.some((c) => c === "op_underfunded" || c === "tx_insufficient_balance")) {
    return `Tu saldo no alcanzó para el pago. ${PAYMENT_NOT_SENT}`;
  }
  return `La red no aceptó el pago. ${PAYMENT_NOT_SENT} Intenta de nuevo en un momento.`;
}

function distributionErrorMessage(err: unknown): string {
  if (err instanceof TxError && err.codes.includes("op_no_destination")) {
    return `La cuenta de un integrante todavía no está activa, así que no se pudo repartir. ${MONEY_SAFE}`;
  }
  return `No se pudo repartir el pago. ${MONEY_SAFE}`;
}

async function failPayment(paymentId: string, error: string) {
  await db()
    .from("payments")
    .update({ status: "failed", payment_tx_hash: null, tx_deadline: null, error })
    .eq("id", paymentId)
    .eq("status", "pending");
}

export type PaymentOutcome = { kind: "paid" } | { kind: "uncertain" } | { kind: "failed"; error: string };

/**
 * Lleva un pago "pending" hasta "received": recarga lo que falte (rondas en `topups`) y paga a
 * la cuenta del proyecto. No reparte: eso es runDistribution.
 */
export async function executePayment(opts: {
  payment: PaymentRow;
  payer: { id: string; publicKey: string; secretEnc: string };
  projectPublicKey: string;
  projectSecretEnc: string;
}): Promise<PaymentOutcome> {
  const { payment, payer } = opts;
  const fail = async (error: string): Promise<PaymentOutcome> => {
    await failPayment(payment.id, error);
    return { kind: "failed", error };
  };

  // 1) Trustlines USDC + recarga automática si el saldo no alcanza.
  const payerSecret = decryptSecret(payer.secretEnc);
  try {
    await ensureUsdcTrustline(payerSecret);
    await ensureUsdcTrustline(decryptSecret(opts.projectSecretEnc));
  } catch (err) {
    console.error(`Trustline USDC fallida (pago ${payment.id}):`, err);
    return fail(`No pudimos preparar tu cuenta para USDC. ${PAYMENT_NOT_SENT} Intenta de nuevo en un momento.`);
  }
  const available = await getAvailableStroops(payer.publicKey);
  if (available === null) return fail("No pudimos consultar tu saldo. Intenta de nuevo en un momento.");
  const shortfall = topUpShortfall(available, BigInt(payment.amount_stroops));
  if (shortfall > 0n) {
    try {
      await usdcTopUp(payerSecret, shortfall, async (round) => {
        // La plata ya llegó: si el registro falla, el pago sigue (queda en el log).
        await recordTopup(payer.id, round, payment.cop_per_xlm, payment.id).catch((err) =>
          console.error(err),
        );
        await db().from("payments").update({ topup_tx_hash: round.txHash }).eq("id", payment.id);
      });
    } catch (err) {
      console.error(`Recarga automática fallida (pago ${payment.id}):`, err);
      return fail(`No pudimos recargar tu saldo, así que el pago no salió. ${PAYMENT_NOT_SENT} Intenta de nuevo en un momento.`);
    }
  }

  // 2) Quien paga → cuenta del proyecto. El hash queda guardado antes de enviar.
  try {
    const hash = await payToProject({
      payerSecret,
      projectPublicKey: opts.projectPublicKey,
      amountStroops: BigInt(payment.amount_stroops),
      memo: memoFor(payment.id),
      onSigned: async ({ hash, deadline }) => {
        const { error } = await db()
          .from("payments")
          .update({ payment_tx_hash: hash, tx_deadline: deadline.toISOString() })
          .eq("id", payment.id)
          .eq("status", "pending");
        if (error) throw new Error(`No se pudo guardar el pago antes de enviarlo: ${error.message}`);
      },
    });
    // Si esto falla, el pago queda "pending" con su hash y se confirma al reconciliar.
    await db()
      .from("payments")
      .update({ status: "received", payment_tx_hash: hash, tx_deadline: null, error: null })
      .eq("id", payment.id);
    return { kind: "paid" };
  } catch (err) {
    console.error(`Pago ${payment.id} fallido:`, err);
    if (err instanceof TxError && err.uncertain) {
      await db()
        .from("payments")
        .update({ error: "Estamos confirmando tu pago con la red." })
        .eq("id", payment.id);
      return { kind: "uncertain" };
    }
    // Rechazado por Stellar, o no se llegó a enviar: seguro no salió.
    return fail(paymentErrorMessage(err));
  }
}

export type DistributionOutcome = "distributed" | "failed" | "uncertain" | "busy";

/** Otro proceso ya reclamó el pago para repartirlo. */
class BusyError extends Error {}

/**
 * Cuenta del proyecto → integrantes, con los % vigentes. begin_distribution reclama el pago y
 * escribe el reparto antes de enviarlo; si otro proceso ya lo tiene, devuelve "busy".
 */
export async function runDistribution(paymentId: string): Promise<DistributionOutcome> {
  let begun = false;
  try {
    const { data: payment, error: payErr } = await db()
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single<PaymentRow>();
    if (payErr || !payment) throw new Error(payErr?.message ?? "Pago no encontrado");
    if (payment.status !== "received" && payment.status !== "failed") return "busy";

    const [{ data: project }, { data: members }] = await Promise.all([
      db().from("projects").select("*").eq("id", payment.project_id).single<ProjectRow>(),
      db()
        .from("project_members")
        .select("user_id, share_bps, user:users(stellar_public_key, stellar_secret_enc)")
        .eq("project_id", payment.project_id)
        .returns<
          {
            user_id: string;
            share_bps: number;
            user: { stellar_public_key: string; stellar_secret_enc: string };
          }[]
        >(),
    ]);
    if (!project || !members?.length) throw new Error("Proyecto sin integrantes");

    const projectSecret = decryptSecret(project.stellar_secret_enc);
    await ensureUsdcTrustline(projectSecret);
    for (const m of members) {
      await ensureUsdcTrustline(decryptSecret(m.user.stellar_secret_enc));
    }

    const splits = splitAmount(
      BigInt(payment.amount_stroops),
      members.map((m) => ({ id: m.user_id, shareBps: m.share_bps })),
    );
    const byId = new Map(members.map((m) => [m.user_id, m]));

    const hash = await distribute({
      projectSecret,
      splits: splits.map((s) => ({
        publicKey: byId.get(s.id)!.user.stellar_public_key,
        amountStroops: s.amount,
      })),
      memo: memoFor(payment.id),
      onSigned: async ({ hash, deadline }) => {
        if (begun) {
          // Se rearmó por tx_bad_seq: la anterior ya no puede entrar.
          const { error } = await db()
            .from("payments")
            .update({ distribution_tx_hash: hash, tx_deadline: deadline.toISOString() })
            .eq("id", payment.id)
            .eq("status", "distributing");
          if (error) throw new Error(error.message);
          return;
        }
        const { error } = await db().rpc("begin_distribution", {
          p_payment_id: payment.id,
          p_tx_hash: hash,
          p_tx_deadline: deadline.toISOString(),
          p_rows: splits.map((s) => ({
            user_id: s.id,
            share_bps: s.shareBps,
            amount_stroops: s.amount.toString(),
          })),
        });
        if (error?.code === "P0002") throw new BusyError();
        if (error) throw new Error(`No se pudo registrar el reparto: ${error.message}`);
        begun = true;
      },
    });

    // Si esto falla, queda "distributing" con su hash y se confirma al reconciliar: nunca se
    // vuelve a enviar un reparto que ya salió.
    await db()
      .from("payments")
      .update({ status: "distributed", distribution_tx_hash: hash, tx_deadline: null, error: null })
      .eq("id", paymentId)
      .eq("status", "distributing");
    return "distributed";
  } catch (err) {
    if (err instanceof BusyError) return "busy";
    console.error(`Reparto del pago ${paymentId} fallido:`, err);
    if (err instanceof TxError && err.uncertain) {
      await db()
        .from("payments")
        .update({ error: "Estamos confirmando el reparto con la red." })
        .eq("id", paymentId)
        .eq("status", "distributing");
      return "uncertain";
    }
    const message = distributionErrorMessage(err);
    if (begun) {
      await db().rpc("cancel_distribution", { p_payment_id: paymentId, p_error: message });
    } else {
      await db()
        .from("payments")
        .update({ status: "failed", error: message })
        .eq("id", paymentId)
        .eq("status", "received");
    }
    return "failed";
  }
}

/**
 * Confirma o revierte un pago en vuelo preguntándole a la red por su transacción.
 * Devuelve true si cambió algo. Es idempotente: se puede llamar al cargar cualquier página.
 */
export async function reconcilePayment(payment: PaymentRow): Promise<boolean> {
  if (payment.status !== "pending" && payment.status !== "distributing") return false;
  const hash = inFlightHash(payment);
  const lookup = hash ? await lookupTransaction(hash) : null;
  const decision = reconcileDecision(payment, lookup, new Date());
  if (decision === "wait") return false;

  if (payment.status === "pending") {
    await db()
      .from("payments")
      .update(
        decision === "confirm"
          ? { status: "received", tx_deadline: null, error: null }
          : {
              status: "failed",
              payment_tx_hash: null,
              tx_deadline: null,
              error: `El pago no se completó. ${PAYMENT_NOT_SENT}`,
            },
      )
      .eq("id", payment.id)
      .eq("status", "pending");
    // El pago sí llegó: se reparte de una vez (begin_distribution evita repartir dos veces).
    if (decision === "confirm") await runDistribution(payment.id);
  } else if (decision === "confirm") {
    await db()
      .from("payments")
      .update({ status: "distributed", tx_deadline: null, error: null })
      .eq("id", payment.id)
      .eq("status", "distributing");
  } else {
    await db().rpc("cancel_distribution", {
      p_payment_id: payment.id,
      p_error: `El reparto no se completó. ${MONEY_SAFE}`,
    });
  }
  return true;
}

/** Reconciliar varios pagos (p. ej. los de una página). true si alguno cambió. */
export async function reconcilePayments(payments: PaymentRow[]): Promise<boolean> {
  const results = await Promise.all(
    payments
      .filter((p) => p.status === "pending" || p.status === "distributing")
      .map((p) =>
        reconcilePayment(p).catch((err) => {
          console.error(`No se pudo reconciliar el pago ${p.id}:`, err);
          return false;
        }),
      ),
  );
  return results.some(Boolean);
}
