import { sdpLogin } from "@/lib/sdp/client";

type SdpPayment = {
  id: string;
  amount: string;
  status: string;
  stellar_transaction_id?: string;
  asset?: { code?: string };
};

type SdpReceiverRow = {
  id: string;
  phone_number?: string;
  external_id?: string;
  payment?: SdpPayment;
};

function apiBase() {
  return (process.env.SDP_API_URL ?? "http://localhost:8001").replace(/\/$/, "");
}

export type SyncedPayment = {
  paymentId: string;
  status: string;
  amount: string;
  assetCode: string;
  stellarTransactionId: string | null;
  phone: string;
  externalId: string;
};

export async function fetchDisbursementPayment(opts: {
  disbursementId: string;
  phone?: string | null;
  cedula?: string | null;
}): Promise<SyncedPayment | null> {
  const token = await sdpLogin();
  const res = await fetch(
    `${apiBase()}/disbursements/${opts.disbursementId}/receivers?page=1&page_limit=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`SDP receivers ${res.status}`);
  }
  const body = (await res.json()) as { data?: SdpReceiverRow[] };
  const rows = body.data ?? [];
  const phone = opts.phone?.trim();
  const cedula = opts.cedula?.trim();

  const row = rows.find((r) => {
    if (cedula && r.external_id === cedula) return true;
    if (phone && r.phone_number === phone) return true;
    return false;
  });
  if (!row?.payment) return null;

  const tx = row.payment.stellar_transaction_id?.trim() || null;
  return {
    paymentId: row.payment.id,
    status: row.payment.status,
    amount: row.payment.amount,
    assetCode: row.payment.asset?.code ?? "XLM",
    stellarTransactionId: tx,
    phone: row.phone_number ?? "",
    externalId: row.external_id ?? "",
  };
}
