import { NextResponse } from "next/server";
import { getPagadorSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getPagadorSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await prisma.lote.findMany({
    where: { organizationId: session.orgId },
    include: { receptores: true },
    orderBy: { updatedAt: "desc" },
  });

  const lotes = rows.map((l) => ({
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
      monto: r.monto,
      estado: r.estado,
      hash: r.hash ?? undefined,
      stellarAddress: r.stellarAddress ?? undefined,
    })),
  }));

  return NextResponse.json({ lotes });
}
