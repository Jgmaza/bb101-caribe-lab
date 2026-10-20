import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/server/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-4 py-16 sm:px-6">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center gap-5">
          <Logo href={undefined} size="lg" />
          <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Que quien trabaja hoy, cobre hoy.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-muted">
            La empresa sube su Excel, cierra la noche y cada músico o staff ve{" "}
            <strong className="font-semibold text-ink">Te pagaron</strong> con
            comprobante en Stellar.
          </p>
          <div className="h-1.5 w-28 rounded-full bg-orilla-gradient" />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-bold text-ink">
            {user ? `Hola, ${user.display_name}` : "¿Cómo entras?"}
          </h2>
          <p className="text-sm text-ink-muted">Demo funcional sobre Stellar testnet</p>

          {user ? (
            <>
              <LinkButton href="/lotes" variant="cta" className="w-full">
                Soy empresa — lotes
              </LinkButton>
              <LinkButton href="/inicio" variant="primary" className="w-full">
                Vengo a cobrar — mi wallet
              </LinkButton>
              <LinkButton href="/proyectos" variant="ghost" className="w-full">
                Grupos con % (atajo)
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton href="/ingresar?next=/lotes" variant="cta" className="w-full">
                Soy empresa
              </LinkButton>
              <LinkButton href="/ingresar?next=/inicio" variant="primary" className="w-full">
                Vengo a cobrar
              </LinkButton>
              <LinkButton href="/registro" variant="ghost" className="w-full">
                Crear cuenta
              </LinkButton>
            </>
          )}

          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">Empresa:</strong> sube el Excel de siempre (montos o
              %), programa y cierra la noche.
            </li>
            <li>
              <strong className="text-ink">Staff / músico:</strong> saldo Orilla, Te pagaron y
              pasar a tu banco.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
