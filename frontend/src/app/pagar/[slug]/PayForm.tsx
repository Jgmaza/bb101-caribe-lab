"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
}: {
  slug: string;
  members: PreviewMember[];
  /** Saldo disponible en pesos (≈, tasa de hoy); null si no se pudo consultar. */
  balanceCop: number | null;
}) {
  const [state, action, pending] = useActionState(payProject.bind(null, slug), { error: null });
  const [amountText, setAmountText] = useState("");

  const amount = Number(amountText.replace(/\D/g, ""));
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_PAYMENT_COP;
  const preview = validAmount
    ? splitAmount(BigInt(amount), members.map((m) => ({ id: m.id, shareBps: m.shareBps })))
    : null;
  const insufficient = validAmount && balanceCop !== null && amount > balanceCop;

  return (
    <form action={action} className="flex flex-col gap-5">
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

      {insufficient ? (
        <p className="text-xs text-warn">
          Tu saldo (≈ {formatCop(balanceCop ?? 0)}) no alcanza.{" "}
          <Link href="/inicio" className="font-semibold underline">
            Recarga desde tu inicio
          </Link>
          .
        </p>
      ) : null}
      <FormError message={state.error} />

      <SubmitButton
        variant="cta"
        pending={pending}
        pendingLabel="Pagando y repartiendo…"
        className="w-full"
      >
        {validAmount ? `Pagar ${formatCop(amount)}` : "Pagar"}
      </SubmitButton>
    </form>
  );
}
