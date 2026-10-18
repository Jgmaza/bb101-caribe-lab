"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui";
import { formatCop } from "@/lib/format";

type Props = {
  loteId: string;
  evento: string;
  receptores: number;
  total: number;
  alreadyDisbursed: boolean;
  sdpDisbursementId?: string;
};

export function CerrarNocheClient({
  loteId,
  evento,
  receptores,
  total,
  alreadyDisbursed,
  sdpDisbursementId,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    disbursementId: string;
    demoWallet: string;
    dashboard: string;
  } | null>(null);

  async function onCerrar() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lotes/${loteId}/cerrar`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        detail?: string;
        sdpDisbursementId?: string;
        integration?: {
          disbursementId: string;
          demoWallet: string;
          dashboard: string;
        };
      };
      if (!res.ok) {
        setError(
          data.detail
            ? `${data.error ?? "Error"}: ${data.detail}`
            : data.error ?? `Error ${res.status}`,
        );
        setBusy(false);
        return;
      }
      setDone({
        disbursementId: data.integration!.disbursementId,
        demoWallet: data.integration!.demoWallet,
        dashboard: data.integration!.dashboard,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fallo de red");
    } finally {
      setBusy(false);
    }
  }

  if (alreadyDisbursed && !done) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl bg-bg-soft p-4 text-[14px] text-ink">
          Este lote ya tiene dispersión SDP:{" "}
          <code className="text-[12px]">{sdpDisbursementId}</code>
        </p>
        <LinkButton href={`/pagador/lotes/${loteId}`} variant="cta">
          Ver dashboard del lote
        </LinkButton>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl border border-success/30 bg-success/5 p-4 text-[14px] leading-relaxed text-ink">
          Dispersión creada en testnet. Pagos listos para reclamar (
          <code className="text-[12px]">{done.disbursementId}</code>).
          Los receptores <strong>no necesitan wallet previa</strong>: la abren
          en Demo Wallet con celular + fecha de nacimiento + OTP.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={`/pagador/lotes/${loteId}`} variant="cta">
            Ver lote
          </LinkButton>
          <a
            href={done.demoWallet}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Demo Wallet
          </a>
          <a
            href={done.dashboard}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink"
          >
            SDP dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <dl className="space-y-2.5 rounded-xl bg-bg-soft p-4">
        {[
          ["Evento", evento],
          ["Receptores", String(receptores)],
          ["Total COP (display)", formatCop(total)],
          ["Asset testnet", "XLM vía SDP → Demo Wallet"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-[13px]">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {error ? (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <LinkButton href={`/pagador/lotes/${loteId}`} variant="ghost">
          Volver
        </LinkButton>
        <button
          type="button"
          disabled={busy}
          onClick={onCerrar}
          className="inline-flex items-center justify-center rounded-[10px] bg-orilla-gradient px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {busy ? "Creando dispersión…" : "Cerrar la noche"}
        </button>
      </div>
    </div>
  );
}
