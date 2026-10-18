import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authenticateEmailPassword,
  encodeSession,
} from "@/lib/auth/session";

/**
 * Auth email + password (sin código mock).
 * Solo rol `pagador` obtiene cookie de panel.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Correo y contraseña requeridos" },
      { status: 400 },
    );
  }

  const session = await authenticateEmailPassword(email, password);
  if (!session) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 },
    );
  }

  if (session.userRole !== "pagador") {
    return NextResponse.json(
      {
        error:
          "Este usuario no es pagador. Músico/staff cobran por el flujo /cobrar (wallet), no el panel hotel.",
        role: session.userRole,
      },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ ok: true, session });
  res.cookies.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
