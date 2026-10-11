import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { OtpForm } from "./OtpForm";

export default async function CobrarOtpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell>
        <Logo href="/" />
        <h1 className="mt-5 font-display text-[30px] font-bold text-ink">
          Verifica tu celular
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Paso 1 de 3 · Te enviamos un código para cobrar el show del Dann
          Carlton. En dos toques más activamos tu cobro — sin saber de crypto.
        </p>
        <OtpForm token={token} />
      </MobileShell>
    </div>
  );
}
