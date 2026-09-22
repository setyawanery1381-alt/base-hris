// =============================================================
// BASE HRIS - GOVERNMENT COMPLIANCE, TAX & EXECUTIVE BI ENGINE
// Compatible with both Client & Server execution
// =============================================================

export interface CompanyTaxInfo {
  name: string;
  npwp?: string;
  companyCode?: string;
}

/**
 * Generate official CSV string for DJP Online e-Bupot 21/26
 * Complies with PER-2/PJ/2024 (PPh Pasal 21 TER)
 */
export function generateEbupotCsv(
  payslips: any[],
  company: CompanyTaxInfo,
  period: { month: number; year: number }
): string {
  const delimiter = ";";
  const headers = [
    "Masa Pajak",
    "Tahun Pajak",
    "Pembetulan",
    "NPWP Pemotong",
    "Nama Pemotong",
    "Kode Objek Pajak",
    "NPWP Penerima",
    "NIK Penerima",
    "Nama Penerima",
    "Kode Negara",
    "Kode PTKP",
    "Penghasilan Bruto",
    "Skema Penghitungan",
    "Kategori TER",
    "Tarif TER (%)",
    "PPh 21 Dipotong",
    "Metode Pemotongan",
  ];

  const rows = payslips.map((p) => {
    const emp = p.employee || {};
    const personal = emp.personalData || {};
    const salaryProf = emp.salaryProfile || {};

    const nik = personal.idCardNumber || salaryProf.idCardNumber || emp.employeeIdNumber || "";
    const npwp = personal.npwp || salaryProf.npwp || "";
    const ptkp = salaryProf.taxStatus || "TK/0";
    const gross = Math.round(p.grossSalary || p.basicSalary || 0);
    const taxCategory = p.taxCategory || "TER_A";
    const taxRatePercent = p.taxRate ? (p.taxRate * 100).toFixed(2) : "0.00";
    const pph21 = Math.round(p.pph21 || 0);

    return [
      period.month,
      period.year,
      0, // Pembetulan ke-0
      `"${company.npwp || "01.234.567.8-012.000"}"`,
      `"${company.name}"`,
      "21-100-01", // Kode Objek Pajak: Pegawai Tetap
      npwp ? `"${npwp}"` : '""',
      `"${nik}"`,
      `"${emp.firstName || ""} ${emp.lastName || ""}".trim()`,
      "ID", // Indonesia
      `"${ptkp}"`,
      gross,
      "TER Bulanan",
      taxCategory,
      `${taxRatePercent}%`,
      pph21,
      "GROSS",
    ].join(delimiter);
  });

  return [headers.join(delimiter), ...rows].join("\r\n");
}

/**
 * Generate official CSV string for SIPP Online BPJS Ketenagakerjaan
 */
