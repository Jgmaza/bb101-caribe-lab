"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formatCop } from "@/lib/format";
import { copToStroops, parseCop, stroopsToCop } from "@/lib/money";
import { parseDestination, parseMemoText } from "@/lib/withdrawals";
import type { FormState, RequestFormState } from "./actions";
import { getWithdrawLimits, startWithdraw } from "./anchor";
import { db, type WithdrawalRow } from "./db";
import { getCopPerXlm } from "./price";
import { getWithdrawal, isUuid } from "./queries";
import { requireUser, type User } from "./session";
import { accountExists, canReceiveUsdc, getAvailableStroops } from "./stellar";
import { sendWithdrawal, syncWithdrawal, syncWithdrawals, userKeypair } from "./withdrawal-flow";

// Retiros. Todas exigen sesión y solo actúan sobre retiros de quien está logueado.
// Ver lib/withdrawals.ts (estados) y lib/server/withdrawal-flow.ts (envío y seguimiento).

type Fail = (error: string) => RequestFormState;

function failures(prev: RequestFormState): { keep: Fail; fresh: Fail } {
  return {
    // Sin fila creada se puede reusar el id; si ya hay un retiro con él, el siguiente usa otro.
    keep: (error) => ({ error, requestId: prev.requestId }),
    fresh: (error) => ({ error, requestId: randomUUID() }),
  };
}

/**
 * Crea el retiro con el id del formulario. Doble clic → va al retiro ya creado; otro retiro
 * enviándose → mensaje. Devuelve la fila o el mensaje de error.
 */
async function insertWithdrawal(
  user: User,
  row: Partial<WithdrawalRow> & Pick<WithdrawalRow, "id" | "kind" | "status" | "amount_cop" | "cop_per_xlm">,
): Promise<WithdrawalRow | string> {
  const { data, error } = await db()
    .from("withdrawals")
    .insert({ ...row, user_id: user.id })
    .select("*")
    .single<WithdrawalRow>();
  if (error?.code === "23505" && error.message.includes("withdrawals_pkey")) {
    const existing = await getWithdrawal(row.id);
    if (existing?.user_id === user.id) redirect(`/retirar/${row.id}`);
    return "Recarga la página e intenta de nuevo.";
  }
  if (error?.code === "23505" && error.message.includes("withdrawals_one_sending_per_user")) {
    return "Ya tienes un retiro enviándose. Espera a que termine y vuelve a intentarlo.";
  }
  if (error || !data) {
    console.error("No se pudo registrar el retiro:", error);
    return "No pudimos registrar el retiro. Intenta de nuevo.";
  }
  return data;
}

