"use client";

import { useActionState } from "react";
import { MembersEditor, type MemberDraft } from "@/components/MembersEditor";
import { FormError, LinkButton, SubmitButton } from "@/components/ui";
import { updateMembers } from "@/lib/server/actions";

export function EditMembersForm({ slug, initial }: { slug: string; initial: MemberDraft[] }) {
  const [state, action, pending] = useActionState(updateMembers.bind(null, slug), {
    error: null,
  });

  return (
    <form action={action} className="flex flex-col gap-6">
      <MembersEditor initial={initial} editablePhone={false} canAddRemove={false} />
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending} pendingLabel="Guardando…">
          Guardar porcentajes
        </SubmitButton>
        <LinkButton href={`/proyectos/${slug}`} variant="ghost">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}
