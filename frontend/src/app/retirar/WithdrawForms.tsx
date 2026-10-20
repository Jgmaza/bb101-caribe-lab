"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { formatCop } from "@/lib/format";
import { startBankWithdrawal, withdrawToWallet } from "@/lib/server/withdraw-actions";

type Tab = "banco" | "wallet";

export function WithdrawForms({
  requestIds,
  balanceCop,
  bankRange,
  bankRangeText,
}: {
  /** Un id por formulario: el del retiro que cada uno creará. */
  requestIds: Record<Tab, string>;
  /** Saldo disponible en pesos (≈); null si no se pudo consultar. */
  balanceCop: number | null;
  bankRange: { min: number; max: number | null } | null;
  bankRangeText: string | null;
}) {
  const [tab, setTab] = useState<Tab>("banco");
  const tabs: { id: Tab; label: string }[] = [
    { id: "banco", label: "Bancolombia (demo)" },
    { id: "wallet", label: "A otra cuenta Stellar" },
  ];

  return (
    <div>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-bg-soft p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition ${
              tab === t.id ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-blue"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Ambos quedan montados: desmontar uno perdería el id nuevo que trae tras un error. */}
      <div role="tabpanel" hidden={tab !== "banco"} className="mt-5">
        <BankForm
          requestId={requestIds.banco}
          balanceCop={balanceCop}
          bankRange={bankRange}
          bankRangeText={bankRangeText}
        />
      </div>
      <div role="tabpanel" hidden={tab !== "wallet"} className="mt-5">
        <WalletForm requestId={requestIds.wallet} balanceCop={balanceCop} />
      </div>
    </div>
  );
}

function AmountField({
  value,
  onChange,
  readOnly,
  label = "Monto en pesos colombianos (COP)",
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  label?: string;
}) {
  return (
    <Field label={label}>
      <Input
        name="amount"
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
          onChange(digits ? Number(digits).toLocaleString("es-CO") : "");
        }}
        className="font-display text-xl font-bold"
        readOnly={readOnly}
        required
      />
    </Field>
  );
}

function digitsToCop(amount: string): number | null {
  const n = Number(amount.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function BankForm({
  requestId,
  balanceCop,
  bankRange,
  bankRangeText,
}: {
  requestId: string;
  balanceCop: number | null;
  bankRange: { min: number; max: number | null } | null;
  bankRangeText: string | null;
}) {
  const [state, action, pending] = useActionState(startBankWithdrawal, { error: null, requestId });
  const [amount, setAmount] = useState("");
  const amountCop = digitsToCop(amount);

  // Tope demo del banco de prueba (SEP-24), expresado en pesos.
  const maxAllowed =
    bankRange?.max != null && balanceCop != null
      ? Math.min(bankRange.max, balanceCop - 1)
      : (bankRange?.max ?? (balanceCop !== null && balanceCop > 1 ? balanceCop - 1 : null));
  const minAllowed = bankRange?.min ?? null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="request_id" value={state.requestId} />
      <p className="text-[13px] text-ink-muted">
        Simula un retiro a <strong className="text-ink">Bancolombia</strong> en pesos colombianos.
        No llega dinero real: es el banco de prueba de Stellar. Orilla te muestra todo en COP; el
        límite del demo es {bankRangeText ?? "el que indique el banco de prueba"}.
      </p>
      {bankRange === null ? (
        <p className="text-xs text-warn">
          No pudimos consultar el banco de prueba ahora. Puedes intentarlo igual o volver en un
          momento.
        </p>
      ) : null}
      <AmountField
        value={amount}
        onChange={setAmount}
        readOnly={pending}
        label="¿Cuánto quieres recibir en Bancolombia? (COP)"
      />
      {amountCop !== null ? (
        <p className="rounded-[10px] bg-[#E6F6EF] px-3.5 py-3 text-sm text-success">
          Recibirías en tu cuenta Bancolombia:{" "}
          <strong className="font-display text-base">≈ {formatCop(amountCop)}</strong>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {minAllowed !== null ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAmount(minAllowed.toLocaleString("es-CO"))}
            className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-blue hover:bg-bg-soft disabled:opacity-50"
          >
            Mínimo ≈ {formatCop(minAllowed)}
          </button>
        ) : null}
        {maxAllowed !== null && maxAllowed > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAmount(maxAllowed.toLocaleString("es-CO"))}
            className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-blue hover:bg-bg-soft disabled:opacity-50"
          >
            Máximo del demo ≈ {formatCop(maxAllowed)}
          </button>
        ) : null}
      </div>
      <FormError message={pending ? null : state.error} />
      <SubmitButton
        variant="cta"
        pending={pending}
        pendingLabel="Conectando con Bancolombia (demo)…"
        className="w-full"
      >
        Continuar a Bancolombia
      </SubmitButton>
    </form>
  );
}

function WalletForm({ requestId, balanceCop }: { requestId: string; balanceCop: number | null }) {
  const [state, action, pending] = useActionState(withdrawToWallet, { error: null, requestId });
  const [amount, setAmount] = useState("");
  // El saldo en pesos está redondeado: un peso menos para no pasarse por la conversión.
  const allCop = balanceCop !== null && balanceCop > 1 ? balanceCop - 1 : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="request_id" value={state.requestId} />
      <p className="text-[13px] text-ink-muted">
        Envía tu saldo (en pesos) a otra cuenta de la red Stellar, por ejemplo la de un exchange.
        Revisa bien la dirección: un envío no se puede deshacer.
      </p>
      <Field label="Dirección de destino">
        <Input
          name="destination"
          placeholder="G…"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[13px]"
          readOnly={pending}
          required
        />
      </Field>
      <Field label="Memo (opcional, si tu exchange lo pide)">
        <Input name="memo" maxLength={28} autoComplete="off" readOnly={pending} />
      </Field>
      <AmountField value={amount} onChange={setAmount} readOnly={pending} />
      {allCop !== null ? (
        <button
          type="button"
          onClick={() => setAmount(allCop.toLocaleString("es-CO"))}
          className="-mt-2 w-fit cursor-pointer text-xs font-semibold text-blue hover:underline"
        >
          Usar todo mi saldo (≈ {formatCop(allCop)})
        </button>
      ) : null}
      <FormError message={pending ? null : state.error} />
      <SubmitButton variant="cta" pending={pending} pendingLabel="Enviando… (unos segundos)" className="w-full">
        Retirar
      </SubmitButton>
    </form>
  );
}
