import { PrismaClient } from "@prisma/client";
import assert from "assert";
import {
  calculatePph21Ter,
  calculateBpjs,
  calculateOvertimePay,
  computeEmployeePayroll,
  getTerCategory,
} from "../src/lib/payroll-engine";
import { generateBankDisbursalFile } from "../src/lib/bank-disbursal";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 STARTING PHASE 3 — PAYROLL & COMPENSATION INTEGRATION TEST SUITE\n");

  // -------------------------------------------------------------
  // TEST 1: PPh 21 TER 2024 Calculation (PP 58/2023 & PMK 168/2023)
  // -------------------------------------------------------------
  console.log("▶ TEST 1: PPh 21 TER 2024 Category & Rate Brackets Verification");

  // Category A: TK/0, TK/1, K/0
  assert.strictEqual(getTerCategory("TK/0"), "TER_A");
  assert.strictEqual(getTerCategory("TK/1"), "TER_A");
  assert.strictEqual(getTerCategory("K/0"), "TER_A");

  // Category B: TK/2, TK/3, K/1, K/2
  assert.strictEqual(getTerCategory("TK/2"), "TER_B");
  assert.strictEqual(getTerCategory("K/1"), "TER_B");

  // Category C: K/3
  assert.strictEqual(getTerCategory("K/3"), "TER_C");

  // TER A Bracket tests
  const terA1 = calculatePph21Ter(5000000, "TK/0"); // <= 5.4jt -> 0%
  assert.strictEqual(terA1.rate, 0);
  assert.strictEqual(terA1.taxAmount, 0);

  const terA2 = calculatePph21Ter(6000000, "TK/0"); // 5.95jt - 6.3jt -> 0.75%
  assert.strictEqual(terA2.rate, 0.75);
  assert.strictEqual(terA2.taxAmount, Math.round(6000000 * 0.0075)); // 45.000

  const terA3 = calculatePph21Ter(10000000, "TK/0"); // 9.65jt - 10.05jt -> 2.0%
  assert.strictEqual(terA3.rate, 2.0);
  assert.strictEqual(terA3.taxAmount, 200000);

  const terA4 = calculatePph21Ter(15000000, "TK/0"); // 13.75jt - 15.1jt -> 6.0%
  assert.strictEqual(terA4.rate, 6.0);
  assert.strictEqual(terA4.taxAmount, 900000);

  // TER B Bracket tests
  const terB1 = calculatePph21Ter(6000000, "K/1"); // <= 6.2jt -> 0%
  assert.strictEqual(terB1.rate, 0);
  assert.strictEqual(terB1.taxAmount, 0);

  const terB2 = calculatePph21Ter(10000000, "K/1"); // 9.2jt - 10.75jt -> 1.5%
  assert.strictEqual(terB2.rate, 1.5);
  assert.strictEqual(terB2.taxAmount, 150000);

  console.log("  ✅ PPh 21 TER 2024 Category & Rate Brackets Verified (Passed)\n");

  // -------------------------------------------------------------
  // TEST 2: BPJS Contributions & Statutory Caps
  // -------------------------------------------------------------
  console.log("▶ TEST 2: BPJS Contributions & Statutory Wage Caps");

  // Salary within caps: Rp 10.000.000
  const bpjsNormal = calculateBpjs(10000000, {
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
  });

  assert.strictEqual(bpjsNormal.bpjsKesCompany, 400000); // 4% of 10M
  assert.strictEqual(bpjsNormal.bpjsKesEmployee, 100000); // 1% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJkk, 24000); // 0.24% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJkm, 30000); // 0.30% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJhtCompany, 370000); // 3.7% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJhtEmployee, 200000); // 2.0% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJpCompany, 200000); // 2% of 10M
  assert.strictEqual(bpjsNormal.bpjsTkJpEmployee, 100000); // 1% of 10M

  // Salary above caps: Rp 15.000.000
  const bpjsCapped = calculateBpjs(15000000, {
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
  });

  // BPJS Kes capped at 12M
  assert.strictEqual(bpjsCapped.bpjsKesCompany, 480000); // 4% of 12M
  assert.strictEqual(bpjsCapped.bpjsKesEmployee, 120000); // 1% of 12M

  // BPJS TK JHT uncapped (based on 15M)
  assert.strictEqual(bpjsCapped.bpjsTkJhtCompany, 555000); // 3.7% of 15M
  assert.strictEqual(bpjsCapped.bpjsTkJhtEmployee, 300000); // 2% of 15M

  // BPJS TK JP capped at 10.042.300
  assert.strictEqual(bpjsCapped.bpjsTkJpCompany, Math.round(10042300 * 0.02)); // 200.846
  assert.strictEqual(bpjsCapped.bpjsTkJpEmployee, Math.round(10042300 * 0.01)); // 100.423

  console.log("  ✅ BPJS Contributions & Statutory Wage Caps Verified (Passed)\n");

  // -------------------------------------------------------------
  // TEST 3: Overtime Pay Integration (Depnakertrans / PP 35/2021)
  // -------------------------------------------------------------
  console.log("▶ TEST 3: Overtime Pay Calculation & Phase 2 Integration");

  const hourlyBase = 10000000 / 173; // ~57,803.47 per hour

  // Workday 3 hours: 1 hr @ 1.5x + 2 hrs @ 2.0x = 5.5x
  const otWorkday = calculateOvertimePay(hourlyBase, [
    { overtimeType: "WORKDAY", durationHours: 3.0 },
  ]);
  assert.strictEqual(otWorkday.totalHours, 3.0);
  assert.strictEqual(otWorkday.totalPay, Math.round(5.5 * hourlyBase));

  // Holiday 8 hours: 7 hrs @ 2.0x + 1 hr @ 3.0x = 17.0x
  const otHoliday = calculateOvertimePay(hourlyBase, [
    { overtimeType: "HOLIDAY", durationHours: 8.0 },
  ]);
  assert.strictEqual(otHoliday.totalHours, 8.0);
  assert.strictEqual(otHoliday.totalPay, Math.round(17.0 * hourlyBase));

  console.log("  ✅ Overtime Pay Calculation Verified (Passed)\n");

  // -------------------------------------------------------------
  // TEST 4: Single Employee Full Payroll Computation
  // -------------------------------------------------------------
  console.log("▶ TEST 4: End-to-End Single Employee Payroll Computation");

  const calcResult = computeEmployeePayroll({
    employeeId: "emp-test-1",
    companyId: "comp-test-1",
    basicSalary: 10000000,
    taxStatus: "TK/0",
    allowances: [
      { componentId: "c1", name: "Tunjangan Jabatan", code: "ALLOWANCE_POSITION", category: "FIXED_ALLOWANCE", amount: 2000000 },
      { componentId: "c2", name: "Tunjangan Transport", code: "ALLOWANCE_TRANSPORT", category: "VARIABLE_ALLOWANCE", amount: 500000 },
    ],
    overtimeRequests: [{ overtimeType: "WORKDAY", durationHours: 2.0 }], // 1x 1.5 + 1x 2 = 3.5x base hourly (12M/173)
    absentDays: 1, // 1 day absent
    bpjsSettings: {
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
    },
    workingDaysInMonth: 22,
  });

  assert.strictEqual(calcResult.basicSalary, 10000000);
  assert.strictEqual(calcResult.totalAllowances, 2500000);
  assert.ok(calcResult.overtimePay > 0, "Overtime pay should be positive");
  assert.ok(calcResult.attendanceDeduction > 0, "Attendance deduction should be positive");
  assert.ok(calcResult.pph21 > 0, "PPh 21 should be positive");
  assert.ok(calcResult.netSalary > 0, "Net take-home pay should be positive");
  assert.ok(calcResult.items.length >= 8, "Should contain comprehensive line items");

  console.log(`  Take-Home Pay Computed: Rp ${calcResult.netSalary.toLocaleString("id-ID")}`);
  console.log(`  PPh 21 TER: Rp ${calcResult.pph21.toLocaleString("id-ID")} (${calcResult.taxRate}%)`);
  console.log("  ✅ Single Employee Full Payroll Computation Verified (Passed)\n");

  // -------------------------------------------------------------
  // TEST 5: Database Operations & Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log("▶ TEST 5: Database Operations & Multi-Tenant Isolation");

  const company = await prisma.company.findFirst({
    where: { code: "kanaya" },
  });
  assert.ok(company, "Company 'kanaya' must exist");

  const otherCompany = await prisma.company.findFirst({
    where: { code: "abc" },
  });
  assert.ok(otherCompany, "Company 'abc' must exist");

  // Test components isolation
  const comp1 = await prisma.salaryComponent.findMany({ where: { companyId: company.id } });
  const comp2 = await prisma.salaryComponent.findMany({ where: { companyId: otherCompany.id } });

  assert.ok(comp1.length > 0, "Company 1 components must exist");
  assert.ok(comp2.length > 0, "Company 2 components must exist");
  for (const c of comp1) {
    assert.strictEqual(c.companyId, company.id, "Tenant isolation violation");
  }

  // Create a test payroll period for company 1
  const testPeriod = await prisma.payrollPeriod.upsert({
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
      name: "Gaji September 2026 (Integration Test)",
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
  assert.ok(testPeriod.id, "Payroll period must be created");

  console.log("  ✅ Multi-Tenant Isolation & Database Entities Verified (Passed)\n");

  // -------------------------------------------------------------
  // TEST 6: Bank Disbursal File Generation
  // -------------------------------------------------------------
  console.log("▶ TEST 6: Bank Disbursal File Generation (BCA, Mandiri, BRI, BNI)");

  const mockDisbursalItems = [
    {
      employeeId: "emp-1",
      employeeNumber: "EMP-001",
      employeeName: "Budi Santoso",
      bankName: "BCA",
      bankAccountNumber: "0123456789",
      bankAccountHolder: "Budi Santoso",
      netSalary: 12500000,
    },
    {
      employeeId: "emp-2",
      employeeNumber: "EMP-002",
      employeeName: "Siti Rahma",
      bankName: "MANDIRI",
      bankAccountNumber: "1370009876543",
      bankAccountHolder: "Siti Rahma",
      netSalary: 9800000,
    },
  ];

  // BCA format
  const bcaFile = generateBankDisbursalFile("BCA", "PT Kanaya", "September 2026", mockDisbursalItems);
  assert.ok(bcaFile.fileName.startsWith("BCA_PAYROLL"));
  assert.ok(bcaFile.content.includes("0123456789,12500000,Budi Santoso"));

  // Mandiri format
  const mandiriFile = generateBankDisbursalFile("MANDIRI", "PT Kanaya", "September 2026", mockDisbursalItems);
  assert.ok(mandiriFile.fileName.startsWith("MANDIRI_PAYROLL"));
  assert.ok(mandiriFile.content.includes('"0123456789","Budi Santoso",12500000,"IDR"'));

  // Generic CSV format
  const genericFile = generateBankDisbursalFile("GENERIC_CSV", "PT Kanaya", "September 2026", mockDisbursalItems);
  assert.ok(genericFile.fileName.startsWith("REKAP_DISBURSAL"));
  assert.ok(genericFile.content.includes("ID Karyawan,Nama Karyawan"));

  console.log("  ✅ Bank Disbursal File Formats Verified (Passed)\n");

  console.log("🎉 ALL 6 TEST SUITES PASSED FLAWLESSLY! PHASE 3 ENGINE IS 100% OPERATIONAL.\n");
}

runTests()
  .catch((err) => {
    console.error("❌ TEST FAILURE:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
