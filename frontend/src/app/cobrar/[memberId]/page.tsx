import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { formatPhone } from "@/lib/format";
import { getMember } from "@/lib/server/queries";
import { OtpForm } from "./OtpForm";

export default async function CobrarOtpPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const member = await getMember(memberId);
  if (!member) notFound();

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell>
        <Logo href="/" />
        <h1 className="mt-5 font-display text-[30px] font-bold text-ink">
          Hola, {member.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Verifica tu celular para ver lo que te ha pagado {member.project.name}.
          Sin saber de crypto.
        </p>
        <OtpForm memberId={member.id} phone={`+57 ${formatPhone(member.phone)}`} />
      </MobileShell>
    </div>
  );
}
