"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hotel@danncarlton.test");
  const [password, setPassword] = useState("OrillaHotel2026!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo entrar");
        return;
      }
      router.push("/pagador/lotes");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-10 bg-bg-soft px-6 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[440px] rounded-[18px] border border-line bg-white p-10 shadow-sm"
      >
        <div className="mb-6">
          <Logo href="/" />
        </div>
        <h1 className="font-display text-[28px] font-bold text-ink">
          Entrar como pagador
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Correo y contraseña. Credenciales en{" "}
          <code className="text-xs">docs/semana4/Usuarios.md</code>.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Correo">
            <Input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Contraseña">
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar al panel"}
          </Button>
        </div>
      </form>

      <aside className="hidden max-w-[420px] flex-col gap-4 md:flex">
        <h2 className="font-display text-4xl font-bold leading-tight text-ink">
          Que quien trabaja hoy, cobre hoy.
        </h2>
        <p className="text-base leading-relaxed text-ink-muted">
          Dispersa el lote del show vía Stellar (SDP) y deja que el staff cobre
          en wallet testnet. Cash-out a Bancolombia: siguiente fase.
        </p>
        <div className="h-1.5 w-[120px] rounded-full bg-orilla-gradient" />
      </aside>
    </div>
  );
}
