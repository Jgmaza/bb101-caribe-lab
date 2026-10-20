"use client";

import { useActionState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { createLoteFromUpload } from "@/lib/server/lote-actions";

export function UploadForm() {
  const [state, action, pending] = useActionState(createLoteFromUpload, { error: null });

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Nombre del lote">
        <Input name="name" placeholder="Lobby Dann · viernes 19" required minLength={2} maxLength={120} />
      </Field>

      <Field
        label="Archivo CSV"
        hint="Desde Excel: Archivo → Guardar como → CSV UTF-8. Columnas típicas: nombre, usuario, celular, rol, monto o %."
      >
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full cursor-pointer text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-blue file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white"
        />
      </Field>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-bold text-ink">Cómo se reparte</legend>
        <p className="mb-3 text-xs text-ink-muted">
          Si tu Excel trae pesos por persona, elige montos. Si trae %, indica el total de la noche.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="mode" value="amounts" defaultChecked className="accent-blue" />
            Montos exactos ($)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="mode" value="percent" className="accent-blue" />
            Porcentajes (%)
          </label>
        </div>
        <div className="mt-3">
          <Field label="Total del lote en pesos (solo si usas %)">
            <Input name="total_cop" placeholder="1000000" inputMode="numeric" />
          </Field>
        </div>
      </fieldset>

      <Field label="Notas (opcional)">
        <Input name="notes" placeholder="Show lobby, 22:00" maxLength={500} />
      </Field>

      <FormError message={state.error} />

      <SubmitButton variant="cta" pending={pending} pendingLabel="Interpretando Excel…">
        Subir e interpretar
      </SubmitButton>
    </form>
  );
}
