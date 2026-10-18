import { prisma } from "@/lib/db";
import type { ClaimView } from "@/lib/cobrar/types";
import { fetchDisbursementPayment } from "@/lib/sdp/payments";

export type { ClaimView };

/** Aliases de demo → id de receptor en seed */
const TOKEN_ALIASES: Record<string, string> = {
  laura: "recv-staff",
  staff: "recv-staff",
  sergio: "recv-musico",
  musico: "recv-musico",
};

function explorerTx(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export async function findReceptorByToken(token: string) {
  const key = decodeURIComponent(token).trim();
  const aliased = TOKEN_ALIASES[key.toLowerCase()] ?? key;

  return prisma.receptor.findFirst({
    where: {
      OR: [
        { id: aliased },
        { cedula: key },
        { celular: key },
      ],
    },
    include: {
      lote: { include: { organization: true } },
    },
  });
}

export async function getClaimView(token: string): Promise<ClaimView | null> {
  const r = await findReceptorByToken(token);
  if (!r) return null;

  const demoBase =
    process.env.SDP_DEMO_WALLET_URL ?? "http://localhost:4000";
  const lauraSecret = process.env.SDP_DEMO_LAURA_SECRET?.trim();
  // Deep-link local: abre Demo Wallet con key + home domain SDP
  let demoWalletUrl = demoBase;
  if (r.id === "recv-staff" && lauraSecret) {
    const q = new URLSearchParams({
      secretKey: lauraSecret,
      assetOverrides: `native|homeDomain>${"localhost:8001"}`,
    });
    demoWalletUrl = `${demoBase.replace(/\/$/, "")}/?${q.toString()}`;
  }
  const hash = r.hash?.trim() || null;
  const paid = r.estado === "Ok" && Boolean(hash);

  return {
    token,
    receptorId: r.id,
    nombre: r.nombre,
    rol: r.rol,
    celular: r.celular,
    cedula: r.cedula,
    montoCop: r.monto,
    montoStellar: r.montoStellar,
    estado: r.estado,
    hash,
    stellarAddress: r.stellarAddress,
    evento: r.lote.evento,
    org: r.lote.organization.name,
    cerradoEn: r.lote.cerradoEn,
    sdpDisbursementId: r.lote.sdpDisbursementId,
    paymentStatus: paid ? "SUCCESS" : r.lote.sdpDisbursementId ? "READY" : null,
    assetCode: "XLM",
    demoWalletUrl,
    explorerUrl: hash ? explorerTx(hash) : null,
    canClaim: Boolean(r.lote.sdpDisbursementId) && !paid,
    paid,
  };
}

/** Consulta SDP y persiste hash/estado en Orilla. */
export async function syncClaimFromSdp(token: string): Promise<ClaimView | null> {
  const r = await findReceptorByToken(token);
  if (!r?.lote.sdpDisbursementId) {
    return getClaimView(token);
  }

  const payment = await fetchDisbursementPayment({
    disbursementId: r.lote.sdpDisbursementId,
    phone: r.celular,
    cedula: r.cedula,
  });

  if (payment) {
    const success =
      payment.status === "SUCCESS" || Boolean(payment.stellarTransactionId);
    await prisma.receptor.update({
      where: { id: r.id },
      data: {
        estado: success ? "Ok" : r.estado === "Fallido" ? "Fallido" : "Pendiente",
        hash: payment.stellarTransactionId,
      },
    });
  }

  return getClaimView(token);
}