/** Retiros que quedaron a medias no deben bloquear el siguiente. */
async function settleInFlight(userId: string) {
  const { data } = await db()
    .from("withdrawals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "sending")
    .returns<WithdrawalRow[]>();
  if (data?.length) await syncWithdrawals(data);
}

/** Lee monto, tasa y saldo comunes a ambos retiros. */
async function amountAndBalance(
  user: User,
  formData: FormData,
): Promise<{ amountCop: number; copPerXlm: number; amountStroops: bigint; available: bigint } | string> {
  const amountCop = parseCop(String(formData.get("amount") ?? "").slice(0, 20));
  if (amountCop === null) return "Escribe un monto en pesos, sin decimales.";
  let copPerXlm: number;
  try {
    copPerXlm = await getCopPerXlm();
  } catch (err) {
    return (err as Error).message;
  }
  const available = await getAvailableStroops(user.stellar_public_key);
  if (available === null) return "No pudimos consultar tu saldo. Intenta de nuevo en un momento.";
  const amountStroops = copToStroops(amountCop, copPerXlm);
  if (amountStroops > available) {
    return `Tu saldo disponible es ≈ ${formatCop(stroopsToCop(available, copPerXlm))}.`;
  }
  return { amountCop, copPerXlm, amountStroops, available };
}

/** Retiro a otra cuenta Stellar (p. ej. un exchange). Si la cuenta no existe, se crea. */
export async function withdrawToWallet(prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const user = await requireUser("/retirar");
  const { keep, fresh } = failures(prev);
  const requestId = String(formData.get("request_id") ?? "");
  if (!isUuid(requestId)) return fresh("Recarga la página e intenta de nuevo.");

  const destination = parseDestination(String(formData.get("destination") ?? "").slice(0, 80));
  if (!destination.ok) return keep(destination.error);
  if (destination.value === user.stellar_public_key) return keep("Esa es tu propia cuenta en Orilla.");
  const memo = parseMemoText(String(formData.get("memo") ?? "").slice(0, 60));
  if (!memo.ok) return keep(memo.error);

  const amounts = await amountAndBalance(user, formData);
  if (typeof amounts === "string") return keep(amounts);
  const exists = await accountExists(destination.value);
  if (exists === null) return keep("No pudimos revisar esa cuenta. Intenta de nuevo en un momento.");
  if (!exists) {
    return keep("Esa cuenta todavía no está activa. La persona debe tener cuenta Orilla (o aceptar USDC) antes de recibir.");
  }
  const acceptsUsdc = await canReceiveUsdc(destination.value);
  if (acceptsUsdc === null) return keep("No pudimos revisar esa cuenta. Intenta de nuevo en un momento.");
  if (!acceptsUsdc) {
    return keep("Esa cuenta aún no acepta USDC. Pídele que abra Orilla o active USDC antes de enviarle.");
  }

  await settleInFlight(user.id);
  const row = await insertWithdrawal(user, {
    id: requestId,
    kind: "wallet",
    status: "sending",
    destination: destination.value,
    memo: memo.value,
    memo_type: memo.value ? "text" : null,
    creates_account: false,
    amount_cop: amounts.amountCop,
    amount_stroops: Number(amounts.amountStroops),
    cop_per_xlm: amounts.copPerXlm,
  });
  if (typeof row === "string") return keep(row);

  const result = await sendWithdrawal(row, await userKeypair(user.id));
  if (result.status === "failed") return fresh(result.error ?? "El retiro no salió.");
  redirect(`/retirar/${row.id}`);
}

/**
 * Retiro "a mi banco (prueba)": crea el retiro en el anchor y lleva a /retirar/[id], donde la
 * persona abre la página del banco, llena sus datos y luego confirma el envío en Orilla.
 */
export async function startBankWithdrawal(prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const user = await requireUser("/retirar");
  const { keep, fresh } = failures(prev);
  const requestId = String(formData.get("request_id") ?? "");
  if (!isUuid(requestId)) return fresh("Recarga la página e intenta de nuevo.");

  const amounts = await amountAndBalance(user, formData);
  if (typeof amounts === "string") return keep(amounts);

  let anchorTx: { id: string; url: string };
  try {
    const limits = await getWithdrawLimits();
    if (!limits.enabled) return keep("El banco de prueba no está recibiendo retiros en este momento.");
    const { amountStroops, copPerXlm } = amounts;
    if (amountStroops < limits.minStroops || (limits.maxStroops !== null && amountStroops > limits.maxStroops)) {
      const min = formatCop(stroopsToCop(limits.minStroops, copPerXlm) + 1);
      const max = limits.maxStroops === null ? null : formatCop(stroopsToCop(limits.maxStroops, copPerXlm));
      return keep(
        max
          ? `Bancolombia (demo) acepta retiros entre ≈ ${min} y ≈ ${max} en pesos. El tope es del banco de prueba, no de Orilla.`
          : `El mínimo es ≈ ${min} en pesos.`,
      );
    }
    anchorTx = await startWithdraw(await userKeypair(user.id), amountStroops);
  } catch (err) {
    console.error("No se pudo iniciar el retiro en el anchor:", err);
    return keep("No pudimos conectar con el banco de prueba. Intenta de nuevo en un momento.");
  }

  const row = await insertWithdrawal(user, {
    id: requestId,
    kind: "banco",
    status: "interactive",
    amount_cop: amounts.amountCop,
    cop_per_xlm: amounts.copPerXlm,
    anchor_tx_id: anchorTx.id,
    anchor_status: "incomplete",
    anchor_url: anchorTx.url,
  });
  if (typeof row === "string") return keep(row);
  redirect(`/retirar/${row.id}`);
}

async function ownWithdrawal(id: string): Promise<{ user: User; withdrawal: WithdrawalRow | null }> {
  const user = await requireUser(`/retirar/${encodeURIComponent(id)}`);
  const withdrawal = await getWithdrawal(id);
  return { user, withdrawal: withdrawal?.user_id === user.id ? withdrawal : null };
}

/** Envía al banco lo que pidió el anchor. Cuenta, memo y monto se leen del anchor, no del navegador. */
export async function confirmBankWithdrawal(id: string): Promise<FormState> {
  const { user, withdrawal } = await ownWithdrawal(id);
  if (!withdrawal || withdrawal.kind !== "banco") return { error: "El retiro no existe." };

  // Datos frescos del anchor antes de mover dinero.
  try {
    await syncWithdrawal(withdrawal);
  } catch (err) {
    console.error(`No se pudo sincronizar el retiro ${id}:`, err);
    return { error: "No pudimos conectar con el banco de prueba. Intenta de nuevo en un momento." };
  }
  const current = await getWithdrawal(id);
  if (current?.status !== "ready" || !current.amount_stroops) {
    refresh();
    return { error: "Este retiro ya no está esperando confirmación." };
  }

  const available = await getAvailableStroops(user.stellar_public_key);
  if (available === null) return { error: "No pudimos consultar tu saldo. Intenta de nuevo en un momento." };
  if (BigInt(current.amount_stroops) > available) {
    return { error: "Tu saldo ya no alcanza para este retiro. Recarga desde tu inicio." };
  }
  let copPerXlm: number;
  try {
    copPerXlm = await getCopPerXlm();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Reclama el retiro de forma atómica: dos clics no envían dos veces. La tasa se congela aquí.
  const { data: claimed, error } = await db()
    .from("withdrawals")
    .update({ status: "sending", cop_per_xlm: copPerXlm, error: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "ready")
    .select("*")
    .returns<WithdrawalRow[]>();
  if (error?.code === "23505") return { error: "Ya tienes otro retiro enviándose. Espera a que termine." };
  if (error || !claimed?.length) {
    refresh();
    return { error: "Este retiro ya se está enviando." };
  }

  const result = await sendWithdrawal(claimed[0], await userKeypair(user.id));
  refresh();
  return { error: result.error ?? null };
}

/** Cancela un retiro al banco que aún no se envió. Al anchor no le llega nada: solo no le pagamos. */
export async function cancelBankWithdrawal(id: string): Promise<void> {
  const { withdrawal } = await ownWithdrawal(id);
  if (!withdrawal) return;
  await db()
    .from("withdrawals")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["interactive", "ready"]);
  refresh();
}
