import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_LEAVE_TYPES = [
  {
    name: "Cuti Tahunan",
    code: "ANNUAL",
    description: "Liburan, keperluan pribadi",
    defaultEntitlement: 12,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 3,
    allowHalfDay: true,
    isActive: true,
  },
  {
    name: "Cuti Sakit",
    code: "SICK",
    description: "Sakit / berobat (Wajib melampirkan Surat Keterangan Dokter)",
    defaultEntitlement: 14,
    isPaid: true,
    requiresAttachment: true,
    minNoticeDays: 0,
    allowHalfDay: true,
    isActive: true,
  },
  {
    name: "Cuti Melahirkan",
    code: "MATERNITY",
    description: "Karyawan perempuan melahirkan (3 bulan / 90 hari)",
    defaultEntitlement: 90,
    isPaid: true,
    requiresAttachment: true,
    minNoticeDays: 14,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Keguguran",
    code: "MISCARRIAGE",
    description: "Karyawan perempuan mengalami keguguran kandungan (1.5 bulan / 45 hari)",
    defaultEntitlement: 45,
    isPaid: true,
    requiresAttachment: true,
    minNoticeDays: 0,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Ayah / Paternity Leave",
    code: "PATERNITY",
    description: "Suami mendampingi istri melahirkan atau keguguran (2 hari)",
    defaultEntitlement: 2,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 1,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Menikah",
    code: "MARRIAGE",
    description: "Pernikahan karyawan (3 hari)",
    defaultEntitlement: 3,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 7,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Keluarga Meninggal",
    code: "BEREAVEMENT",
    description: "Orang tua, pasangan, anak, atau anggota keluarga meninggal dunia (2 hari)",
    defaultEntitlement: 2,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 0,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Khusus",
    code: "SPECIAL",
    description: "Keperluan tertentu sesuai kebijakan perusahaan (khitanan/pembaptisan anak, wisuda, dll.)",
    defaultEntitlement: 2,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 3,
    allowHalfDay: true,
    isActive: true,
  },
  {
    name: "Cuti Besar",
    code: "LONG_LEAVE",
    description: "Cuti panjang berdasarkan masa kerja / kebijakan perusahaan (30 hari)",
    defaultEntitlement: 30,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 30,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Tidak Dibayar",
    code: "UNPAID",
    description: "Cuti tanpa mendapatkan upah atas persetujuan manajemen",
    defaultEntitlement: 0,
    isPaid: false,
    requiresAttachment: false,
    minNoticeDays: 3,
    allowHalfDay: true,
    isActive: true,
  },
  {
    name: "Cuti Keagamaan",
    code: "RELIGIOUS",
    description: "Keperluan ibadah keagamaan resmi (misal: Ibadah Haji / Umroh)",
    defaultEntitlement: 40,
    isPaid: true,
    requiresAttachment: true,
    minNoticeDays: 30,
    allowHalfDay: false,
    isActive: true,
  },
  {
    name: "Cuti Dinas / Penugasan Khusus",
    code: "DUTY",
    description: "Keperluan khusus atau tugas luar yang ditetapkan perusahaan",
    defaultEntitlement: 0,
    isPaid: true,
    requiresAttachment: true,
    minNoticeDays: 1,
    allowHalfDay: true,
    isActive: true,
  },
];

export async function seedLeaveTypesForCompany(companyId: string) {
  const currentYear = new Date().getFullYear();
  const createdTypes = [];

  for (const lt of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveType.findFirst({
      where: { companyId, code: lt.code },
    });

    let type;
    if (!existing) {
      type = await prisma.leaveType.create({
        data: {
          companyId,
          name: lt.name,
          code: lt.code,
          description: lt.description,
          defaultEntitlement: lt.defaultEntitlement,
          isPaid: lt.isPaid,
          requiresAttachment: lt.requiresAttachment,
          minNoticeDays: lt.minNoticeDays,
          allowHalfDay: lt.allowHalfDay,
          isActive: lt.isActive,
        },
      });
    } else {
      type = await prisma.leaveType.update({
        where: { id: existing.id },
        data: {
          name: lt.name,
          description: lt.description,
          defaultEntitlement: lt.defaultEntitlement,
          isPaid: lt.isPaid,
          requiresAttachment: lt.requiresAttachment,
          minNoticeDays: lt.minNoticeDays,
          allowHalfDay: lt.allowHalfDay,
          isActive: lt.isActive,
        },
      });
    }
    createdTypes.push(type);
  }

  // Initialize LeaveBalance for all employees in this company for currentYear
  const employees = await prisma.employee.findMany({
    where: { companyId },
  });

  for (const emp of employees) {
    for (const lt of createdTypes) {
      const existingBal = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
      });

      if (!existingBal) {
        await prisma.leaveBalance.create({
          data: {
            companyId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
            entitlement: lt.defaultEntitlement,
            used: 0,
            remaining: lt.defaultEntitlement,
          },
        });
      }
    }
  }

  return createdTypes;
}

async function main() {
  console.log("🌸 Seeding 12 Leave Types for all companies...");
  const companies = await prisma.company.findMany();
  for (const comp of companies) {
    console.log(`- Seeding leave types for company: ${comp.name} (${comp.code})`);
    await seedLeaveTypesForCompany(comp.id);
  }
  console.log("✅ Leave types successfully seeded!");
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
