import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Contraseñas demo — también en docs/semana4/Usuarios.md */
const PASSWORDS = {
  hotel: "OrillaHotel2026!",
  musico: "OrillaMusico2026!",
  staff: "OrillaStaff2026!",
};

async function main() {
  const dann = await prisma.organization.upsert({
    where: { slug: "dann-carlton" },
    update: {
      name: "Hotel Dann Carlton Barranquilla",
      distributionPublicKey:
        "GCFZOHAECRE3OMPCAF65CQSVWNZOTHW24MFRGOVU2ER7XH7ESNICGMV4",
    },
    create: {
      slug: "dann-carlton",
      name: "Hotel Dann Carlton Barranquilla",
      distributionPublicKey:
        "GCFZOHAECRE3OMPCAF65CQSVWNZOTHW24MFRGOVU2ER7XH7ESNICGMV4",
    },
  });

  const carnaval = await prisma.organization.upsert({
    where: { slug: "carnaval-sa" },
    update: { name: "Carnaval SA" },
    create: { slug: "carnaval-sa", name: "Carnaval SA" },
  });

  const hotelHash = await bcrypt.hash(PASSWORDS.hotel, 10);
  const musicoHash = await bcrypt.hash(PASSWORDS.musico, 10);
  const staffHash = await bcrypt.hash(PASSWORDS.staff, 10);

  await prisma.user.upsert({
    where: { email: "hotel@danncarlton.test" },
    update: {
      passwordHash: hotelHash,
      name: "Tesorería Dann Carlton",
      role: "pagador",
      cedula: "900123456-1",
      phone: "+573001111001",
      dateOfBirth: "1980-05-15",
      organizationId: dann.id,
    },
    create: {
      email: "hotel@danncarlton.test",
      passwordHash: hotelHash,
      name: "Tesorería Dann Carlton",
      role: "pagador",
      cedula: "900123456-1",
      phone: "+573001111001",
      dateOfBirth: "1980-05-15",
      organizationId: dann.id,
    },
  });

  const musico = await prisma.user.upsert({
    where: { email: "musico@orilla.test" },
    update: {
      passwordHash: musicoHash,
      name: "Sergio Mancilla",
      role: "musico",
      cedula: "1001234567",
      phone: "+573001112233",
      dateOfBirth: "1995-08-20",
      organizationId: dann.id,
    },
    create: {
      email: "musico@orilla.test",
      passwordHash: musicoHash,
      name: "Sergio Mancilla",
      role: "musico",
      cedula: "1001234567",
      phone: "+573001112233",
      dateOfBirth: "1995-08-20",
      organizationId: dann.id,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@orilla.test" },
    update: {
      passwordHash: staffHash,
      name: "Laura Méndez",
      role: "staff",
      cedula: "1007654321",
      phone: "+573007654321",
      dateOfBirth: "1992-03-10",
      organizationId: dann.id,
    },
    create: {
      email: "staff@orilla.test",
      passwordHash: staffHash,
      name: "Laura Méndez",
      role: "staff",
      cedula: "1007654321",
      phone: "+573007654321",
      dateOfBirth: "1992-03-10",
      organizationId: dann.id,
    },
  });

  // Lote demo: show lobby — receptores = músico + staff (cédula = id SDP)
  await prisma.lote.upsert({
    where: { slug: "dann-lobby" },
    update: {
      evento: "Show lobby — Dann Carlton",
      tipo: "Staff / músicos",
      estado: "Borrador",
      total: 900_000,
      personas: 2,
      cerradoEn: null,
      sdpDisbursementId: null,
      organizationId: dann.id,
    },
    create: {
      slug: "dann-lobby",
      evento: "Show lobby — Dann Carlton",
      tipo: "Staff / músicos",
      estado: "Borrador",
      total: 900_000,
      personas: 2,
      organizationId: dann.id,
    },
  });

  const lote = await prisma.lote.findUniqueOrThrow({
    where: { slug: "dann-lobby" },
  });

  await prisma.receptor.deleteMany({ where: { loteId: lote.id } });

  await prisma.receptor.createMany({
    data: [
      {
        id: "recv-musico",
        loteId: lote.id,
        nombre: musico.name,
        rol: "Batería / músico",
        email: musico.email,
        celular: musico.phone,
        cedula: musico.cedula,
        dateOfBirth: musico.dateOfBirth,
        monto: 450_000,
        montoStellar: "2",
        estado: "Pendiente",
      },
      {
        id: "recv-staff",
        loteId: lote.id,
        nombre: staff.name,
        rol: "Staff sonido",
        email: staff.email,
        celular: staff.phone,
        cedula: staff.cedula,
        dateOfBirth: staff.dateOfBirth,
        monto: 450_000,
        montoStellar: "1",
        estado: "Pendiente",
      },
    ],
  });

  // Carnaval org placeholder (sin usuarios de login por ahora)
  await prisma.lote.upsert({
    where: { slug: "carnaval-donaciones" },
    update: {},
    create: {
      slug: "carnaval-donaciones",
      evento: "Carnaval SA — donaciones (fase 2)",
      tipo: "Donaciones %",
      estado: "Programado",
      total: 28_400_000,
      personas: 5,
      organizationId: carnaval.id,
    },
  });

  console.log("Seed OK");
  console.log("  hotel@danncarlton.test /", PASSWORDS.hotel);
  console.log("  musico@orilla.test /", PASSWORDS.musico);
  console.log("  staff@orilla.test /", PASSWORDS.staff);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
