"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MIN_PASSWORD } from "@/lib/auth";
import { login, register } from "@/lib/server/auth-actions";
import { Field, FormError, Input, SubmitButton } from "./ui";

/** Formulario de registro o ingreso. `next` es la ruta a la que vuelve al terminar. */
export function AuthForm({ mode, next }: { mode: "registro" | "ingresar"; next?: string }) {
  const isRegister = mode === "registro";
  const [state, action, pending] = useActionState(isRegister ? register : login, { error: null });
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Usuario">
        <Input
          name="username"
          defaultValue={state.username}
          placeholder="laura"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={21}
        />
      </Field>
      {isRegister ? (
        <Field label="Tu nombre (así te verán en los proyectos)">
          <Input
            name="display_name"
            defaultValue={state.displayName}
            placeholder="Laura Martínez"
            autoComplete="name"
            required
            minLength={2}
            maxLength={60}
          />
        </Field>
      ) : null}
      <Field label="Contraseña">
        <Input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? MIN_PASSWORD : 1}
        />
      </Field>
      {isRegister ? (
        <p className="text-xs text-ink-muted">
          Usuario: 3 a 20 letras sin tildes, números o _. Contraseña: mínimo {MIN_PASSWORD}{" "}
          caracteres. Guárdala bien: por ahora no se puede recuperar.
        </p>
      ) : null}

      <FormError message={state.error} />
      <SubmitButton
        variant="cta"
        pending={pending}
        pendingLabel={isRegister ? "Creando tu cuenta…" : "Ingresando…"}
        className="w-full"
      >
        {isRegister ? "Crear cuenta" : "Ingresar"}
      </SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
        <Link
          href={`/${isRegister ? "ingresar" : "registro"}${query}`}
          className="font-semibold text-blue hover:underline"
        >
          {isRegister ? "Ingresa" : "Crea una"}
        </Link>
      </p>
    </form>
  );
}
