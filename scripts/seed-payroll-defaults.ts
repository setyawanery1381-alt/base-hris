import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COMPONENTS = [
  // Earnings
  { name: "Gaji Pokok", code: "BASIC_SALARY", type: "EARNING", category: "BASIC", isTaxable: true, isBpjsSubject: true, isDefault: true },
  { name: "Tunjangan Jabatan", code: "ALLOWANCE_POSITION", type: "EARNING", category: "FIXED_ALLOWANCE", isTaxable: true, isBpjsSubject: true, isDefault: true },
  { name: "Tunjangan Transportasi", code: "ALLOWANCE_TRANSPORT", type: "EARNING", category: "VARIABLE_ALLOWANCE", isTaxable: true, isBpjsSubject: false, isDefault: true },
  { name: "Tunjangan Uang Makan", code: "ALLOWANCE_MEAL", type: "EARNING", category: "VARIABLE_ALLOWANCE", isTaxable: true, isBpjsSubject: false, isDefault: true },
  { name: "Bonus / Insentif Kinerja", code: "BONUS", type: "EARNING", category: "VARIABLE_ALLOWANCE", isTaxable: true, isBpjsSubject: false, isDefault: false },
  { name: "Upah Lembur", code: "OVERTIME", type: "EARNING", category: "VARIABLE_ALLOWANCE", isTaxable: true, isBpjsSubject: false, isDefault: true },
  
  // Deductions
  { name: "Potongan Keterlambatan", code: "DEDUCTION_LATE", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "Potongan Mangkir & Unpaid Leave", code: "DEDUCTION_ABSENT", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "Potongan Kasbon / Pinjaman", code: "DEDUCTION_LOAN", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: false },
  { name: "BPJS Kesehatan Karyawan (1%)", code: "BPJS_KES_EMP", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "BPJS Ketenagakerjaan JHT (2%)", code: "BPJS_TK_JHT_EMP", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "BPJS Ketenagakerjaan JP (1%)", code: "BPJS_TK_JP_EMP", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "Pajak Penghasilan PPh 21", code: "PPH_21", type: "DEDUCTION", category: "DEDUCTION", isTaxable: false, isBpjsSubject: false, isDefault: true },

  // Benefits
  { name: "BPJS Kesehatan Perusahaan (4%)", code: "BPJS_KES_COMP", type: "BENEFIT", category: "BENEFIT", isTaxable: true, isBpjsSubject: false, isDefault: true },
  { name: "BPJS TK JKK Perusahaan (0.24%)", code: "BPJS_TK_JKK_COMP", type: "BENEFIT", category: "BENEFIT", isTaxable: true, isBpjsSubject: false, isDefault: true },
  { name: "BPJS TK JKM Perusahaan (0.30%)", code: "BPJS_TK_JKM_COMP", type: "BENEFIT", category: "BENEFIT", isTaxable: true, isBpjsSubject: false, isDefault: true },
  { name: "BPJS TK JHT Perusahaan (3.7%)", code: "BPJS_TK_JHT_COMP", type: "BENEFIT", category: "BENEFIT", isTaxable: false, isBpjsSubject: false, isDefault: true },
  { name: "BPJS TK JP Perusahaan (2%)", code: "BPJS_TK_JP_COMP", type: "BENEFIT", category: "BENEFIT", isTaxable: false, isBpjsSubject: false, isDefault: true },
];

