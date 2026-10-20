"use client";

import { useActionState } from "react";
import { Button, FormError, SubmitButton } from "@/components/ui";
import { topUpBalance } from "@/lib/server/actions";

export function TopUpForm() {
  const [state, action, pending] = useActionState(topUpBalance, { error: null });

  return (
    <form action={action} className="flex flex-col gap-3">
      <SubmitButton variant="cta" pending={pending} pendingLabel="Recargando…" className="w-full">
        Recargar saldo de prueba
      </SubmitButton>
      <Button type="button" variant="ghost" disabled className="w-full">
        Recargar desde mi banco · pronto
      </Button>
      <FormError message={state.error} />
    </form>
  );
}
