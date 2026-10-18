"use client";

import { useActionState } from "react";
import { MembersEditor, type MemberDraft } from "@/components/MembersEditor";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { createProject } from "@/lib/server/actions";

const INITIAL_MEMBERS: MemberDraft[] = [
  { key: "init-0", name: "", phone: "", role: "", pct: "" },
  { key: "init-1", name: "", phone: "", role: "", pct: "" },
];

export function ProjectForm() {
  const [state, action, pending] = useActionState(createProject, { error: null });

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <Field label="Nombre del proyecto">
          <Input name="name" placeholder="Los Pescadores del Rock" required minLength={2} maxLength={120} />
        </Field>
        <Field label="Tipo">
          <select
            name="kind"
            defaultValue="banda"
            className="w-full cursor-pointer rounded-[10px] border border-line bg-bg-soft px-3.5 py-3 text-sm text-ink outline-none focus:border-blue focus-visible:ring-2 focus-visible:ring-blue/40"
          >
            <option value="banda">Banda / grupo musical</option>
            <option value="staff">Staff de evento</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
      </div>

      <div>
        <h2 className="text-sm font-bold text-ink">Integrantes y porcentajes</h2>
        <p className="mt-1 mb-4 text-xs text-ink-muted">
          Lo que acuerden aquí se aplica a cada pago que reciba el proyecto. Los
          porcentajes deben sumar 100%.
        </p>
        <MembersEditor initial={INITIAL_MEMBERS} editablePhone canAddRemove />
      </div>

      <FormError message={state.error} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SubmitButton variant="cta" pending={pending} pendingLabel="Creando cuentas en Stellar…">
          Crear proyecto
        </SubmitButton>
        <p className="text-xs text-ink-muted">
          Orilla crea una cuenta para el proyecto y una para cada integrante.
          Nadie necesita saber de crypto.
        </p>
      </div>
    </form>
  );
}