async function main() {
  console.log("🚀 Seeding Default Payroll Data...");

  const companies = await prisma.company.findMany();
  console.log(`Found ${companies.length} companies.`);

  for (const company of companies) {
    console.log(`Processing company: ${company.name} (${company.code})`);

    // 1. Seed Salary Components
    for (const comp of DEFAULT_COMPONENTS) {
      await prisma.salaryComponent.upsert({
        where: {
          companyId_code: {
            companyId: company.id,
            code: comp.code,
          },
        },
        update: {
          name: comp.name,
          type: comp.type,
          category: comp.category,
          isTaxable: comp.isTaxable,
          isBpjsSubject: comp.isBpjsSubject,
          isDefault: comp.isDefault,
        },
        create: {
          companyId: company.id,
          ...comp,
        },
      });
    }

    // 2. Seed Tax & BPJS Settings
    await prisma.taxBpjsSetting.upsert({
      where: { companyId: company.id },
      update: {},
      create: {
        companyId: company.id,
        bpjsKesCompanyRate: 4.0,
        bpjsKesEmployeeRate: 1.0,
        bpjsKesMaxCap: 12000000,
        bpjsTkJkkRate: 0.24,
        bpjsTkJkmRate: 0.30,
        bpjsTkJhtCompanyRate: 3.7,
        bpjsTkJhtEmployeeRate: 2.0,
        bpjsTkJpCompanyRate: 2.0,
        bpjsTkJpEmployeeRate: 1.0,
        bpjsTkJpMaxCap: 10042300,
        pph21Method: "TER_2024",
      },
    });

    // 3. Seed Default Payroll Period (September 2026)
    await prisma.payrollPeriod.upsert({
      where: {
        companyId_month_year: {
          companyId: company.id,
          month: 9,
          year: 2026,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: "Gaji September 2026",
        month: 9,
        year: 2026,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
        cutOffStartDate: new Date("2026-08-21"),
        cutOffEndDate: new Date("2026-09-20"),
        paymentDate: new Date("2026-09-25"),
        status: "DRAFT",
      },
    });

    // 4. Seed Employee Salary Profiles if they have employees
    const employees = await prisma.employee.findMany({
      where: { companyId: company.id },
      include: { personalData: true },
    });

    const transportComp = await prisma.salaryComponent.findUnique({
      where: { companyId_code: { companyId: company.id, code: "ALLOWANCE_TRANSPORT" } },
    });
    const mealComp = await prisma.salaryComponent.findUnique({
      where: { companyId_code: { companyId: company.id, code: "ALLOWANCE_MEAL" } },
    });
    const posComp = await prisma.salaryComponent.findUnique({
      where: { companyId_code: { companyId: company.id, code: "ALLOWANCE_POSITION" } },
    });

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const baseSalary = 8000000 + (i * 2500000); // 8jt, 10.5jt, 13jt, etc.
      const bankName = emp.personalData?.bankName || "BCA";
      const bankAcc = emp.personalData?.bankAccountNumber || `012345678${i}`;
      const bankHolder = emp.personalData?.bankAccountHolder || `${emp.firstName} ${emp.lastName}`;

      const profile = await prisma.employeeSalaryProfile.upsert({
        where: { employeeId: emp.id },
        update: {
          basicSalary: baseSalary,
          bankName,
          bankAccountNumber: bankAcc,
          bankAccountHolder: bankHolder,
          taxStatus: i % 2 === 0 ? "TK/0" : "K/1",
          npwp: emp.personalData?.npwp || `09.123.456.7-01${i}.000`,
          bpjsKesehatanNumber: emp.personalData?.bpjsKesehatan || `000123456789${i}`,
          bpjsKetenagakerjaanNumber: emp.personalData?.bpjsKetenagakerjaan || `98765432109${i}`,
        },
        create: {
          companyId: company.id,
          employeeId: emp.id,
          basicSalary: baseSalary,
          paymentType: "MONTHLY",
          bankName,
          bankAccountNumber: bankAcc,
          bankAccountHolder: bankHolder,
          taxStatus: i % 2 === 0 ? "TK/0" : "K/1",
          npwp: emp.personalData?.npwp || `09.123.456.7-01${i}.000`,
          bpjsKesehatanNumber: emp.personalData?.bpjsKesehatan || `000123456789${i}`,
          bpjsKetenagakerjaanNumber: emp.personalData?.bpjsKetenagakerjaan || `98765432109${i}`,
        },
      });

      // Assign recurring allowances
      if (transportComp) {
        await prisma.employeeSalaryComponent.upsert({
          where: {
            employeeSalaryProfileId_salaryComponentId: {
              employeeSalaryProfileId: profile.id,
              salaryComponentId: transportComp.id,
            },
          },
          update: { amount: 600000 },
          create: {
            companyId: company.id,
            employeeSalaryProfileId: profile.id,
            salaryComponentId: transportComp.id,
            amount: 600000,
          },
        });
      }

      if (mealComp) {
        await prisma.employeeSalaryComponent.upsert({
          where: {
            employeeSalaryProfileId_salaryComponentId: {
              employeeSalaryProfileId: profile.id,
              salaryComponentId: mealComp.id,
            },
          },
          update: { amount: 500000 },
          create: {
            companyId: company.id,
            employeeSalaryProfileId: profile.id,
            salaryComponentId: mealComp.id,
            amount: 500000,
          },
        });
      }

      if (posComp && i > 0) {
        await prisma.employeeSalaryComponent.upsert({
          where: {
            employeeSalaryProfileId_salaryComponentId: {
              employeeSalaryProfileId: profile.id,
              salaryComponentId: posComp.id,
            },
          },
          update: { amount: 1500000 },
          create: {
            companyId: company.id,
            employeeSalaryProfileId: profile.id,
            salaryComponentId: posComp.id,
            amount: 1500000,
          },
        });
      }
    }
  }

  console.log("✅ Default Payroll Data Seeded Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
