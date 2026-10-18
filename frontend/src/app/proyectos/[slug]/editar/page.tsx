import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, LinkButton } from "@/components/ui";
import { getProjectAccess, getProjectMembers } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { EditMembersForm } from "./EditMembersForm";

export default async function EditarProyectoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/proyectos/${encodeURIComponent(slug)}/editar`);
  const access = await getProjectAccess(slug, user.id);
  if (!access?.membership) notFound();
  const { project, membership } = access;
  const members = await getProjectMembers(project.id);

  if (!membership.is_admin) {
    const admins = members.filter((m) => m.is_admin).map((m) => m.user.display_name);
    return (
      <DesktopShell breadcrumb={`Proyectos / ${project.name} / Editar`}>
        <Card className="mx-auto mt-6 max-w-xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">
            Solo los admins pueden editar este proyecto
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Si quieres cambiar los porcentajes o los integrantes, pídeselo a{" "}
            {admins.join(", ")}. También te pueden nombrar admin.
          </p>
          <LinkButton href={`/proyectos/${slug}`} variant="ghost" className="mt-5">
            Volver al proyecto
          </LinkButton>
        </Card>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell breadcrumb={`Proyectos / ${project.name} / Editar`}>
      <h1 className="font-display text-[32px] font-bold text-ink">Editar proyecto</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">
        Cambia porcentajes, roles, integrantes y admins. Los cambios aplican a los
        próximos pagos y quedan en el historial que ven todos los integrantes.
      </p>
      <Card className="mt-6 p-5 sm:p-7">
        <EditMembersForm
          slug={slug}
          initial={members.map((m) => ({
            key: m.id,
            username: m.user.username,
            displayName: m.user_id === user.id ? `${m.user.display_name} (tú)` : m.user.display_name,
            role: m.role,
            pct: String(m.share_bps / 100),
            isAdmin: m.is_admin,
          }))}
        />
      </Card>
    </DesktopShell>
  );
}
