import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/server/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-4 py-16 sm:px-6">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center gap-5">
          <Logo href={undefined} />
          <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Que quien trabaja hoy, cobre hoy.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-muted">
            Tu grupo acuerda una vez cuánto le toca a cada uno. El bar, hotel u
            organizador hace{" "}
            <strong className="font-semibold text-ink">un solo pago</strong> y
            Orilla lo reparte al instante, con comprobante para todos.
          </p>
          <div className="h-1.5 w-28 rounded-full bg-orilla-gradient" />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-bold text-ink">
            {user ? `Hola, ${user.display_name}` : "Empieza aquí"}
          </h2>
          <p className="text-sm text-ink-muted">Demo funcional sobre Stellar testnet</p>
          {user ? (
            <LinkButton href="/inicio" variant="cta" className="w-full">
              Ir a mi inicio
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/registro" variant="cta" className="w-full">
                Crear cuenta
              </LinkButton>
              <LinkButton href="/ingresar" variant="ghost" className="w-full">
                Ingresar
              </LinkButton>
            </>
          )}
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-ink-muted">
            <li>
              <strong className="text-ink">¿Eres parte de un grupo?</strong> Crea tu
              cuenta y pídele a quien administra el proyecto que te agregue por tu
              usuario.
            </li>
            <li>
              <strong className="text-ink">¿Vas a pagarle a un grupo?</strong> Pídele
              su link de pago: se ve como{" "}
              <code className="rounded bg-bg-soft px-1">/pagar/nombre-del-grupo</code>.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
