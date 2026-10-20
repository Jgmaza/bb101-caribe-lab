import "server-only";
import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";
import { availableStroops, stroopsToXlm, xlmToStroops } from "@/lib/money";
import type { TxLookup } from "@/lib/payments";
import type { AnchorMemo } from "@/lib/withdrawals";
import { env } from "./env";

// Toda la interacción con Stellar testnet pasa por aquí.
// Activo: XLM nativo. Montos en stroops (BigInt). En pantalla se muestran en pesos.

const FEE = "1000"; // stroops por operación; holgado para testnet
const STARTING_XLM = "1.5"; // reserva de la cuenta (1 XLM) + comisiones
const TIMEOUT_SECONDS = 60;
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const MAX_TOPUP_ROUNDS = 5; // cada ronda de friendbot trae ~10.000 XLM
const FUNDER_MIN_STROOPS = xlmToStroops("500"); // por debajo, el funder se recarga solo

let server: Horizon.Server | undefined;
function horizon() {
  server ??= new Horizon.Server(env("STELLAR_HORIZON_URL"));
  return server;
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerAccountUrl(publicKey: string) {
  return `https://stellar.expert/explorer/testnet/account/${publicKey}`;
}

type Submitted = { hash: string; fee_charged?: number | string };

/**
 * Falla al enviar una transacción. `uncertain`: Horizon no dio una respuesta definitiva (red,
 * timeout 504): la transacción todavía podría entrar hasta su plazo. Si no, Stellar la rechazó
 * y seguro no se aplicó; `codes` trae los result codes (tx_bad_seq, op_underfunded, …).
 */
export class TxError extends Error {
  constructor(
    message: string,
    readonly uncertain: boolean,
    readonly codes: string[] = [],
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sin respuesta de Horizon, o un 5xx (504 = enviada pero sin confirmar): no sabemos si se aplicó. */
function isTransient(err: unknown): boolean {
  if (err instanceof NotFoundError) return false;
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
}

function txHash(tx: Transaction) {
  return Buffer.from(tx.hash()).toString("hex");
}

/** Busca una transacción por hash. "failed" = entró pero sus operaciones no se aplicaron. */
export async function lookupTransaction(hash: string): Promise<TxLookup> {
  try {
    const tx = await horizon().transactions().transaction(hash).call();
    return tx.successful ? "success" : "failed";
  } catch (err) {
    return err instanceof NotFoundError ? "missing" : "unknown";
  }
}

async function findTransaction(hash: string): Promise<Submitted | null> {
  try {
    const tx = await horizon().transactions().transaction(hash).call();
    return tx.successful ? { hash: tx.hash, fee_charged: tx.fee_charged } : null;
  } catch {
    return null;
  }
}

/**
 * Envía una transacción firmada. Si falla por red (p. ej. una conexión keep-alive vencida),
 * busca la transacción por su hash antes de reenviarla: reenviar la MISMA transacción no
 * puede duplicar el pago (mismo número de secuencia), a lo sumo Horizon la rechaza.
 */
async function submit(tx: Transaction): Promise<Submitted> {
  const hash = txHash(tx);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await horizon().submitTransaction(tx);
    } catch (err) {
      lastErr = err;
      if (attempt > 1 || isTransient(err)) {
        await sleep(1000 * attempt);
        const applied = await findTransaction(hash);
        if (applied) return applied;
      }
      if (!isTransient(err)) break;
    }
  }
  throw toTxError(lastErr);
}

function toTxError(err: unknown): TxError {
  const codes = (
    err as {
      response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
    }
  )?.response?.data?.extras?.result_codes;
  if (codes) {
    const list = [codes.transaction, ...(codes.operations ?? [])].filter(
      (c): c is string => !!c && c !== "op_success",
    );
    return new TxError(`Stellar rechazó la transacción: ${JSON.stringify(codes)}`, false, list);
  }
  const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
  const base = err instanceof Error ? err.message : String(err);
  return new TxError(cause ? `${base} (${cause.code ?? cause.message})` : base, isTransient(err));
}

export type SignedTx = { hash: string; deadline: Date };

/**
 * Arma, firma y envía una transacción desde `source`. `onSigned` corre con el hash ANTES de
 * enviarla (para guardarlo); si falla, no se envía nada. Si la secuencia de la cuenta cambió
 * entre la lectura y el envío (tx_bad_seq: otra transacción de la misma cuenta entró antes), esa
 * transacción ya no puede entrar nunca: se vuelve a armar con la secuencia nueva.
 */
async function buildAndSubmit(
  source: Keypair,
  addOperations: (builder: TransactionBuilder) => TransactionBuilder,
  onSigned?: (tx: SignedTx) => Promise<void>,
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const tx = addOperations(await builderFor(source.publicKey()))
      .setTimeout(TIMEOUT_SECONDS)
      .build();
    tx.sign(source);
    await onSigned?.({ hash: txHash(tx), deadline: new Date(Number(tx.timeBounds!.maxTime) * 1000) });
    try {
      return (await submit(tx)).hash;
    } catch (err) {
      if (attempt < 3 && err instanceof TxError && err.codes.includes("tx_bad_seq")) continue;
      throw err;
    }
  }
}

