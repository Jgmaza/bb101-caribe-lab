"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { formatCop } from "@/lib/format";
import { payProject } from "@/lib/server/actions";
import { MAX_AMOUNT, splitAmount } from "@/lib/split";

type PreviewMember = { id: string; name: string; role: string; shareBps: number };

export function PayForm({
  slug,
  payerName,
  members,
  organizerBalance,
}: {
  slug: string;
  payerName: string;
  members: PreviewMember[];
  organizerBalance: number | null;
}) {
  const [state, action, pending] = useActionState(payProject.bind(null, slug), { error: null });
  const [amountText, setAmountText] = useState("");

  const amount = Number(amountText.replace(/\D/g, ""));
  const validAmount = Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT;
  const preview = validAmount
    ? splitAmount(amount, members.map((m) => ({ id: m.id, shareBps: m.shareBps })))
    : null;
  const insufficient = validAmount && organizerBalance !== null && amount > organizerBalance;

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Quién paga">
        <Input name="payer_name" defaultValue={payerName} placeholder="Bar La Troja" required minLength={2} maxLength={120} />
      </Field>
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
                {preview ? formatCop(preview[i].amount) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {insufficient ? (
        <p className="text-xs text-warn">
          El saldo del organizador demo ({formatCop(organizerBalance ?? 0)}) no alcanza.
          Usa “Fondear organizador demo”.
        </p>
      ) : null}
      <FormError message={state.error} />

      <SubmitButton
        variant="cta"
        pending={pending}
        pendingLabel="Pagando y repartiendo en Stellar…"
        className="w-full"
      >
        {validAmount ? `Pagar ${formatCop(amount)}` : "Pagar"}
      </SubmitButton>
    </form>
  );
}