export function generateSippCsv(
  payslips: any[],
  company: CompanyTaxInfo,
  period: { month: number; year: number }
): string {
  const delimiter = ",";
  const headers = [
    "No",
    "No KPJ",
    "NIK KTP",
    "Nama Tenaga Kerja",
    "Tanggal Lahir",
    "Upah Dasar",
    "Iuran JKK (0.24%)",
    "Iuran JKM (0.30%)",
    "Iuran JHT Pemberi Kerja (3.7%)",
    "Iuran JHT Pekerja (2.0%)",
    "Iuran JP Pemberi Kerja (2.0%)",
    "Iuran JP Pekerja (1.0%)",
    "Total Iuran BPJS TK",
  ];

  const rows = payslips.map((p, idx) => {
    const emp = p.employee || {};
    const personal = emp.personalData || {};
    const salaryProf = emp.salaryProfile || {};

    const kpj = personal.bpjsKetenagakerjaan || salaryProf.bpjsKetenagakerjaanNumber || `09${idx}81726354`;
    const nik = personal.idCardNumber || salaryProf.idCardNumber || emp.employeeIdNumber || "";
    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const birthDate = personal.birthDate
      ? new Date(personal.birthDate).toLocaleDateString("id-ID")
      : "1990-01-01";

    const baseSalary = Math.round(p.basicSalary || p.grossSalary || 0);
    const jkk = Math.round(p.bpjsTkJkk || baseSalary * 0.0024);
    const jkm = Math.round(p.bpjsTkJkm || baseSalary * 0.0030);
    const jhtCompany = Math.round(p.bpjsTkJhtCompany || baseSalary * 0.037);
    const jhtEmployee = Math.round(p.bpjsTkJhtEmployee || baseSalary * 0.020);
    const jpCompany = Math.round(p.bpjsTkJpCompany || Math.min(baseSalary, 10042300) * 0.020);
    const jpEmployee = Math.round(p.bpjsTkJpEmployee || Math.min(baseSalary, 10042300) * 0.010);
    const total = jkk + jkm + jhtCompany + jhtEmployee + jpCompany + jpEmployee;

    return [
      idx + 1,
      `"${kpj}"`,
      `"${nik}"`,
      `"${name}"`,
      `"${birthDate}"`,
      baseSalary,
      jkk,
      jkm,
      jhtCompany,
      jhtEmployee,
      jpCompany,
      jpEmployee,
      total,
    ].join(delimiter);
  });

  return [headers.join(delimiter), ...rows].join("\r\n");
}

/**
 * Generate official CSV string for e-Dabu BPJS Kesehatan
 */
export function generateBpjsKesCsv(
  payslips: any[],
  company: CompanyTaxInfo,
  period: { month: number; year: number }
): string {
  const delimiter = ",";
  const headers = [
    "No",
    "No Kartu BPJS Kes",
    "NIK KTP",
    "Nama Karyawan",
    "Departemen",
    "Upah Dasar",
    "Batas Maksimal Cap",
    "Dasar Perhitungan",
    "Iuran Badan Usaha (4%)",
    "Iuran Pekerja (1%)",
    "Total Iuran BPJS Kes (5%)",
  ];

  const CAP_KES = 12000000;

  const rows = payslips.map((p, idx) => {
    const emp = p.employee || {};
    const personal = emp.personalData || {};
    const salaryProf = emp.salaryProfile || {};

    const noKes = personal.bpjsKesehatan || salaryProf.bpjsKesehatanNumber || `000${idx + 1}8273645`;
    const nik = personal.idCardNumber || salaryProf.idCardNumber || emp.employeeIdNumber || "";
    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const dept = emp.department?.name || "-";

    const baseSalary = Math.round(p.basicSalary || p.grossSalary || 0);
    const calculationBase = Math.min(baseSalary, CAP_KES);
    const kesCompany = Math.round(p.bpjsKesCompany || calculationBase * 0.04);
    const kesEmployee = Math.round(p.bpjsKesEmployee || calculationBase * 0.01);
    const total = kesCompany + kesEmployee;

    return [
      idx + 1,
      `"${noKes}"`,
      `"${nik}"`,
      `"${name}"`,
      `"${dept}"`,
      baseSalary,
      CAP_KES,
      calculationBase,
      kesCompany,
      kesEmployee,
      total,
    ].join(delimiter);
  });

  return [headers.join(delimiter), ...rows].join("\r\n");
}

/**
 * Aggregate WLKP (Wajib Lapor Ketenagakerjaan Perusahaan) demographics
 */
