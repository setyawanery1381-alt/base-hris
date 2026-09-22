import { db } from "../src/lib/db";

async function seedPhase8Data() {
  console.log("🌱 SEEDING PHASE 8 COMPLIANCE DEMO DATA: NIK, NPWP, BPJS & PAYROLL COMPLIANCE...");

  const companies = await db.company.findMany({
    include: {
      employees: {
        include: {
          personalData: true,
          salaryProfile: true,
          department: true,
          position: true,
        },
      },
    },
  });

  const sampleNikBase = "317101";
  const sampleNpwpBase = "09.123.45";

  for (const company of companies) {
    if (company.employees.length === 0) continue;
    console.log(`Processing company: ${company.name} (${company.employees.length} employees)`);

    // 1. Update personal data & salary profile for all employees
    let idx = 1;
    for (const emp of company.employees) {
      const paddedIdx = String(idx).padStart(4, "0");
      const idCardNumber = `${sampleNikBase}${paddedIdx}000${idx}`;
      const npwp = `${sampleNpwpBase}${idx}.7-012.000`;
      const bpjsKes = `00012345678${idx}`;
      const bpjsTk = `0901234567${idx}`;
      const gender = idx % 2 === 0 ? "FEMALE" : "MALE";
      const birthYear = 1990 + (idx * 2);
      const birthDate = new Date(`${birthYear}-05-15`);

      // Upsert Personal Data
      await db.employeePersonalData.upsert({
        where: { employeeId: emp.id },
        update: {
          idCardNumber,
          npwp,
          bpjsKesehatan: bpjsKes,
          bpjsKetenagakerjaan: bpjsTk,
          gender,
          birthDate,
        },
        create: {
          employeeId: emp.id,
          idCardNumber,
          npwp,
          bpjsKesehatan: bpjsKes,
          bpjsKetenagakerjaan: bpjsTk,
          gender,
          birthDate,
          address: "Jl. Puri Indah Raya Blok U1, Jakarta Barat",
          phone: `08129876543${idx}`,
        },
      });

      // Upsert Salary Profile
      await db.employeeSalaryProfile.upsert({
        where: { employeeId: emp.id },
        update: {
          idCardNumber,
          npwp,
          bpjsKesehatanNumber: bpjsKes,
          bpjsKetenagakerjaanNumber: bpjsTk,
          taxStatus: idx % 3 === 0 ? "K/1" : idx % 2 === 0 ? "K/0" : "TK/0",
          basicSalary: 8000000 + idx * 2500000,
        },
        create: {
          companyId: company.id,
          employeeId: emp.id,
          idCardNumber,
          npwp,
          bpjsKesehatanNumber: bpjsKes,
          bpjsKetenagakerjaanNumber: bpjsTk,
          taxStatus: idx % 3 === 0 ? "K/1" : idx % 2 === 0 ? "K/0" : "TK/0",
          basicSalary: 8000000 + idx * 2500000,
        },
      });

      idx++;
    }

    // 2. Provision Payroll Period for September 2026 (Month 9, Year 2026)
    const month = 9;
    const year = 2026;
    let period = await db.payrollPeriod.findFirst({
      where: { companyId: company.id, month, year },
    });

    if (!period) {
      period = await db.payrollPeriod.create({
        data: {
          companyId: company.id,
          name: "Payroll September 2026",
          month,
          year,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-30"),
          cutOffStartDate: new Date("2026-08-21"),
          cutOffEndDate: new Date("2026-09-20"),
          paymentDate: new Date("2026-09-25"),
          status: "COMPLETED",
        },
      });
    }

    // 3. Generate Realistic Payslips for September 2026
    for (let i = 0; i < company.employees.length; i++) {
      const emp = company.employees[i];
      const baseSalary = 8000000 + (i + 1) * 2500000;
      const allowance = 1500000 + i * 500000;
      const overtime = i % 2 === 0 ? 450000 : 0;
      const grossSalary = baseSalary + allowance + overtime;

      // TER Rate based on PP 58/2023 & PMK 168/2023
      let taxRate = 0.0075;
      let taxCategory = "TER_A";
      if (grossSalary > 15000000) {
        taxRate = 0.06;
        taxCategory = "TER_B";
      } else if (grossSalary > 10000000) {
        taxRate = 0.02;
        taxCategory = "TER_A";
      }

      const pph21 = Math.round(grossSalary * taxRate);

      // BPJS Kesehatan (Cap Rp 12.000.000)
      const capKes = Math.min(baseSalary, 12000000);
      const bpjsKesCompany = Math.round(capKes * 0.04);
      const bpjsKesEmployee = Math.round(capKes * 0.01);

      // BPJS Ketenagakerjaan (JP Cap Rp 10.042.300)
      const capJp = Math.min(baseSalary, 10042300);
      const bpjsTkJkk = Math.round(baseSalary * 0.0024);
      const bpjsTkJkm = Math.round(baseSalary * 0.0030);
      const bpjsTkJhtCompany = Math.round(baseSalary * 0.037);
      const bpjsTkJhtEmployee = Math.round(baseSalary * 0.020);
      const bpjsTkJpCompany = Math.round(capJp * 0.020);
      const bpjsTkJpEmployee = Math.round(capJp * 0.010);

      const netSalary =
        grossSalary -
        (pph21 + bpjsKesEmployee + bpjsTkJhtEmployee + bpjsTkJpEmployee);

      await db.payslip.upsert({
        where: {
          employeeId_periodMonth_periodYear: {
            employeeId: emp.id,
            periodMonth: month,
            periodYear: year,
          },
        },
        update: {
          payrollPeriodId: period.id,
          basicSalary: baseSalary,
          grossSalary: grossSalary,
          totalAllowances: allowance,
          totalBenefits: bpjsKesCompany + bpjsTkJkk + bpjsTkJkm + bpjsTkJhtCompany + bpjsTkJpCompany,
          totalDeductions: pph21 + bpjsKesEmployee + bpjsTkJhtEmployee + bpjsTkJpEmployee,
          netSalary: netSalary,
          overtimePay: overtime,
          bpjsKesCompany,
          bpjsKesEmployee,
          bpjsTkJkk,
          bpjsTkJkm,
          bpjsTkJhtCompany,
          bpjsTkJhtEmployee,
          bpjsTkJpCompany,
          bpjsTkJpEmployee,
          pph21,
          taxCategory,
          taxRate,
          status: "PAID",
          publishedAt: new Date("2026-09-25"),
        },
        create: {
          companyId: company.id,
          employeeId: emp.id,
          payrollPeriodId: period.id,
          periodMonth: month,
          periodYear: year,
          basicSalary: baseSalary,
          grossSalary: grossSalary,
          totalAllowances: allowance,
          totalBenefits: bpjsKesCompany + bpjsTkJkk + bpjsTkJkm + bpjsTkJhtCompany + bpjsTkJpCompany,
          totalDeductions: pph21 + bpjsKesEmployee + bpjsTkJhtEmployee + bpjsTkJpEmployee,
          netSalary: netSalary,
          overtimePay: overtime,
          bpjsKesCompany,
          bpjsKesEmployee,
          bpjsTkJkk,
          bpjsTkJkm,
          bpjsTkJhtCompany,
          bpjsTkJhtEmployee,
          bpjsTkJpCompany,
          bpjsTkJpEmployee,
          pph21,
          taxCategory,
          taxRate,
          status: "PAID",
          publishedAt: new Date("2026-09-25"),
        },
      });
    }

    console.log(`✅ Seeded Phase 8 compliance data for ${company.name}.`);
  }

  console.log("🎉 Phase 8 compliance seeding complete!");
}

seedPhase8Data()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
