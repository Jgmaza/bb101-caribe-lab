"use client";

import { useActionState, useState } from "react";
import { MembersEditor, type MemberDraft } from "@/components/MembersEditor";
import { FormError, LinkButton, SubmitButton } from "@/components/ui";
import { updateProjectMembers } from "@/lib/server/actions";

export function EditMembersForm({ slug, initial }: { slug: string; initial: MemberDraft[] }) {
  const [state, action, pending] = useActionState(updateProjectMembers.bind(null, slug), {
    error: null,
  });
  const [membersOk, setMembersOk] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-6">
      <MembersEditor initial={initial} onValidityChange={setMembersOk} />
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending} pendingLabel="Guardando…" disabled={!membersOk}>
          Guardar cambios
        </SubmitButton>
        <LinkButton href={`/proyectos/${slug}`} variant="ghost">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
