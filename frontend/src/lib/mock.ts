export type LoteStatus = "Listo" | "Programado" | "Borrador";
export type PagoStatus = "Ok" | "Pendiente" | "Fallido";

export type Receptor = {
  id: string;
  nombre: string;
  rol: string;
  celular: string;
  monto: number;
  estado: PagoStatus;
  hash?: string;
};

export type Lote = {
  id: string;
  evento: string;
  tipo: string;
  personas: number;
  total: number;
  estado: LoteStatus;
  cerradoEn?: string;
  org: string;
  receptores: Receptor[];
};

export const ORG_DEMO = "Hotel Dann Carlton Barranquilla";

export const lotes: Lote[] = [
  {
    id: "dann-lobby",
    evento: "Show lobby — Dann Carlton",
    tipo: "Staff / músicos",
    personas: 5,
    total: 2_040_000,
    estado: "Listo",
    cerradoEn: "11 oct 2026 · 22:41",
    org: ORG_DEMO,
    receptores: [
      {
        id: "laura",
        nombre: "Laura Méndez",
        rol: "Batería",
        celular: "300 555 0142",
        monto: 450_000,
        estado: "Ok",
        hash: "a1b29f3e7c4d…8842",
      },
      {
        id: "andres",
        nombre: "Andrés Pérez",
        rol: "Sonido",
        celular: "300 555 0188",
        monto: 380_000,
        estado: "Ok",
        hash: "b2c38a1d9e0f…1120",
      },
      {
        id: "camila",
        nombre: "Camila Ríos",
        rol: "Voces",
        celular: "301 555 0221",
        monto: 520_000,
        estado: "Ok",
        hash: "c3d47b2e0f1a…3341",
      },
      {
        id: "julian",
        nombre: "Julián Castro",
        rol: "Seguridad",
        celular: "302 555 0334",
        monto: 280_000,
        estado: "Pendiente",
      },
      {
        id: "sofia",
        nombre: "Sofía Acosta",
        rol: "Producción",
        celular: "300 555 0410",
        monto: 410_000,
        estado: "Ok",
        hash: "d4e58c3f1a2b…5509",
      },
    ],
  },
  {
    id: "carnaval-donaciones",
    evento: "Carnaval SA — donaciones pre-días",
    tipo: "Donaciones %",
    personas: 5,
    total: 28_400_000,
    estado: "Programado",
    org: "Carnaval SA",
    receptores: [],
  },
  {
    id: "feria-expo",
    evento: "Feria Expo — staff noche 2",
    tipo: "Staff",
    personas: 18,
    total: 6_120_000,
    estado: "Borrador",
    org: ORG_DEMO,
    receptores: [],
  },
];

export const carnavalBeneficiarios = [
  {
    nombre: "Fundación Comparsa del Río",
    rol: "Comparsa",
    pct: 35,
    monto: 9_940_000,
  },
  {
    nombre: "Colectivo Danza Sur",
    rol: "Danza",
    pct: 20,
    monto: 5_680_000,
  },
  {
    nombre: "Escuela de Batucada",
    rol: "Música",
    pct: 18,
    monto: 5_112_000,
  },
  {
    nombre: "Staff logístico Carnaval",
    rol: "Staff",
    pct: 15,
    monto: 4_260_000,
  },
  {
    nombre: "Reserva operativa",
    rol: "Operación",
    pct: 12,
    monto: 3_408_000,
  },
];

export const workerDemo = {
  token: "laura",
  nombre: "Laura Méndez",
  celular: "+57 300 555 0142",
  otpMock: "4821",
  monto: 450_000,
  rol: "Batería",
  evento: "Show lobby — Hotel Dann Carlton",
  pagador: "Tesorería Dann Carlton",
  hora: "hoy 22:41",
  banco: "Bancolombia",
  cuenta: "•••• 8842",
  hash: "a1b29f3e7c4d…8842",
};

export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getLote(id: string) {
  return lotes.find((l) => l.id === id);
}
