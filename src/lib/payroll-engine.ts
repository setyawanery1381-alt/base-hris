import { PrismaClient } from "@prisma/client";

export type TerCategory = "TER_A" | "TER_B" | "TER_C";

export interface TerBracket {
  maxGross: number;
  rate: number; // in percentage e.g. 1.5 for 1.5%
}

// 1. PPh 21 TER Bracket Tables per PP 58/2023 & PMK 168/2023
export const TER_A_BRACKETS: TerBracket[] = [
  { maxGross: 5400000, rate: 0.0 },
  { maxGross: 5650000, rate: 0.25 },
  { maxGross: 5950000, rate: 0.5 },
  { maxGross: 6300000, rate: 0.75 },
  { maxGross: 6750000, rate: 1.0 },
  { maxGross: 7500000, rate: 1.25 },
  { maxGross: 8550000, rate: 1.5 },
  { maxGross: 9650000, rate: 1.75 },
  { maxGross: 10050000, rate: 2.0 },
  { maxGross: 10350000, rate: 2.25 },
  { maxGross: 10700000, rate: 2.5 },
  { maxGross: 11050000, rate: 3.0 },
  { maxGross: 11600000, rate: 3.5 },
  { maxGross: 12500000, rate: 4.0 },
  { maxGross: 13750000, rate: 5.0 },
  { maxGross: 15100000, rate: 6.0 },
  { maxGross: 16950000, rate: 7.0 },
  { maxGross: 19750000, rate: 8.0 },
  { maxGross: 24150000, rate: 9.0 },
  { maxGross: 26450000, rate: 10.0 },
  { maxGross: 28000000, rate: 11.0 },
  { maxGross: 30050000, rate: 12.0 },
  { maxGross: 32400000, rate: 13.0 },
  { maxGross: 35400000, rate: 14.0 },
  { maxGross: 39100000, rate: 15.0 },
  { maxGross: 43850000, rate: 16.0 },
  { maxGross: 47800000, rate: 17.0 },
  { maxGross: 51400000, rate: 18.0 },
  { maxGross: 56300000, rate: 19.0 },
  { maxGross: 62200000, rate: 20.0 },
  { maxGross: 68600000, rate: 21.0 },
  { maxGross: 77500000, rate: 22.0 },
  { maxGross: 89000000, rate: 23.0 },
  { maxGross: 103000000, rate: 24.0 },
  { maxGross: 125000000, rate: 25.0 },
  { maxGross: 157000000, rate: 26.0 },
  { maxGross: 206000000, rate: 27.0 },
  { maxGross: 337000000, rate: 28.0 },
  { maxGross: 454000000, rate: 29.0 },
  { maxGross: 550000000, rate: 30.0 },
  { maxGross: 695000000, rate: 31.0 },
  { maxGross: 910000000, rate: 32.0 },
  { maxGross: 1400000000, rate: 33.0 },
  { maxGross: Infinity, rate: 34.0 },
];

export const TER_B_BRACKETS: TerBracket[] = [
  { maxGross: 6200000, rate: 0.0 },
  { maxGross: 6500000, rate: 0.25 },
  { maxGross: 6850000, rate: 0.5 },
  { maxGross: 7300000, rate: 0.75 },
  { maxGross: 9200000, rate: 1.0 },
  { maxGross: 10750000, rate: 1.5 },
  { maxGross: 11250000, rate: 2.0 },
  { maxGross: 11600000, rate: 2.5 },
  { maxGross: 12600000, rate: 3.0 },
  { maxGross: 13600000, rate: 4.0 },
  { maxGross: 14950000, rate: 5.0 },
  { maxGross: 16400000, rate: 6.0 },
  { maxGross: 18450000, rate: 7.0 },
  { maxGross: 21850000, rate: 8.0 },
  { maxGross: 26000000, rate: 9.0 },
  { maxGross: 27700000, rate: 10.0 },
  { maxGross: 29350000, rate: 11.0 },
  { maxGross: 31450000, rate: 12.0 },
  { maxGross: 33950000, rate: 13.0 },
  { maxGross: 37100000, rate: 14.0 },
  { maxGross: 41100000, rate: 15.0 },
  { maxGross: 45800000, rate: 16.0 },
  { maxGross: 49500000, rate: 17.0 },
  { maxGross: 53800000, rate: 18.0 },
  { maxGross: 58500000, rate: 19.0 },
  { maxGross: 64000000, rate: 20.0 },
  { maxGross: 71000000, rate: 21.0 },
  { maxGross: 80000000, rate: 22.0 },
  { maxGross: 93000000, rate: 23.0 },
  { maxGross: 109000000, rate: 24.0 },
  { maxGross: 129000000, rate: 25.0 },
  { maxGross: 163000000, rate: 26.0 },
  { maxGross: 211000000, rate: 27.0 },
  { maxGross: 374000000, rate: 28.0 },
  { maxGross: 459000000, rate: 29.0 },
  { maxGross: 555000000, rate: 30.0 },
  { maxGross: 704000000, rate: 31.0 },
  { maxGross: 957000000, rate: 32.0 },
  { maxGross: 1405000000, rate: 33.0 },
  { maxGross: Infinity, rate: 34.0 },
];

