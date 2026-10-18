import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";

export default async function BancoPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell
        left={
          <Link href={`/cobrar/${memberId}/saldo`} className="font-semibold text-blue">
            ← Atrás
          </Link>
        }
      >
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <span className="rounded-full bg-[#E8F4FA] px-3 py-1 text-xs font-semibold text-blue">
            Próximamente
          </span>
          <h1 className="font-display text-[28px] font-bold text-ink">
            Enviar a Bancolombia
          </h1>
          <p className="max-w-[300px] text-[15px] leading-relaxed text-ink-muted">
            Muy pronto podrás pasar tu saldo Orilla a tu cuenta Bancolombia en
            pocos toques. Mientras tanto, tu plata está segura en tu saldo.
          </p>
          <LinkButton href={`/cobrar/${memberId}/saldo`} variant="ghost" className="mt-2 w-full">
            Volver al saldo
          </LinkButton>
        </div>
      </MobileShell>
    </div>
  );
}
