import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_OVERTIME_POLICY = {
  minOvertimeMinutes: 60,
  maxDailyHours: 4.0,
  maxWeeklyHours: 18.0,
  requiresPreApproval: true,
  compensationType: "PAYABLE", // PAYABLE, COMP_TIME, BOTH
  roundingMinutes: 30,
  requiresAttachment: false,
  workdayMultiplier: 1.5,
  holidayMultiplier: 2.0,
};

export async function seedOvertimePolicyForCompany(companyId: string) {
  const existing = await prisma.overtimePolicy.findUnique({
    where: { companyId },
  });

  if (!existing) {
    return await prisma.overtimePolicy.create({
      data: {
        companyId,
        ...DEFAULT_OVERTIME_POLICY,
      },
    });
  } else {
    return existing;
  }
}

async function main() {
  console.log("⏱️ Seeding Overtime Policy for all companies...");
  const companies = await prisma.company.findMany();
  for (const comp of companies) {
    console.log(`- Seeding overtime policy for company: ${comp.name} (${comp.code})`);
    await seedOvertimePolicyForCompany(comp.id);
  }
  console.log("✅ Overtime policies successfully seeded!");
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
