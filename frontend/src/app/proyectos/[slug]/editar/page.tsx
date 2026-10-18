import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
import { Card } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { getProjectBySlug, getProjectMembers } from "@/lib/server/queries";
import { EditMembersForm } from "./EditMembersForm";

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const members = await getProjectMembers(project.id);

  return (
    <DesktopShell breadcrumb={`Proyectos / ${project.name} / Editar`}>
      <h1 className="font-display text-[32px] font-bold text-ink">Editar porcentajes</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">
        Los cambios aplican a los próximos pagos. Los pagos ya repartidos
        conservan el porcentaje que tenían en su momento.
      </p>
      <Card className="mt-6 p-5 sm:p-7">
        <EditMembersForm
          slug={slug}
          initial={members.map((m) => ({
            key: m.id,
            id: m.id,
            name: m.name,
            phone: formatPhone(m.phone),
            role: m.role,
            pct: String(m.share_bps / 100),
          }))}
        />
      </Card>
    </DesktopShell>
  );
}
