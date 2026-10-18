"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { formatCop } from "@/lib/format";
import { MAX_PAYMENT_COP } from "@/lib/money";
import { payProject } from "@/lib/server/actions";
import { splitAmount } from "@/lib/split";

type PreviewMember = { id: string; name: string; role: string; shareBps: number };

export function PayForm({
  slug,
  members,
  balanceCop,
  requestId,
}: {
  slug: string;
  members: PreviewMember[];
  /** Saldo disponible en pesos (≈, tasa de hoy); null si no se pudo consultar. */
  balanceCop: number | null;
  /** Id del pago que creará este formulario (evita pagar dos veces con un doble clic). */
  requestId: string;
}) {
  const [state, action, pending] = useActionState(payProject.bind(null, slug), {
    error: null,
    requestId,
  });
  const [amountText, setAmountText] = useState("");

  const amount = Number(amountText.replace(/\D/g, ""));
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_PAYMENT_COP;
  const preview = validAmount
    ? splitAmount(BigInt(amount), members.map((m) => ({ id: m.id, shareBps: m.shareBps })))
    : null;
  // El servidor decide con la tasa del momento; esto es solo el aviso.
  const needsTopUp = validAmount && balanceCop !== null && amount > balanceCop;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="request_id" value={state.requestId} />
      <Field label="Monto total (COP)">
        <Input
          name="amount"
          inputMode="numeric"
          placeholder="1.000.000"
          value={amountText}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
            setAmountText(digits ? Number(digits).toLocaleString("es-CO") : "");
          }}
          className="font-display text-2xl font-bold"
          readOnly={pending}
          required
        />
      </Field>
      {amount > MAX_PAYMENT_COP ? (
        <p className="text-xs text-warn">El máximo por pago es {formatCop(MAX_PAYMENT_COP)}.</p>
      ) : null}

      <div className="rounded-xl bg-bg-soft p-4">
        <p className="text-xs font-semibold text-ink-muted">Así se reparte</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
          {members.map((m, i) => (
            <li key={m.id} className="flex justify-between gap-3">
              <span className="text-ink-muted">
                {m.name}
                {m.role ? ` · ${m.role}` : ""} · {m.shareBps / 100}%
              </span>
              <span className="font-semibold text-ink">
                {preview ? formatCop(Number(preview[i].amount)) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {needsTopUp && !pending ? (
        <p className="rounded-[10px] border border-warn/30 bg-[#F4F1E6] px-3.5 py-3 text-[13px] text-ink">
          Tu saldo (≈ {formatCop(balanceCop ?? 0)}) no alcanza. Al pagar recargaremos tu saldo
          de prueba automáticamente y luego haremos el pago. Puede tardar hasta un minuto.
        </p>
      ) : null}
      {pending ? <PaymentProgress withTopUp={needsTopUp} /> : <FormError message={state.error} />}

      <SubmitButton
        variant="cta"
        pending={pending}
        pendingLabel={needsTopUp ? "Recargando y pagando…" : "Pagando y repartiendo…"}
        className="w-full"
      >
        {validAmount ? `Pagar ${formatCop(amount)}` : "Pagar"}
      </SubmitButton>
    </form>
  );
}

/** Lo que pasa mientras el servidor trabaja. No hay avance real por paso: es una guía. */
function PaymentProgress({ withTopUp }: { withTopUp: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const steps = [
    ...(withTopUp ? ["Recargamos tu saldo de prueba (entre 5 y 30 segundos)"] : []),
    "Pagamos al proyecto",
    "Repartimos entre los integrantes",
  ];

  return (
    <div role="status" aria-live="polite" className="rounded-[10px] border border-line bg-bg-soft px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue border-t-transparent" aria-hidden />
        Procesando tu pago · {seconds} s
      </p>
      <ol className="mt-2 list-decimal pl-5 text-[13px] text-ink-muted">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-ink-muted">No cierres esta página. Al terminar verás el recibo.</p>
    </div>
  );
}
