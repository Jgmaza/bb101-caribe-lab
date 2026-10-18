"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/ui";
import { retryDistribution } from "@/lib/server/actions";

/** Solo se muestra a admins. Si sale bien, la acción vuelve a la página con un aviso. */
export function RetryDistribution({ slug, paymentId }: { slug: string; paymentId: string }) {
  const [state, action, pending] = useActionState(retryDistribution.bind(null, slug, paymentId), {
    error: null,
  });

  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <SubmitButton
        variant="ghost"
        pending={pending}
        pendingLabel="Repartiendo… (unos segundos)"
        className="w-fit py-2 text-sm"
      >
        Reintentar reparto
      </SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
