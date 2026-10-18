import { cookies } from "next/headers";
import type { PagadorSession } from "@/lib/domain/types";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "orilla_pagador";

export type OrillaSession = PagadorSession & {
  userId: string;
  name: string;
  userRole: string;
};

export async function authenticateEmailPassword(
  email: string,
  password: string,
): Promise<OrillaSession | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { organization: true },
  });
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    email: user.email,
    orgId: user.organizationId,
    orgName: user.organization.name,
    role: "pagador",
    userId: user.id,
    name: user.name,
    userRole: user.role,
  };
}

export async function getPagadorSession(): Promise<OrillaSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as OrillaSession;
    if (!parsed?.email || parsed.role !== "pagador") return null;
    // Solo el rol pagador opera el panel; músico/staff no
    if (parsed.userRole && parsed.userRole !== "pagador") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeSession(session: OrillaSession): string {
  return encodeURIComponent(JSON.stringify(session));
}
