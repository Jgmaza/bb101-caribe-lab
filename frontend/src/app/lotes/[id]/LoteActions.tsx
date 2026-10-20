"use client";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
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
                const r = await closeLoteNight(loteId);
                if (r?.error) setError(r.error);
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