export const TER_C_BRACKETS: TerBracket[] = [
  { maxGross: 6600000, rate: 0.0 },
  { maxGross: 6950000, rate: 0.25 },
  { maxGross: 7350000, rate: 0.5 },
  { maxGross: 7800000, rate: 0.75 },
  { maxGross: 8850000, rate: 1.0 },
  { maxGross: 9800000, rate: 1.25 },
  { maxGross: 10950000, rate: 1.5 },
  { maxGross: 11200000, rate: 1.75 },
  { maxGross: 12050000, rate: 2.0 },
  { maxGross: 12950000, rate: 3.0 },
  { maxGross: 14150000, rate: 4.0 },
  { maxGross: 15550000, rate: 5.0 },
  { maxGross: 17050000, rate: 6.0 },
  { maxGross: 19500000, rate: 7.0 },
  { maxGross: 22700000, rate: 8.0 },
  { maxGross: 26600000, rate: 9.0 },
  { maxGross: 28100000, rate: 10.0 },
  { maxGross: 30100000, rate: 11.0 },
  { maxGross: 32600000, rate: 12.0 },
  { maxGross: 35400000, rate: 13.0 },
  { maxGross: 38900000, rate: 14.0 },
  { maxGross: 43000000, rate: 15.0 },
  { maxGross: 47400000, rate: 16.0 },
  { maxGross: 51200000, rate: 17.0 },
  { maxGross: 55800000, rate: 18.0 },
  { maxGross: 60400000, rate: 19.0 },
  { maxGross: 66700000, rate: 20.0 },
  { maxGross: 74500000, rate: 21.0 },
  { maxGross: 83200000, rate: 22.0 },
  { maxGross: 95600000, rate: 23.0 },
  { maxGross: 110000000, rate: 24.0 },
  { maxGross: 134000000, rate: 25.0 },
  { maxGross: 169000000, rate: 26.0 },
  { maxGross: 221000000, rate: 27.0 },
  { maxGross: 390000000, rate: 28.0 },
  { maxGross: 463000000, rate: 29.0 },
  { maxGross: 561000000, rate: 30.0 },
  { maxGross: 709000000, rate: 31.0 },
  { maxGross: 965000000, rate: 32.0 },
  { maxGross: 1419000000, rate: 33.0 },
  { maxGross: Infinity, rate: 34.0 },
];

/**
 * Maps PTKP tax status to TER Category
 */
export function getTerCategory(taxStatus: string): TerCategory {
  const norm = (taxStatus || "TK/0").toUpperCase().trim();
  if (["TK/0", "TK/1", "K/0"].includes(norm)) {
    return "TER_A";
  }
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(norm)) {
    return "TER_B";
  }
  if (["K/3"].includes(norm)) {
    return "TER_C";
  }
  // Default to TER_A
  return "TER_A";
}

/**
 * Calculates PPh 21 TER rate and tax amount
 */
