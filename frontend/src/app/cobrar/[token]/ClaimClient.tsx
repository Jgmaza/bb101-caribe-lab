"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import type { ClaimView } from "@/lib/cobrar/types";
import { formatCop } from "@/lib/format";

export function ClaimClient({
  token,
  initial,
}: {
  token: string;
  initial: ClaimView;
}) {
  const router = useRouter();
  const [claim, setClaim] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cobrar/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        claim?: ClaimView;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.claim) {
        setError(
          data.detail
            ? `${data.error}: ${data.detail}`
            : data.error ?? `Error ${res.status}`,
        );
        return;
      }
      setClaim(data.claim);
      if (data.claim.paid) {
        router.push(`/cobrar/${token}/pago`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fallo de red");
    } finally {
      setBusy(false);
    }
  }

  if (claim.paid) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-[14px] text-ink">
          Pago confirmado en testnet
          {claim.hash ? (
            <>
              {" "}
              · <code className="text-[11px]">{claim.hash.slice(0, 12)}…</code>
            </>
          ) : null}
        </p>
        <Button
          type="button"
          className="w-full"
          onClick={() => router.push(`/cobrar/${token}/pago`)}
        >
          Ver “Te pagaron”
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Field label="Celular">
        <Input value={claim.celular} readOnly />
      </Field>

      <dl className="space-y-2 rounded-xl bg-bg-soft p-4 text-[13px]">
        {[
          ["Nombre", claim.nombre],
          ["Monto COP", formatCop(claim.montoCop)],
          ["En Stellar", `${claim.montoStellar} ${claim.assetCode}`],
          ["Estado SDP", claim.paymentStatus ?? "Sin dispersión"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {claim.canClaim ? (
        <>
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink-muted">
            <li>Abre Demo Wallet e importa tu keypair testnet.</li>
            <li>
              Home domain <code className="text-[11px]">localhost:8001</code> →
              XLM → SEP-24 Deposit.
            </li>
            <li>
              Teléfono {claim.celular}. OTP en logs del contenedor{" "}
              <code className="text-[11px]">sdp-api</code>.
            </li>
            <li>Vuelve aquí y pulsa “Ya cobré”.</li>
          </ol>

          <a
            href={claim.demoWalletUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-[10px] bg-orilla-gradient px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm"
          >
            Abrir Demo Wallet
          </a>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={sync}
          >
            {busy ? "Consultando SDP…" : "Ya cobré — actualizar"}
          </Button>
        </>
      ) : (
        <p className="rounded-xl bg-warn/10 px-4 py-3 text-[13px] text-warn">
          Este lote aún no tiene dispersión SDP. El hotel debe cerrar la noche
          primero.
        </p>
      )}

      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
