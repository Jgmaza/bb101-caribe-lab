import { NextResponse } from "next/server";
import { getPagadorSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function findLote(id: string, orgId: string) {
  return prisma.lote.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ id }, { slug: id }],
    },
    include: { receptores: true },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getPagadorSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const l = await findLote(id, session.orgId);
  if (!l) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    lote: {
      id: l.slug ?? l.id,
      dbId: l.id,
      evento: l.evento,
      tipo: l.tipo,
      personas: l.personas,
      total: l.total,
      estado: l.estado,
      cerradoEn: l.cerradoEn ?? undefined,
      org: session.orgName,
      orgId: l.organizationId,
      sdpDisbursementId: l.sdpDisbursementId ?? undefined,
      receptores: l.receptores.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        rol: r.rol,
        email: r.email ?? undefined,
        celular: r.celular,
        cedula: r.cedula ?? undefined,
        monto: r.monto,
        montoStellar: r.montoStellar,
        estado: r.estado,
        hash: r.hash ?? undefined,
      })),
    },
  });
}