export function calculatePph21Ter(grossSalary: number, taxStatus: string): { category: TerCategory; rate: number; taxAmount: number } {
  const category = getTerCategory(taxStatus);
  let brackets = TER_A_BRACKETS;
  if (category === "TER_B") brackets = TER_B_BRACKETS;
  if (category === "TER_C") brackets = TER_C_BRACKETS;

  let selectedRate = 0;
  for (const b of brackets) {
    if (grossSalary <= b.maxGross) {
      selectedRate = b.rate;
      break;
    }
  }

  const taxAmount = Math.round(grossSalary * (selectedRate / 100));
  return { category, rate: selectedRate, taxAmount };
}

/**
 * Calculates statutory BPJS contributions
 */
export function calculateBpjs(
  baseSalary: number,
  settings: {
    bpjsKesCompanyRate?: number;
    bpjsKesEmployeeRate?: number;
    bpjsKesMaxCap?: number;
    bpjsTkJkkRate?: number;
    bpjsTkJkmRate?: number;
    bpjsTkJhtCompanyRate?: number;
    bpjsTkJhtEmployeeRate?: number;
    bpjsTkJpCompanyRate?: number;
    bpjsTkJpEmployeeRate?: number;
    bpjsTkJpMaxCap?: number;
  }
) {
  const kesCompRate = settings.bpjsKesCompanyRate ?? 4.0;
  const kesEmpRate = settings.bpjsKesEmployeeRate ?? 1.0;
  const kesCap = settings.bpjsKesMaxCap ?? 12000000;

  const jkkRate = settings.bpjsTkJkkRate ?? 0.24;
  const jkmRate = settings.bpjsTkJkmRate ?? 0.30;
  const jhtCompRate = settings.bpjsTkJhtCompanyRate ?? 3.7;
  const jhtEmpRate = settings.bpjsTkJhtEmployeeRate ?? 2.0;
  const jpCompRate = settings.bpjsTkJpCompanyRate ?? 2.0;
  const jpEmpRate = settings.bpjsTkJpEmployeeRate ?? 1.0;
  const jpCap = settings.bpjsTkJpMaxCap ?? 10042300;

  // BPJS Kesehatan
  const kesBase = Math.min(baseSalary, kesCap);
  const bpjsKesCompany = Math.round(kesBase * (kesCompRate / 100));
  const bpjsKesEmployee = Math.round(kesBase * (kesEmpRate / 100));

  // BPJS Ketenagakerjaan
  const bpjsTkJkk = Math.round(baseSalary * (jkkRate / 100));
  const bpjsTkJkm = Math.round(baseSalary * (jkmRate / 100));
  const bpjsTkJhtCompany = Math.round(baseSalary * (jhtCompRate / 100));
  const bpjsTkJhtEmployee = Math.round(baseSalary * (jhtEmpRate / 100));

  const jpBase = Math.min(baseSalary, jpCap);
  const bpjsTkJpCompany = Math.round(jpBase * (jpCompRate / 100));
  const bpjsTkJpEmployee = Math.round(jpBase * (jpEmpRate / 100));

  return {
    bpjsKesCompany,
    bpjsKesEmployee,
    bpjsTkJkk,
    bpjsTkJkm,
    bpjsTkJhtCompany,
    bpjsTkJhtEmployee,
    bpjsTkJpCompany,
    bpjsTkJpEmployee,
    totalCompanyBpjs: bpjsKesCompany + bpjsTkJkk + bpjsTkJkm + bpjsTkJhtCompany + bpjsTkJpCompany,
    totalEmployeeBpjs: bpjsKesEmployee + bpjsTkJhtEmployee + bpjsTkJpEmployee,
  };
}

/**
 * Calculates overtime pay for approved overtime requests
 */
