import { Logo } from "@/components/Logo";
import { Field, Input, LinkButton } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-10 bg-bg-soft px-6 py-12">
      <form
        action="/pagador/lotes"
        className="w-full max-w-[440px] rounded-[18px] border border-line bg-white p-10 shadow-sm"
      >
        <div className="mb-6">
          <Logo href="/" />
        </div>
        <h1 className="font-display text-[28px] font-bold text-ink">
          Entrar como pagador
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Hotel · productora · Carnaval SA. Demo mock — sin contraseña real.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Organización">
            <Input
              defaultValue="Hotel Dann Carlton Barranquilla"
              name="org"
              readOnly
            />
          </Field>
          <Field label="Correo">
            <Input
              defaultValue="tesoreria@danncarltonbq.com"
              name="email"
              readOnly
            />
          </Field>
          <LinkButton href="/pagador/lotes" className="w-full">
            Entrar al panel
          </LinkButton>
        </div>
      </form>

      <aside className="hidden max-w-[420px] flex-col gap-4 md:flex">
        <h2 className="font-display text-4xl font-bold leading-tight text-ink">
          Que quien trabaja hoy, cobre hoy.
        </h2>
        <p className="text-base leading-relaxed text-ink-muted">
          Dispersa el lote del show, cierra la noche y deja que el staff cobre
          en Bancolombia sin jerga crypto.
        </p>
        <div className="h-1.5 w-[120px] rounded-full bg-orilla-gradient" />
      </aside>
    </div>
  );
}
