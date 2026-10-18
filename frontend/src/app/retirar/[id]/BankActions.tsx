"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/ui";
import { cancelBankWithdrawal, confirmBankWithdrawal } from "@/lib/server/withdraw-actions";

export function ConfirmBankWithdrawal({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState(confirmBankWithdrawal.bind(null, id), { error: null });
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormError message={pending ? null : state.error} />
      <SubmitButton variant="cta" pending={pending} pendingLabel="Enviando al banco…" className="w-full">
        {label}
      </SubmitButton>
    </form>
  );
}

export function CancelBankWithdrawal({ id }: { id: string }) {
  return (
    <form action={cancelBankWithdrawal.bind(null, id)}>
      <button type="submit" className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-danger">
        Cancelar retiro
      </button>
    </form>
  );
}