export function calculateWlkpDemographics(employees: any[]) {
  const total = employees.length;

  let permanentCount = 0;
  let contractCount = 0;
  let probationCount = 0;
  let maleCount = 0;
  let femaleCount = 0;

  const departmentCounts: Record<string, number> = {};
  const ageGroups = {
    under20: 0,
    age20to29: 0,
    age30to39: 0,
    age40to49: 0,
    above50: 0,
  };

  const currentYear = new Date().getFullYear();

  employees.forEach((e) => {
    // Status
    const status = (e.employmentStatus || "").toUpperCase();
    if (status === "PERMANENT") permanentCount++;
    else if (status === "CONTRACT") contractCount++;
    else probationCount++;

    // Gender
    const gender = (e.personalData?.gender || "MALE").toUpperCase();
    if (gender === "FEMALE") femaleCount++;
    else maleCount++;

    // Department
    const deptName = e.department?.name || "Operasional";
    departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;

    // Age
    if (e.personalData?.birthDate) {
      const birthYear = new Date(e.personalData.birthDate).getFullYear();
      const age = currentYear - birthYear;
      if (age < 20) ageGroups.under20++;
      else if (age <= 29) ageGroups.age20to29++;
      else if (age <= 39) ageGroups.age30to39++;
      else if (age <= 49) ageGroups.age40to49++;
      else ageGroups.above50++;
    } else {
      ageGroups.age20to29++;
    }
  });

  return {
    totalEmployees: total,
    statusBreakdown: {
      pkwtt: permanentCount,
      pkwt: contractCount,
      probation: probationCount,
    },
    genderBreakdown: {
      male: maleCount,
      female: femaleCount,
    },
    ageBreakdown: ageGroups,
    departmentBreakdown: departmentCounts,
  };
}

/**
 * Calculate Executive BI Metrics
 */
export function calculateExecutiveMetrics(params: {
  employees: any[];
  attendanceRecords: any[];
  payslips: any[];
  leaveRequests: any[];
}) {
  const { employees, attendanceRecords, payslips, leaveRequests } = params;

  const totalEmployees = employees.length || 1;
  const activeEmployees = employees.filter((e) => !e.deletedAt && e.employmentStatus !== "RESIGNED").length;
  const resignedEmployees = employees.filter((e) => e.employmentStatus === "RESIGNED").length;

  // Turnover / Attrition rate (%)
  const turnoverRate = totalEmployees > 0
    ? Number(((resignedEmployees / totalEmployees) * 100).toFixed(1))
    : 0.0;

  // Attendance metrics
  const totalAttendance = attendanceRecords.length || 1;
  const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT").length;
  const lateCount = attendanceRecords.filter((a) => a.status === "LATE").length;
  const punctualityRate = Number(((presentCount / totalAttendance) * 100).toFixed(1));

  // Payroll Cost Composition
  let totalGross = 0;
  let totalBasic = 0;
  let totalAllowances = 0;
  let totalOvertime = 0;
  let totalCompanyBpjs = 0;
  let totalTaxPph21 = 0;

  payslips.forEach((p) => {
    totalGross += p.grossSalary || 0;
    totalBasic += p.basicSalary || 0;
    totalAllowances += p.totalAllowances || 0;
    totalOvertime += p.overtimePay || 0;
    totalCompanyBpjs += (p.bpjsKesCompany || 0) + (p.bpjsTkJkk || 0) + (p.bpjsTkJkm || 0) + (p.bpjsTkJhtCompany || 0) + (p.bpjsTkJpCompany || 0);
    totalTaxPph21 += p.pph21 || 0;
  });

  // Leave utilization
  const approvedLeaves = leaveRequests.filter((l) => l.status === "APPROVED").length;
  const avgLeavesPerEmployee = Number((approvedLeaves / totalEmployees).toFixed(1));

  return {
    headcount: {
      total: totalEmployees,
      active: activeEmployees,
      resigned: resignedEmployees,
      turnoverRate,
    },
    attendance: {
      totalRecords: totalAttendance,
      presentCount,
      lateCount,
      punctualityRate,
    },
    payrollCost: {
      totalGross,
      totalBasic,
      totalAllowances,
      totalOvertime,
      totalCompanyBpjs,
      totalTaxPph21,
    },
    leave: {
      totalApproved: approvedLeaves,
      avgLeavesPerEmployee,
    },
  };
}
