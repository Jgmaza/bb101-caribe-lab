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
import { env } from "./env";

// Toda la interacción con Stellar testnet pasa por aquí.
// Activo: COP de prueba emitido por la cuenta issuer de Orilla (1 token = 1 peso).

export const COP_CODE = "COP";
const FEE = "1000"; // stroops por operación; holgado para testnet
const STARTING_XLM = "3"; // reservas: cuenta + trustline + comisiones
const TIMEOUT_SECONDS = 60;

let server: Horizon.Server | undefined;
function horizon() {
  server ??= new Horizon.Server(env("STELLAR_HORIZON_URL"));
  return server;
}

export function copAsset(): Asset {
  return new Asset(COP_CODE, Keypair.fromSecret(env("COP_ISSUER_SECRET")).publicKey());
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerAccountUrl(publicKey: string) {
  return `https://stellar.expert/explorer/testnet/account/${publicKey}`;
}

async function submit(tx: Transaction): Promise<string> {
  try {
    const res = await horizon().submitTransaction(tx);
    return res.hash;
  } catch (err) {
    throw new Error(describeHorizonError(err));
  }
}

function describeHorizonError(err: unknown): string {
  const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })
    ?.response?.data?.extras?.result_codes;
  if (codes) return `Stellar rechazó la transacción: ${JSON.stringify(codes)}`;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Crea varias cuentas custodiales en una sola transacción: el funder las fondea con XLM
 * y cada cuenta abre su trustline al COP. Máximo 50 cuentas (2 operaciones c/u).
 */
export async function createCustodialAccounts(count: number): Promise<Keypair[]> {
  if (count < 1 || count > 50) throw new Error("Se pueden crear entre 1 y 50 cuentas a la vez");
  const funder = Keypair.fromSecret(env("FUNDER_SECRET"));
  const asset = copAsset();
  const accounts = Array.from({ length: count }, () => Keypair.random());

  const builder = new TransactionBuilder(await horizon().loadAccount(funder.publicKey()), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  });
  for (const kp of accounts) {
    builder.addOperation(
      Operation.createAccount({ destination: kp.publicKey(), startingBalance: STARTING_XLM }),
    );
    builder.addOperation(Operation.changeTrust({ asset, source: kp.publicKey() }));
  }
  const tx = builder.setTimeout(TIMEOUT_SECONDS).build();
  tx.sign(funder, ...accounts);
  await submit(tx);
  return accounts;
}

/** Pago del organizador a la cuenta del proyecto. */
export async function payToProject(opts: {
  payerSecret: string;
  projectPublicKey: string;
  amount: number;
  memo: string;
}): Promise<string> {
  const payer = Keypair.fromSecret(opts.payerSecret);
  const tx = new TransactionBuilder(await horizon().loadAccount(payer.publicKey()), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: opts.projectPublicKey,
        asset: copAsset(),
        amount: String(opts.amount),
      }),
    )
    .addMemo(Memo.text(opts.memo))
    .setTimeout(TIMEOUT_SECONDS)
    .build();
  tx.sign(payer);
  return submit(tx);
}

/**
 * Reparte desde la cuenta del proyecto a cada integrante en UNA transacción
 * (todo o nada). Es el único punto a cambiar si en v2 se usa la API de SDP.
 */
export async function distribute(opts: {
  projectSecret: string;
  splits: { publicKey: string; amount: number }[];
  memo: string;
}): Promise<string> {
  const project = Keypair.fromSecret(opts.projectSecret);
  const asset = copAsset();
  const builder = new TransactionBuilder(await horizon().loadAccount(project.publicKey()), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  });
  for (const s of opts.splits) {
    if (s.amount <= 0) continue; // Stellar no acepta pagos de 0
    builder.addOperation(
      Operation.payment({ destination: s.publicKey, asset, amount: String(s.amount) }),
    );
  }
  const tx = builder.addMemo(Memo.text(opts.memo)).setTimeout(TIMEOUT_SECONDS).build();
  tx.sign(project);
  return submit(tx);
}

/**
 * Saldo de COP de una cuenta (entero, en pesos). 0 si la cuenta no existe;
 * null si Horizon no respondió (la UI muestra "no disponible", nunca un 0 falso).
 */
export async function getCopBalance(publicKey: string): Promise<number | null> {
  const asset = copAsset();
  try {
    const account = await horizon().loadAccount(publicKey);
    const line = account.balances.find(
      (b) =>
        (b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12") &&
        b.asset_code === asset.getCode() &&
        b.asset_issuer === asset.getIssuer(),
    );
    return line ? Math.floor(Number(line.balance)) : 0;
  } catch (err) {
    if (err instanceof NotFoundError) return 0;
    console.error(`No se pudo leer el saldo de ${publicKey}:`, err);
    return null;
  }
}

export function organizerPublicKey(): string {
  return Keypair.fromSecret(env("ORGANIZER_DEMO_SECRET")).publicKey();
}

/** Emite COP de prueba al organizador demo (solo testnet). */
export async function fundDemoOrganizer(amount: number): Promise<string> {
  const issuer = Keypair.fromSecret(env("COP_ISSUER_SECRET"));
  const tx = new TransactionBuilder(await horizon().loadAccount(issuer.publicKey()), {
    fee: FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: organizerPublicKey(),
        asset: copAsset(),
        amount: String(amount),
      }),
    )
    .setTimeout(TIMEOUT_SECONDS)
    .build();
  tx.sign(issuer);
  return submit(tx);
}
