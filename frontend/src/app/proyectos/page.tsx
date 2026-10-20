import Link from "next/link";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, LinkButton } from "@/components/ui";
import { KIND_LABEL } from "@/lib/format";
import { getUserProjects } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { bpsToPercent } from "@/lib/split";

/** Atajo: grupos con % y link /pagar (modelo Sergio). El camino hotel es /lotes. */
export default async function ProyectosIndexPage() {
  const user = await requireUser("/proyectos");
  const projects = await getUserProjects(user.id);

  return (
    <DesktopShell breadcrumb="Grupos %">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-blue uppercase">Atajo</p>
          <h1 className="font-display text-[32px] font-bold text-ink">Grupos con porcentaje</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Para bandas que acuerdan % y comparten un link de pago. Si eres empresa, usa{" "}
            <Link href="/lotes" className="font-semibold text-blue hover:underline">
              Lotes + Excel
            </Link>
            .
          </p>
        </div>
        <LinkButton href="/proyectos/nuevo" variant="cta">
          Crear grupo
        </LinkButton>
      </div>

      {!projects.length ? (
        <Card className="mt-8 p-6 text-sm text-ink-muted">No estás en ningún grupo aún.</Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.project.id}>
              <Link
                href={`/proyectos/${p.project.slug}`}
                className="flex items-center justify-between rounded-[14px] border border-line bg-white p-5 hover:border-blue"
              >
                <div>
                  <p className="font-semibold text-ink">{p.project.name}</p>
                  <p className="text-xs text-ink-muted">{KIND_LABEL[p.project.kind]}</p>
                </div>
                <p className="font-display text-lg font-bold text-blue">{bpsToPercent(p.share_bps)}%</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DesktopShell>
  );
}
