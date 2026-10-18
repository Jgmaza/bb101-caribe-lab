import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { Card, LinkButton } from "@/components/ui";
import { logout } from "@/lib/server/auth-actions";
import { requireUser } from "@/lib/server/session";

export default async function InicioPage() {
  const user = await requireUser("/inicio");

  return (
    <MobileShell
      left={<Logo href="/inicio" size="sm" />}
      right={
        <form action={logout}>
          <button type="submit" className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-blue">
            Salir
          </button>
        </form>
      }
    >
      <p className="mt-2 text-sm text-ink-muted">Hola,</p>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{user.display_name}</h1>
      <p className="text-sm text-ink-muted">@{user.username}</p>

      <Card className="mt-6 p-5">
        <p className="text-xs font-semibold text-ink-muted">Saldo disponible</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">—</p>
        <p className="mt-1 text-xs text-ink-muted">Tu cuenta ya está lista para recibir pagos.</p>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        <LinkButton href="/proyectos/nuevo" variant="cta" className="w-full">
          Crear proyecto
        </LinkButton>
      </div>
    </MobileShell>
  );
}