export function calculateOvertimePay(
  hourlyBase: number,
  requests: Array<{ overtimeType: string; durationHours?: number; hours?: number }>
) {
  let totalHours = 0;
  let totalPay = 0;

  for (const r of requests) {
    const hours = r.durationHours ?? r.hours ?? 1.0;
    totalHours += hours;

    if (r.overtimeType === "WORKDAY") {
      const firstHour = Math.min(hours, 1.0);
      const remaining = Math.max(0, hours - 1.0);
      totalPay += (firstHour * 1.5 + remaining * 2.0) * hourlyBase;
    } else {
      // HOLIDAY / OFF_DAY
      const first7 = Math.min(hours, 7.0);
      const eighth = Math.max(0, Math.min(hours - 7.0, 1.0));
      const ninthPlus = Math.max(0, hours - 8.0);
      totalPay += (first7 * 2.0 + eighth * 3.0 + ninthPlus * 4.0) * hourlyBase;
    }
  }

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalPay: Math.round(totalPay),
  };
}

/**
 * Main Payroll Calculation for a single employee
 */
export interface EmployeePayrollInput {
  employeeId: string;
  companyId: string;
  basicSalary: number;
  taxStatus: string;
  allowances: Array<{ componentId: string; name: string; code: string; category: string; amount: number }>;
  overtimeRequests: Array<{ overtimeType: string; durationHours?: number; hours?: number }>;
  absentDays: number; // Mangkir + Unpaid leave
  lateMinutes?: number;
  bpjsSettings: {
    bpjsKesCompanyRate?: number;
    bpjsKesEmployeeRate?: number;
    bpjsKesMaxCap?: number;
    bpjsTkJkkRate?: number;
    bpjsTkJkmRate?: number;
    bpjsTkJhtCompanyRate?: number;
    bpjsTkJhtEmployeeRate?: number;
    bpjsTkJpCompanyRate?: number;
    bpjsTkJpEmployeeRate?: number;
    bpjsTkJpMaxCap?: number;
  };
  workingDaysInMonth?: number;
}

