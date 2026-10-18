/**
 * Cliente mínimo SDP (Stellar Disbursement Platform) para Orilla.
 * Flujo: login → asset XLM + Demo Wallet → create → CSV instructions → STARTED.
 */

export type SdpReceiverRow = {
  phone: string;
  /** Cédula = columna `id` del CSV SDP */
  id: string;
  amount: string;
  /** YYYY-MM-DD cuando verification_field = DATE_OF_BIRTH */
  verification: string;
};

export type SdpDisbursementResult = {
  disbursementId: string;
  name: string;
  status: string;
  totalPayments: number;
  walletName: string;
  assetCode: string;
};

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Falta env ${name}`);
  return v;
}

function apiBase() {
  return env("SDP_API_URL", "http://localhost:8001").replace(/\/$/, "");
}

export async function sdpJson<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${apiBase()}${path}`, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : text.slice(0, 400);
    throw new Error(`SDP ${res.status} ${path}: ${msg}`);
  }
  return body as T;
}

export async function sdpLogin(): Promise<string> {
  const email = env("SDP_OWNER_EMAIL", "owner@default.local");
  const password = env("SDP_OWNER_PASS", "Password123!");
  const data = await sdpJson<{ token: string }>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!data.token) throw new Error("SDP login sin token");
  return data.token;
}

type Asset = { id: string; code: string };
type Wallet = { id: string; name: string; enabled?: boolean };

async function resolveXlmAndDemoWallet(token: string) {
  const assets = await sdpJson<Asset[]>("/assets", { token });
  const xlm = assets.find((a) => a.code === "XLM");
  if (!xlm) throw new Error("SDP: no hay asset XLM");

  const wallets = await sdpJson<Wallet[]>("/wallets", { token });
  const demo =
    wallets.find((w) => w.name === "Demo Wallet" && w.enabled !== false) ??
    wallets.find((w) => w.name === "Demo Wallet");
  if (!demo) throw new Error("SDP: no hay wallet 'Demo Wallet'");

  return { assetId: xlm.id, walletId: demo.id, walletName: demo.name };
}

export function buildInstructionsCsv(rows: SdpReceiverRow[]): string {
  const header = "phone,id,amount,verification";
  const lines = rows.map(
    (r) =>
      `${r.phone},${r.id},${r.amount},${r.verification}`,
  );
  return [header, ...lines].join("\n") + "\n";
}

/**
 * Crea disbursement, sube CSV de receptores y lo pone en STARTED.
 * Los receptores aún no tienen wallet Stellar: la crean al reclamar en Demo Wallet.
 */
export async function createAndStartDisbursement(opts: {
  name: string;
  receivers: SdpReceiverRow[];
}): Promise<SdpDisbursementResult> {
  if (opts.receivers.length === 0) {
    throw new Error("Sin receptores para dispersar");
  }
  for (const r of opts.receivers) {
    if (!r.phone || !r.id || !r.amount || !r.verification) {
      throw new Error(
        `Receptor incompleto (phone/cédula/amount/DOB): ${JSON.stringify(r)}`,
      );
    }
  }

  const token = await sdpLogin();
  const { assetId, walletId, walletName } = await resolveXlmAndDemoWallet(token);

  const created = await sdpJson<{
    id: string;
    name: string;
    status: string;
    total_payments?: number;
  }>("/disbursements", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.name,
      asset_id: assetId,
      wallet_id: walletId,
      registration_contact_type: "PHONE_NUMBER",
      verification_field: "DATE_OF_BIRTH",
    }),
  });

  if (!created.id) throw new Error("SDP no devolvió id de disbursement");

  const csv = buildInstructionsCsv(opts.receivers);
  const form = new FormData();
  form.append(
    "file",
    new Blob([csv], { type: "text/csv" }),
    `${opts.name}.csv`,
  );

  await sdpJson(`/disbursements/${created.id}/instructions`, {
    method: "POST",
    token,
    body: form,
  });

  const started = await sdpJson<{
    id: string;
    name: string;
    status: string;
    total_payments?: number;
  }>(`/disbursements/${created.id}/status`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "STARTED" }),
  });

  return {
    disbursementId: started.id ?? created.id,
    name: started.name ?? created.name,
    status: started.status ?? "STARTED",
    totalPayments: started.total_payments ?? opts.receivers.length,
    walletName,
    assetCode: "XLM",
  };
}
