import { DesktopShell } from "@/components/DesktopShell";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/server/session";
import { ProjectForm } from "./ProjectForm";

export default async function NuevoProyectoPage() {
  const user = await requireUser("/proyectos/nuevo");

  return (
    <DesktopShell breadcrumb="Proyectos / Nuevo">
      <h1 className="font-display text-[32px] font-bold text-ink">
        Crear proyecto
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">
        Definan una sola vez cuánto le toca a cada uno. Cuando el bar, hotel u
        organizador pague al proyecto, Orilla reparte automáticamente.
      </p>
      <Card className="mt-6 p-5 sm:p-7">
        <ProjectForm me={{ username: user.username, displayName: user.display_name }} />
      </Card>
    </DesktopShell>
  );
}
