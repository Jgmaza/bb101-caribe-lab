import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { safeNext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server/session";

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? safeNext(next) : undefined;
  if (await getCurrentUser()) redirect(target ?? "/inicio");

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Para cobrar con tu grupo o pagarle a uno.">
      <AuthForm mode="registro" next={target} />
    </AuthShell>
  );
}
