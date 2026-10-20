"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormError } from "@/components/ui";
import { closeLoteNight, scheduleLote } from "@/lib/server/lote-actions";

export function LoteActions({
  loteId,
  canSchedule,
  canClose,
}: {
  loteId: string;
  canSchedule: boolean;
  canClose: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      {pending ? (
        <p className="text-sm text-ink-muted">
          Recargando USDC y enviando pagos… esto puede tardar hasta ~2 min. No cierres la pestaña.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canSchedule ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await scheduleLote(loteId);
                if (r.error) setError(r.error);
                else router.refresh();
              })
            }
          >
            Programar (sin pagar aún)
          </Button>
        ) : null}
        {canClose ? (
          <Button
            type="button"
            variant="cta"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                try {
                  const r = await closeLoteNight(loteId);
                  if (r?.error) setError(r.error);
                  else router.refresh();
                } catch {
                  // redirect() lanza; o el fetch cortó: refresca por si ya cerró on-chain
                  router.refresh();
                }
              })
            }
          >
            {pending ? "Cerrando la noche…" : "Cerrar la noche"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
