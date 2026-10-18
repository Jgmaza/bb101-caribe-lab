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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error de red (sin respuesta de Horizon): no sabemos si la transacción se aplicó. */
function isNetworkError(err: unknown): boolean {
  return !(err as { response?: unknown })?.response && !(err instanceof NotFoundError);
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
  const hash = Buffer.from(tx.hash()).toString("hex");
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await horizon().submitTransaction(tx);
    } catch (err) {
      lastErr = err;
      if (attempt > 1 || isNetworkError(err)) {
        await sleep(1000 * attempt);
        const applied = await findTransaction(hash);
        if (applied) return applied;
      }
      if (!isNetworkError(err)) break;
    }
  }
  throw new Error(describeHorizonError(lastErr));
}

function describeHorizonError(err: unknown): string {
  const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })
    ?.response?.data?.extras?.result_codes;
  if (codes) return `Stellar rechazó la transacción: ${JSON.stringify(codes)}`;
  const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
  const base = err instanceof Error ? err.message : String(err);
  return cause ? `${base} (${cause.code ?? cause.message})` : base;
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
 * Repite hasta sumar `minStroops` (al menos una ronda, máximo MAX_TOPUP_ROUNDS).
 */
export async function friendbotTopUp(destination: string, minStroops = 1n): Promise<TopupRound[]> {
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
    const amount = balance - fee;
    rounds.push({ txHash: res.hash, amountStroops: amount });
    total += amount;
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

  const builder = await builderFor(funder.publicKey());
  for (const kp of accounts) {
    builder.addOperation(
      Operation.createAccount({ destination: kp.publicKey(), startingBalance: STARTING_XLM }),
    );
  }
  const tx = builder.setTimeout(TIMEOUT_SECONDS).build();
  tx.sign(funder);
  await submit(tx);
  return accounts;
}

/** Pago de una persona a la cuenta del proyecto, en stroops. */
export async function payToProject(opts: {
  payerSecret: string;
  projectPublicKey: string;
  amountStroops: bigint;
  memo: string;
}): Promise<string> {
  const payer = Keypair.fromSecret(opts.payerSecret);
  const tx = (await builderFor(payer.publicKey()))
    .addOperation(
      Operation.payment({
        destination: opts.projectPublicKey,
        asset: Asset.native(),
        amount: stroopsToXlm(opts.amountStroops),
      }),
    )
    .addMemo(Memo.text(opts.memo))
    .setTimeout(TIMEOUT_SECONDS)
    .build();
  tx.sign(payer);
  return (await submit(tx)).hash;
}

/**
 * Reparte desde la cuenta del proyecto a cada integrante en UNA transacción
 * (todo o nada). Es el único punto a cambiar si en v2 se usa la API de SDP.
 */
export async function distribute(opts: {
  projectSecret: string;
  splits: { publicKey: string; amountStroops: bigint }[];
  memo: string;
}): Promise<string> {
  const project = Keypair.fromSecret(opts.projectSecret);
  const builder = await builderFor(project.publicKey());
  for (const s of opts.splits) {
    if (s.amountStroops <= 0n) continue; // Stellar no acepta pagos de 0
    builder.addOperation(
      Operation.payment({
        destination: s.publicKey,
        asset: Asset.native(),
        amount: stroopsToXlm(s.amountStroops),
      }),
    );
  }
  const tx = builder.addMemo(Memo.text(opts.memo)).setTimeout(TIMEOUT_SECONDS).build();
  tx.sign(project);
  return (await submit(tx)).hash;
}
