import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getLoteForPagador } from "@/lib/lotes/server";
import { CerrarNocheClient } from "./CerrarNocheClient";

export default async function CerrarNochePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lote = await getLoteForPagador(id);
  if (!lote || lote.receptores.length === 0) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-6 py-12">
      <div className="w-full max-w-[560px] rounded-[18px] border border-line bg-white p-9 shadow-sm">
        <Logo href="/pagador/lotes" />
        <h1 className="mt-5 font-display text-[32px] font-bold text-ink">
          ¿Cerrar la noche?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Vas a crear una dispersión real en SDP (testnet) para{" "}
          {lote.receptores.length} personas del lote {lote.evento}. Sergio y
          Laura reclaman después en Demo Wallet — no hace falta que ya tengan
          wallet Stellar.
        </p>

        {!lote.cedulasOk ? (
          <p className="mt-4 rounded-xl bg-warn/10 px-4 py-3 text-[13px] text-warn">
            Faltan cédula / DOB / celular en algún receptor. Revisa el seed o la
            DB antes de cerrar.
          </p>
        ) : null}

        <CerrarNocheClient
          loteId={lote.id}
          evento={lote.evento}
          receptores={lote.receptores.length}
          total={lote.total}
          alreadyDisbursed={Boolean(lote.sdpDisbursementId)}
          sdpDisbursementId={lote.sdpDisbursementId}
        />
      </div>
    </div>
  );
}
