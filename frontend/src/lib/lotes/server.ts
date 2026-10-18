import { redirect } from "next/navigation";
import { getPagadorSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { Lote, Receptor } from "@/lib/domain/types";

function mapReceptor(r: {
  id: string;
  nombre: string;
  rol: string;
  email: string | null;
  celular: string;
  cedula: string | null;
  monto: number;
  montoStellar: string;
  estado: string;
  hash: string | null;
  stellarAddress: string | null;
}): Receptor & { cedula?: string; montoStellar?: string } {
  return {
    id: r.id,
    nombre: r.nombre,
    rol: r.rol,
    email: r.email ?? undefined,
    celular: r.celular,
    cedula: r.cedula ?? undefined,
    monto: r.monto,
    montoStellar: r.montoStellar,
    estado: r.estado as Receptor["estado"],
    hash: r.hash ?? undefined,
    stellarAddress: r.stellarAddress ?? undefined,
  };
}

export async function requirePagador() {
  const session = await getPagadorSession();
  if (!session) redirect("/pagador/login");
  return session;
}

export async function getLoteForPagador(
  idOrSlug: string,
): Promise<(Lote & { dbId: string; cedulasOk: boolean }) | null> {
  const session = await requirePagador();
  const l = await prisma.lote.findFirst({
    where: {
      organizationId: session.orgId,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: { receptores: true },
  });
  if (!l) return null;

  const receptores = l.receptores.map(mapReceptor);
  const cedulasOk = l.receptores.every(
    (r) => r.cedula && r.dateOfBirth && r.celular && r.montoStellar,
  );

  return {
    id: l.slug ?? l.id,
    dbId: l.id,
    evento: l.evento,
    tipo: l.tipo,
    org: session.orgName,
    orgId: l.organizationId,
    personas: l.personas,
    total: l.total,
    estado: l.estado as Lote["estado"],
    cerradoEn: l.cerradoEn ?? undefined,
    sdpDisbursementId: l.sdpDisbursementId ?? undefined,
    receptores,
    cedulasOk,
  };
}

export async function listLotesForPagador(): Promise<Lote[]> {
  const session = await requirePagador();
  const rows = await prisma.lote.findMany({
    where: { organizationId: session.orgId },
    include: { receptores: true },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((l) => ({
    id: l.slug ?? l.id,
    evento: l.evento,
    tipo: l.tipo,
    org: session.orgName,
    orgId: l.organizationId,
    personas: l.personas,
    total: l.total,
    estado: l.estado as Lote["estado"],
    cerradoEn: l.cerradoEn ?? undefined,
    sdpDisbursementId: l.sdpDisbursementId ?? undefined,
    receptores: l.receptores.map(mapReceptor),
  }));
}
