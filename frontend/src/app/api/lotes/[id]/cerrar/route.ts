import { NextResponse } from "next/server";
import { getPagadorSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createAndStartDisbursement } from "@/lib/sdp/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Cerrar la noche → disbursement real en SDP (testnet).
 * Los receptores no necesitan wallet previa: reclaman en Demo Wallet (:4000).
 */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await getPagadorSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const lote = await prisma.lote.findFirst({
    where: {
      organizationId: session.orgId,
      OR: [{ id }, { slug: id }],
    },
    include: { receptores: true },
  });
  if (!lote) {
    return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  }

  if (lote.sdpDisbursementId) {
    return NextResponse.json(
      {
        error: "Este lote ya tiene dispersión SDP",
        sdpDisbursementId: lote.sdpDisbursementId,
      },
      { status: 409 },
    );
  }

  const pending = lote.receptores.filter((r) => r.estado !== "Fallido");
  if (pending.length === 0) {
    return NextResponse.json(
      { error: "El lote no tiene receptores para pagar" },
      { status: 400 },
    );
  }

  const incomplete = pending.filter(
    (r) => !r.cedula || !r.dateOfBirth || !r.celular || !r.montoStellar,
  );
  if (incomplete.length > 0) {
    return NextResponse.json(
      {
        error:
          "Faltan cédula, celular, fecha de nacimiento o monto Stellar en algún receptor",
        receptores: incomplete.map((r) => r.nombre),
      },
      { status: 400 },
    );
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "")
    .slice(0, 15);
  const name = `orilla-${lote.slug ?? lote.id}-${stamp}`;

  let sdp;
  try {
    sdp = await createAndStartDisbursement({
      name,
      receivers: pending.map((r) => ({
        phone: r.celular!,
        id: r.cedula!,
        amount: r.montoStellar,
        verification: r.dateOfBirth!,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error SDP";
    console.error("[cerrar→SDP]", message);
    return NextResponse.json(
      { error: "No se pudo crear la dispersión en SDP", detail: message },
      { status: 502 },
    );
  }

  const now = new Date().toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const updated = await prisma.$transaction(async (tx) => {
    for (const r of pending) {
      await tx.receptor.update({
        where: { id: r.id },
        data: {
          // Listo en SDP (READY); el XLM llega al reclamar en Demo Wallet
          estado: "Pendiente",
          hash: null,
        },
      });
    }
    return tx.lote.update({
      where: { id: lote.id },
      data: {
        estado: "Listo",
        cerradoEn: now,
        sdpDisbursementId: sdp.disbursementId,
      },
      include: { receptores: true },
    });
  });

  return NextResponse.json({
    ok: true,
    lote: {
      id: updated.slug ?? updated.id,
      dbId: updated.id,
      evento: updated.evento,
      estado: updated.estado,
      cerradoEn: updated.cerradoEn,
      sdpDisbursementId: updated.sdpDisbursementId,
      receptores: updated.receptores,
    },
    integration: {
      sdp: true,
      disbursementId: sdp.disbursementId,
      status: sdp.status,
      totalPayments: sdp.totalPayments,
      asset: sdp.assetCode,
      wallet: sdp.walletName,
      dashboard: process.env.SDP_DASHBOARD_URL ?? "http://localhost:3020",
      demoWallet: process.env.SDP_DEMO_WALLET_URL ?? "http://localhost:4000",
      note: "Pagos READY. Cada receptor reclama en Demo Wallet (phone + DOB + OTP).",
    },
  });
}
