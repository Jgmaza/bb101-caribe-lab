"use client";

import Link from "next/link";
import { type FormEvent, useActionState, useState } from "react";
import { MIN_PASSWORD } from "@/lib/auth";
import { login, register } from "@/lib/server/auth-actions";
import { Field, FormError, Input, SubmitButton } from "./ui";

/** Formulario de registro o ingreso. `next` es la ruta a la que vuelve al terminar. */
export function AuthForm({ mode, next }: { mode: "registro" | "ingresar"; next?: string }) {
  const isRegister = mode === "registro";
  const [state, action, pending] = useActionState(isRegister ? register : login, { error: null });
  const [mismatch, setMismatch] = useState(false);
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  // React limpia todo el formulario tras cada envío, así que la coincidencia se revisa aquí:
  // si falla no se envía y solo se borra la confirmación. El servidor vuelve a validarla.
  function checkPasswords(e: FormEvent<HTMLFormElement>) {
    if (!isRegister) return;
    const form = e.currentTarget;
    const confirm = form.elements.namedItem("password_confirm") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    const differ = password.value !== confirm.value;
    setMismatch(differ);
    if (differ) {
      e.preventDefault();
      confirm.value = "";
      confirm.focus();
    }
  }

  return (
    <form action={action} onSubmit={checkPasswords} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        label="Username"
        hint={
          isRegister
            ? "Es tu identificador único en Orilla: con él te encuentran y te agregan a los proyectos como @username. Usa de 3 a 20 letras sin tildes, números o _."
            : undefined
        }
      >
        <Input
          name="username"
          defaultValue={state.username}
          placeholder="laura"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={20}
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
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        minLength={isRegister ? MIN_PASSWORD : 1}
        hint={
          isRegister
            ? `Mínimo ${MIN_PASSWORD} caracteres. Guárdala bien: por ahora no se puede recuperar.`
            : undefined
        }
      />
      {isRegister ? (
        <PasswordField
          label="Confirmar contraseña"
          name="password_confirm"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
        />
      ) : null}

      <FormError message={mismatch ? "Las contraseñas no coinciden." : state.error} />
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

/** Campo de contraseña con botón para verla u ocultarla. */
function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  hint,
}: {
  label: string;
  name: string;
  autoComplete: string;
  minLength: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={minLength}
          className="pr-20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Ver ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 cursor-pointer rounded-r-[10px] px-3.5 text-xs font-semibold text-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
        >
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
    </Field>
  );
}
