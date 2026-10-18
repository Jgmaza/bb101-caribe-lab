"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
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
    { id: "banco", label: "A mi banco (prueba)" },
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
        <BankForm requestId={requestIds.banco} bankRange={bankRange} bankRangeText={bankRangeText} />
      </div>
      <div role="tabpanel" hidden={tab !== "wallet"} className="mt-5">
        <WalletForm requestId={requestIds.wallet} balanceCop={balanceCop} />
      </div>
    </div>
  );
}

function AmountField({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly: boolean }) {
  return (
    <Field label="Monto (COP)">
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

function BankForm({
  requestId,
  bankRange,
  bankRangeText,
}: {
  requestId: string;
  bankRange: { min: number; max: number | null } | null;
  bankRangeText: string | null;
}) {
  const [state, action, pending] = useActionState(startBankWithdrawal, { error: null, requestId });
  const [amount, setAmount] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="request_id" value={state.requestId} />
      <p className="text-[13px] text-ink-muted">
        Es un banco de prueba: no llega dinero real. Te pedirá tus datos en otra pestaña y luego
        confirmas el envío aquí.
        {bankRangeText ? ` Acepta retiros ${bankRangeText}.` : ""}
      </p>
      {bankRange === null ? (
        <p className="text-xs text-warn">
          No pudimos consultar el banco de prueba ahora. Puedes intentarlo igual o volver en un momento.
        </p>
      ) : null}
      <AmountField value={amount} onChange={setAmount} readOnly={pending} />
      <FormError message={pending ? null : state.error} />
      <SubmitButton variant="cta" pending={pending} pendingLabel="Conectando con el banco…" className="w-full">
        Continuar
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
        Envía tu saldo a otra cuenta de la red Stellar, por ejemplo la de un exchange. Revisa bien la
        dirección: un envío no se puede deshacer.
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
          Usar todo mi saldo
        </button>
      ) : null}
      <FormError message={pending ? null : state.error} />
      <SubmitButton variant="cta" pending={pending} pendingLabel="Enviando… (unos segundos)" className="w-full">
        Retirar
      </SubmitButton>
    </form>
  );
}