export function computeEmployeePayroll(input: EmployeePayrollInput) {
  const {
    basicSalary,
    taxStatus,
    allowances,
    overtimeRequests,
    absentDays,
    bpjsSettings,
    workingDaysInMonth = 22,
  } = input;

  // 1. Separate fixed vs variable allowances
  let fixedAllowancesTotal = 0;
  let variableAllowancesTotal = 0;
  for (const a of allowances) {
    if (a.category === "FIXED_ALLOWANCE") {
      fixedAllowancesTotal += a.amount;
    } else {
      variableAllowancesTotal += a.amount;
    }
  }
  const totalAllowances = fixedAllowancesTotal + variableAllowancesTotal;

  // 2. Base wage for BPJS & Overtime (Basic + Fixed Allowances per Manpower law)
  const baseWage = basicSalary + fixedAllowancesTotal;
  const hourlyBase = baseWage / 173;

  // 3. Overtime Pay
  const { totalHours: overtimeHours, totalPay: overtimePay } = calculateOvertimePay(hourlyBase, overtimeRequests);

  // 4. Attendance Deduction (Absent / Unpaid Leave)
  const dailyRate = baseWage / workingDaysInMonth;
  const attendanceDeduction = Math.round(absentDays * dailyRate);

  // 5. BPJS Calculations
  const bpjs = calculateBpjs(baseWage, bpjsSettings);

  // 6. Gross Salary for PPh 21 TER
  // In Indonesian Tax Law: Basic + Allowances + Overtime + BPJS Kes Comp + BPJS TK JKK + BPJS TK JKM
  const grossTaxable =
    basicSalary +
    totalAllowances +
    overtimePay +
    bpjs.bpjsKesCompany +
    bpjs.bpjsTkJkk +
    bpjs.bpjsTkJkm;

  // 7. PPh 21 TER
  const pph21Result = calculatePph21Ter(grossTaxable, taxStatus);

  // 8. Total Deductions
  const totalDeductions =
    attendanceDeduction +
    bpjs.bpjsKesEmployee +
    bpjs.bpjsTkJhtEmployee +
    bpjs.bpjsTkJpEmployee +
    pph21Result.taxAmount;

  // 9. Total Earnings & Net Take-Home Pay
  const totalEarnings = basicSalary + totalAllowances + overtimePay;
  const netSalary = Math.max(0, Math.round(totalEarnings - totalDeductions));

  // 10. Generate line items for payslip
  const items: Array<{ componentName: string; componentCode: string; type: "EARNING" | "DEDUCTION" | "BENEFIT"; amount: number; description?: string }> = [
    { componentName: "Gaji Pokok", componentCode: "BASIC_SALARY", type: "EARNING", amount: basicSalary },
    ...allowances.map((a) => ({
      componentName: a.name,
      componentCode: a.code,
      type: "EARNING" as const,
      amount: a.amount,
    })),
  ];

  if (overtimePay > 0) {
    items.push({
      componentName: "Upah Lembur",
      componentCode: "OVERTIME",
      type: "EARNING",
      amount: overtimePay,
      description: `${overtimeHours} jam lembur disetujui`,
    });
  }

  if (attendanceDeduction > 0) {
    items.push({
      componentName: "Potongan Mangkir & Unpaid Leave",
      componentCode: "DEDUCTION_ABSENT",
      type: "DEDUCTION",
      amount: attendanceDeduction,
      description: `${absentDays} hari tidak hadir`,
    });
  }

  // Employee statutory deductions
  items.push(
    { componentName: "BPJS Kesehatan Karyawan (1%)", componentCode: "BPJS_KES_EMP", type: "DEDUCTION", amount: bpjs.bpjsKesEmployee },
    { componentName: "BPJS Ketenagakerjaan JHT (2%)", componentCode: "BPJS_TK_JHT_EMP", type: "DEDUCTION", amount: bpjs.bpjsTkJhtEmployee },
    { componentName: "BPJS Ketenagakerjaan JP (1%)", componentCode: "BPJS_TK_JP_EMP", type: "DEDUCTION", amount: bpjs.bpjsTkJpEmployee },
    { componentName: `PPh 21 TER (${pph21Result.rate}%)`, componentCode: "PPH_21", type: "DEDUCTION", amount: pph21Result.taxAmount }
  );

  // Company benefits
  const totalBenefits = bpjs.totalCompanyBpjs;
  items.push(
    { componentName: "BPJS Kesehatan Perusahaan (4%)", componentCode: "BPJS_KES_COMP", type: "BENEFIT", amount: bpjs.bpjsKesCompany },
    { componentName: "BPJS TK JKK Perusahaan (0.24%)", componentCode: "BPJS_TK_JKK_COMP", type: "BENEFIT", amount: bpjs.bpjsTkJkk },
    { componentName: "BPJS TK JKM Perusahaan (0.30%)", componentCode: "BPJS_TK_JKM_COMP", type: "BENEFIT", amount: bpjs.bpjsTkJkm },
    { componentName: "BPJS TK JHT Perusahaan (3.7%)", componentCode: "BPJS_TK_JHT_COMP", type: "BENEFIT", amount: bpjs.bpjsTkJhtCompany },
    { componentName: "BPJS TK JP Perusahaan (2%)", componentCode: "BPJS_TK_JP_COMP", type: "BENEFIT", amount: bpjs.bpjsTkJpCompany }
  );

  return {
    basicSalary,
    totalAllowances,
    overtimeHours,
    overtimePay,
    attendanceDeduction,
    lateDeduction: 0,
    grossSalary: grossTaxable,
    totalDeductions,
    totalBenefits,
    netSalary,
    bpjsKesCompany: bpjs.bpjsKesCompany,
    bpjsKesEmployee: bpjs.bpjsKesEmployee,
    bpjsTkJkk: bpjs.bpjsTkJkk,
    bpjsTkJkm: bpjs.bpjsTkJkm,
    bpjsTkJhtCompany: bpjs.bpjsTkJhtCompany,
    bpjsTkJhtEmployee: bpjs.bpjsTkJhtEmployee,
    bpjsTkJpCompany: bpjs.bpjsTkJpCompany,
    bpjsTkJpEmployee: bpjs.bpjsTkJpEmployee,
    totalCompanyBpjs: bpjs.totalCompanyBpjs,
    totalEmployeeBpjs: bpjs.totalEmployeeBpjs,
    pph21: pph21Result.taxAmount,
    taxCategory: pph21Result.category,
    taxRate: pph21Result.rate,
    items,
  };
}
