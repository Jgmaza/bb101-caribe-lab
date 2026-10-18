import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";
import { safeNext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server/session";

export default async function IngresarPage({ searchParams }: PageProps<"/ingresar">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? safeNext(next) : undefined;
  if (await getCurrentUser()) redirect(target ?? "/inicio");

  return (
    <AuthShell title="Ingresa" subtitle="Con tu usuario y contraseña de Orilla.">
      <AuthForm mode="ingresar" next={target} />
    </AuthShell>
  );
}