/**
 * loadAccount con reintentos ante errores de red: tras una espera larga (p. ej. friendbot) la
 * conexión keep-alive con Horizon puede estar cerrada y fetch falla sin reintentar. Leer una
 * cuenta es idempotente; "no existe" (NotFoundError) no se reintenta.
 */
async function loadAccount(publicKey: string, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await horizon().loadAccount(publicKey);
    } catch (err) {
      if (err instanceof NotFoundError || i >= attempts) throw err;
      await sleep(500 * i);
    }
  }
}

async function builderFor(publicKey: string) {
  return new TransactionBuilder(await loadAccount(publicKey), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  });
}

/**
 * Saldo disponible en stroops (descontada la reserva mínima y un margen para comisiones).
 * 0 si la cuenta no existe; null si Horizon no respondió (la UI muestra "no disponible").
 */
export async function getAvailableStroops(publicKey: string): Promise<bigint | null> {
  try {
    const account = await loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    if (!native) return 0n;
    return availableStroops({
      balance: native.balance,
      subentries: account.subentry_count,
      sponsoring: account.num_sponsoring ?? 0,
      sponsored: account.num_sponsored ?? 0,
      sellingLiabilities: "selling_liabilities" in native ? native.selling_liabilities : "0",
    });
  } catch (err) {
    if (err instanceof NotFoundError) return 0n;
    console.error(`No se pudo leer el saldo de ${publicKey}:`, err);
    return null;
  }
}

/** Fondea una cuenta nueva con friendbot. Si la llamada falla, revisa si igual quedó fondeada. */
async function friendbot(publicKey: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return;
      throw new Error(`Friendbot respondió ${res.status}`);
    } catch (err) {
      const funded = await loadAccount(publicKey).then(
        () => true,
        () => false,
      );
      if (funded) return;
      if (attempt >= 2) throw new Error(`Friendbot no respondió: ${(err as Error).message}`);
      await sleep(1000);
    }
  }
}

export type TopupRound = { txHash: string; amountStroops: bigint };

/**
 * Recarga con friendbot: friendbot solo fondea cuentas que NO existen, así que en cada ronda
 * se crea una cuenta temporal, friendbot la fondea y se fusiona (accountMerge) en `destination`.
 * Repite hasta sumar `minStroops` (al menos una ronda, máximo MAX_TOPUP_ROUNDS). `onRound` corre
 * al terminar cada ronda: si una ronda posterior falla, las anteriores ya quedaron registradas.
 */
