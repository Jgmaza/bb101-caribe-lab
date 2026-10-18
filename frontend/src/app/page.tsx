import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-6 py-16">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center gap-5">
          <Logo href={undefined} />
          <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Que quien trabaja hoy, cobre hoy.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-muted">
            El pagador cierra la noche; el músico/staff ve{" "}
            <strong className="font-semibold text-ink">Te pagaron</strong> y
            recibe en wallet Stellar (testnet vía SDP). Cash-out a Bancolombia:
            fase siguiente.
          </p>
          <div className="h-1.5 w-28 rounded-full bg-orilla-gradient" />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-ink">
            Elegir recorrido
          </h2>
          <p className="text-sm text-ink-muted">
            Admin desktop-first · Staff mobile-first
          </p>
          <LinkButton href="/pagador/login" variant="cta" className="w-full">
            Soy pagador — cerrar la noche
          </LinkButton>
          <LinkButton href="/cobrar/laura" variant="primary" className="w-full">
            Soy staff — cobrar (Laura)
          </LinkButton>
          <LinkButton
            href="/pagador/lotes/carnaval"
            variant="ghost"
            className="w-full"
          >
            Ver donaciones Carnaval SA (%)
          </LinkButton>
        </section>
      </div>
    </div>
  );
}
