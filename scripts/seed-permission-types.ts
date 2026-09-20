import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_PERMISSION_TYPES = [
  {
    name: "Izin Datang Terlambat",
    code: "LATE_ARRIVAL",
    category: "HOURLY",
    description: "Izin keterlambatan hadir karena kendala lalu lintas / darurat (Maks. 2 jam)",
    isPaid: true,
    requiresAttachment: false,
    maxHours: 2.0,
    isActive: true,
  },
  {
    name: "Izin Pulang Lebih Awal",
    code: "EARLY_LEAVE",
    category: "HOURLY",
    description: "Izin pulang sebelum jam kantor berakhir karena urusan mendesak (Maks. 2 jam)",
    isPaid: true,
    requiresAttachment: false,
    maxHours: 2.0,
    isActive: true,
  },
  {
    name: "Izin Meninggalkan Kantor Sementara",
    code: "OUT_OFFICE",
    category: "HOURLY",
    description: "Izin keluar kantor sementara pada jam kerja untuk urusan tertentu (Maks. 4 jam)",
    isPaid: true,
    requiresAttachment: false,
    maxHours: 4.0,
    isActive: true,
  },
  {
    name: "Izin Tidak Masuk Kerja (Urusan Pribadi)",
    code: "PERSONAL",
    category: "DAILY",
    description: "Izin berhalangan hadir 1 hari penuh karena urusan keluarga/pribadi mendesak",
    isPaid: true,
    requiresAttachment: false,
    maxDaysPerMonth: 2,
    isActive: true,
  },
  {
    name: "Izin Sakit Tanpa Surat Dokter",
    code: "SICK_NO_CERT",
    category: "DAILY",
    description: "Izin tidak masuk kerja karena sakit ringan (1 hari tanpa periksa dokter)",
    isPaid: true,
    requiresAttachment: false,
    maxDaysPerMonth: 1,
    isActive: true,
  },
  {
    name: "Izin Tugas / Dinas Luar",
    code: "DUTY_OUT",
    category: "HOURLY",
    description: "Izin menghadiri meeting klien, dinas luar, atau seminar kedinasan",
    isPaid: true,
    requiresAttachment: true,
    maxHours: 8.0,
    isActive: true,
  },
  {
    name: "Izin Keperluan Khusus / Darurat",
    code: "EMERGENCY",
    category: "DAILY",
    description: "Izin untuk kondisi darurat bencana alam atau situasi mendesak keluarga",
    isPaid: true,
    requiresAttachment: true,
    maxDaysPerMonth: 3,
    isActive: true,
  },
];

export async function seedPermissionTypesForCompany(companyId: string) {
  const createdTypes = [];

  for (const pt of DEFAULT_PERMISSION_TYPES) {
    const existing = await prisma.permissionType.findFirst({
      where: { companyId, code: pt.code },
    });

    let type;
    if (!existing) {
      type = await prisma.permissionType.create({
        data: {
          companyId,
          name: pt.name,
          code: pt.code,
          category: pt.category,
          description: pt.description,
          isPaid: pt.isPaid,
          requiresAttachment: pt.requiresAttachment,
          maxHours: pt.maxHours || null,
          maxDaysPerMonth: pt.maxDaysPerMonth || null,
          isActive: pt.isActive,
        },
      });
    } else {
      type = await prisma.permissionType.update({
        where: { id: existing.id },
        data: {
          name: pt.name,
          category: pt.category,
          description: pt.description,
          isPaid: pt.isPaid,
          requiresAttachment: pt.requiresAttachment,
          maxHours: pt.maxHours || null,
          maxDaysPerMonth: pt.maxDaysPerMonth || null,
          isActive: pt.isActive,
        },
      });
    }
    createdTypes.push(type);
  }

  return createdTypes;
}

async function main() {
  console.log("🌸 Seeding 7 Permission Types for all companies...");
  const companies = await prisma.company.findMany();
  for (const comp of companies) {
    console.log(`- Seeding permission types for company: ${comp.name} (${comp.code})`);
    await seedPermissionTypesForCompany(comp.id);
  }
  console.log("✅ Permission types successfully seeded!");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
