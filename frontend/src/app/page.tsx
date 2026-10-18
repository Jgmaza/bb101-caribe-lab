import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";

export default function HomePage() {
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
          <h2 className="font-display text-2xl font-bold text-ink">¿Qué quieres hacer?</h2>
          <p className="text-sm text-ink-muted">Demo funcional sobre Stellar testnet</p>
          <LinkButton href="/proyectos/nuevo" variant="cta" className="w-full">
            Crear proyecto · somos un grupo
          </LinkButton>
          <LinkButton href="/cobrar" variant="primary" className="w-full">
            Soy integrante · ver lo que me pagaron
          </LinkButton>
          <p className="text-xs leading-relaxed text-ink-muted">
            ¿Vas a pagarle a un grupo? Pídele su link de pago: se ve como{" "}
            <code className="rounded bg-bg-soft px-1">/pagar/nombre-del-grupo</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
