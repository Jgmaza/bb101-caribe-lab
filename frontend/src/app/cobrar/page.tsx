import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { Button, Field, Input } from "@/components/ui";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { findMembersByPhone } from "@/lib/server/queries";
import { bpsToPercent } from "@/lib/split";

export default async function BuscarCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ celular?: string }>;
}) {
  const { celular = "" } = await searchParams;
  const phone = normalizePhone(celular);
  const searched = celular !== "";
  const matches = isValidPhone(phone) ? await findMembersByPhone(phone) : [];

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell>
        <Logo href="/" />
        <h1 className="mt-5 font-display text-[30px] font-bold text-ink">Cobrar</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Escribe tu celular para ver los proyectos en los que cobras.
        </p>

        <form className="mt-6 flex flex-col gap-4">
          <Field label="Celular">
            <Input
              name="celular"
              inputMode="tel"
              placeholder="300 555 0142"
              defaultValue={celular}
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            Buscar
          </Button>
        </form>

        {searched && !isValidPhone(phone) ? (
          <p className="mt-4 text-sm text-danger">El celular debe tener entre 10 y 12 dígitos.</p>
        ) : null}
        {searched && isValidPhone(phone) && matches.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No encontramos proyectos con ese celular. Pídele a tu grupo que te
            agregue.
          </p>
        ) : null}

        {matches.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-3">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/cobrar/${m.id}`}
                  className="flex items-center justify-between rounded-[14px] border border-line p-4 hover:bg-bg-soft"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{m.project.name}</p>
                    <p className="text-xs text-ink-muted">
                      {m.name} · {m.role || "Integrante"} · {bpsToPercent(m.share_bps)}%
                    </p>
                  </div>
                  <span className="text-blue">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </MobileShell>
    </div>
  );
}
