import { NextResponse } from "next/server";
import { getClaimView, syncClaimFromSdp } from "@/lib/cobrar/claim";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const claim = await getClaimView(token);
  if (!claim) {
    return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ claim });
}

/** Fuerza sync con SDP (útil tras claim en Demo Wallet). */
export async function POST(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  try {
    const claim = await syncClaimFromSdp(token);
    if (!claim) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, claim });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error SDP";
    return NextResponse.json(
      { error: "No se pudo sincronizar con SDP", detail: message },
      { status: 502 },
    );
  }
}