export async function friendbotTopUp(
  destination: string,
  minStroops = 1n,
  onRound?: (round: TopupRound) => Promise<void>,
): Promise<TopupRound[]> {
  const rounds: TopupRound[] = [];
  let total = 0n;
  while (total < minStroops) {
    if (rounds.length >= MAX_TOPUP_ROUNDS) {
      throw new Error("El monto supera lo que se puede recargar de una vez.");
    }
    const temp = Keypair.random();
    await friendbot(temp.publicKey());
    const tempAccount = await loadAccount(temp.publicKey());
    const balance = xlmToStroops(tempAccount.balances.find((b) => b.asset_type === "native")!.balance);
    const tx = new TransactionBuilder(tempAccount, { fee: FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.accountMerge({ destination }))
      .setTimeout(TIMEOUT_SECONDS)
      .build();
    tx.sign(temp);
    const res = await submit(tx);
    // La comisión cobrada sale del saldo de la temporal; el resto llega al destino.
    const fee = BigInt(res.fee_charged ?? FEE);
    const round = { txHash: res.hash, amountStroops: balance - fee };
    rounds.push(round);
    total += round.amountStroops;
    await onRound?.(round);
  }
  return rounds;
}

/** Si el funder baja del umbral, se recarga solo con friendbot. */
async function ensureFunderBalance(funder: Keypair, needed: bigint) {
  const available = await getAvailableStroops(funder.publicKey());
  if (available !== null && available - needed >= FUNDER_MIN_STROOPS) return;
  await friendbotTopUp(funder.publicKey(), needed);
}

/**
 * Crea cuentas custodiales (personas o proyectos) en una sola transacción: el funder les da lo
 * justo para la reserva y algunas comisiones. Máximo 100 cuentas.
 */
export async function createCustodialAccounts(count: number): Promise<Keypair[]> {
  if (count < 1 || count > 100) throw new Error("Se pueden crear entre 1 y 100 cuentas a la vez");
  const funder = Keypair.fromSecret(env("FUNDER_SECRET"));
  await ensureFunderBalance(funder, BigInt(count) * xlmToStroops(STARTING_XLM));
  const accounts = Array.from({ length: count }, () => Keypair.random());

  // Dos registros a la vez usan el funder: buildAndSubmit rearma ante tx_bad_seq.
  await buildAndSubmit(funder, (builder) => {
    for (const kp of accounts) {
      builder.addOperation(
        Operation.createAccount({ destination: kp.publicKey(), startingBalance: STARTING_XLM }),
      );
    }
    return builder;
  });
  return accounts;
}

/** Pago de una persona a la cuenta del proyecto, en stroops. */
export async function payToProject(opts: {
  payerSecret: string;
  projectPublicKey: string;
  amountStroops: bigint;
  memo: string;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  return buildAndSubmit(
    Keypair.fromSecret(opts.payerSecret),
    (builder) =>
      builder
        .addOperation(
          Operation.payment({
            destination: opts.projectPublicKey,
            asset: Asset.native(),
            amount: stroopsToXlm(opts.amountStroops),
          }),
        )
        .addMemo(Memo.text(opts.memo)),
    opts.onSigned,
  );
}

/** true si la cuenta existe; null si Horizon no respondió. */
export async function accountExists(publicKey: string): Promise<boolean | null> {
  try {
    await loadAccount(publicKey);
    return true;
  } catch (err) {
    return err instanceof NotFoundError ? false : null;
  }
}

function toMemo(memo: AnchorMemo): Memo {
  switch (memo.type) {
    case "id":
      return Memo.id(memo.value);
    case "hash":
      return Memo.hash(Buffer.from(memo.value, "base64").toString("hex"));
    default:
      return Memo.text(memo.value);
  }
}

/**
 * Retiro: XLM de la cuenta de una persona a otra cuenta. Si la cuenta de destino no existe se
 * crea con createAccount (el monto debe cubrir su reserva; lo valida quien llama).
 */
export async function sendNative(opts: {
  sourceSecret: string;
  destination: string;
  amountStroops: bigint;
  createAccount: boolean;
  memo: AnchorMemo | null;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  const amount = stroopsToXlm(opts.amountStroops);
  return buildAndSubmit(
    Keypair.fromSecret(opts.sourceSecret),
    (builder) => {
      builder.addOperation(
        opts.createAccount
          ? Operation.createAccount({ destination: opts.destination, startingBalance: amount })
          : Operation.payment({ destination: opts.destination, asset: Asset.native(), amount }),
      );
      return opts.memo ? builder.addMemo(toMemo(opts.memo)) : builder;
    },
    opts.onSigned,
  );
}

/**
 * Reparte desde la cuenta del proyecto a cada integrante en UNA transacción
 * (todo o nada). Es el único punto a cambiar si en v2 se usa la API de SDP.
 */
export async function distribute(opts: {
  projectSecret: string;
  splits: { publicKey: string; amountStroops: bigint }[];
  memo: string;
  onSigned: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  return payMany({
    payerSecret: opts.projectSecret,
    splits: opts.splits,
    memo: opts.memo,
    onSigned: opts.onSigned,
  });
}

/**
 * Varios pagos nativos desde una sola cuenta (hotel cierra lote, o proyecto reparte).
 * Máx. ~100 ops/tx en Stellar; el MVP de lotes limita a 40 filas.
 * Interfaz estable para sustituir por SDP más adelante.
 */
export async function payMany(opts: {
  payerSecret: string;
  splits: { publicKey: string; amountStroops: bigint }[];
  memo: string;
  onSigned?: (tx: SignedTx) => Promise<void>;
}): Promise<string> {
  return buildAndSubmit(
    Keypair.fromSecret(opts.payerSecret),
    (builder) => {
      for (const s of opts.splits) {
        if (s.amountStroops <= 0n) continue;
        builder.addOperation(
          Operation.payment({
            destination: s.publicKey,
            asset: Asset.native(),
            amount: stroopsToXlm(s.amountStroops),
          }),
        );
      }
      return builder.addMemo(Memo.text(opts.memo));
    },
    opts.onSigned,
  );
}
