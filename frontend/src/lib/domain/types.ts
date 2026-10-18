/** Dominio Orilla — independiente del mock UI y del SDP. */

export type LoteStatus = "Borrador" | "Programado" | "Listo" | "Cerrando" | "Pagado";
export type PagoStatus = "Pendiente" | "Ok" | "Fallido";

export type Receptor = {
  id: string;
  nombre: string;
  rol: string;
  email?: string;
  celular: string;
  cedula?: string;
  monto: number;
  montoStellar?: string;
  estado: PagoStatus;
  /** Hash real de tx Stellar cuando exista integración SDP/pago. */
  hash?: string;
  stellarAddress?: string;
};

export type Lote = {
  id: string;
  evento: string;
  tipo: string;
  org: string;
  orgId: string;
  personas: number;
  total: number;
  estado: LoteStatus;
  cerradoEn?: string;
  receptores: Receptor[];
  /** ID de disbursement en SDP cuando se cablee. */
  sdpDisbursementId?: string;
};

export type PagadorSession = {
  email: string;
  orgId: string;
  orgName: string;
  role: "pagador";
};
