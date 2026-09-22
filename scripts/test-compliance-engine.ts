import {
  generateEbupotCsv,
  generateSippCsv,
  generateBpjsKesCsv,
  calculateWlkpDemographics,
  calculateExecutiveMetrics,
} from "../src/lib/compliance-engine";

async function runComplianceTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING AUTOMATED TEST SUITE: GOVERNMENT COMPLIANCE & BI ENGINE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `-> ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    const mockCompany = {
      name: "PT Kanaya Multi Solusindo",
      npwp: "01.234.567.8-012.000",
      companyCode: "KMS",
    };

    const mockPayslips = [
      {
        id: "p1",
        basicSalary: 15000000,
        grossSalary: 18500000,
        totalAllowances: 3500000,
        overtimePay: 0,
        bpjsKesCompany: 480000,
        bpjsKesEmployee: 120000,
        bpjsTkJkk: 36000,
        bpjsTkJkm: 45000,
        bpjsTkJhtCompany: 555000,
        bpjsTkJhtEmployee: 300000,
        bpjsTkJpCompany: 200846,
        bpjsTkJpEmployee: 100423,
        pph21: 277500,
        taxCategory: "TER_A",
        taxRate: 0.015,
        employee: {
          employeeIdNumber: "KNY-001",
          firstName: "Budi",
          lastName: "Santoso",
          personalData: {
            idCardNumber: "3171012345670001",
            npwp: "12.345.678.9-012.000",
            bpjsKesehatan: "0001234567890",
            bpjsKetenagakerjaan: "09012345678",
            gender: "MALE",
            birthDate: new Date("1992-05-14"),
          },
          salaryProfile: {
            taxStatus: "K/1",
          },
          department: { name: "Engineering" },
        },
      },
      {
        id: "p2",
        basicSalary: 8000000,
        grossSalary: 9500000,
        totalAllowances: 1500000,
        overtimePay: 500000,
        bpjsKesCompany: 320000,
        bpjsKesEmployee: 80000,
        bpjsTkJkk: 19200,
        bpjsTkJkm: 24000,
        bpjsTkJhtCompany: 296000,
        bpjsTkJhtEmployee: 160000,
        bpjsTkJpCompany: 160000,
        bpjsTkJpEmployee: 80000,
        pph21: 71250,
        taxCategory: "TER_A",
        taxRate: 0.0075,
        employee: {
          employeeIdNumber: "KNY-002",
          firstName: "Siti",
          lastName: "Aminah",
          personalData: {
            idCardNumber: "3171019876540002",
            npwp: "98.765.432.1-012.000",
            bpjsKesehatan: "0009876543210",
            bpjsKetenagakerjaan: "09098765432",
            gender: "FEMALE",
            birthDate: new Date("1996-08-20"),
          },
          salaryProfile: {
            taxStatus: "TK/0",
          },
          department: { name: "Human Capital" },
        },
      },
    ];

    // -------------------------------------------------------------
    // 1. TEST E-BUPOT PPH 21 CSV GENERATOR
    // -------------------------------------------------------------
    console.log("--- 1. Testing DJP e-Bupot PPh 21 CSV Engine ---");
    const ebupotCsv = generateEbupotCsv(mockPayslips, mockCompany, { month: 9, year: 2026 });

    assert(ebupotCsv.includes("Masa Pajak;Tahun Pajak;Pembetulan"), "e-Bupot CSV Header presence");
    assert(ebupotCsv.includes("21-100-01"), "e-Bupot Pegawai Tetap Object Code (21-100-01)");
    assert(ebupotCsv.includes("3171012345670001"), "e-Bupot NIK KTP 16 digit included");
    assert(ebupotCsv.includes("12.345.678.9-012.000"), "e-Bupot NPWP included");
    assert(ebupotCsv.includes("TER_A") && ebupotCsv.includes("277500"), "e-Bupot TER and tax deduction value");

    // -------------------------------------------------------------
    // 2. TEST SIPP ONLINE BPJS KETENAGAKERJAAN CSV GENERATOR
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing BPJS Ketenagakerjaan SIPP Online Engine ---");
    const sippCsv = generateSippCsv(mockPayslips, mockCompany, { month: 9, year: 2026 });

    assert(sippCsv.includes("No,No KPJ,NIK KTP,Nama Tenaga Kerja"), "SIPP Online CSV Header presence");
    assert(sippCsv.includes("09012345678"), "SIPP KPJ number presence");
    assert(sippCsv.includes("3171019876540002"), "SIPP NIK KTP presence");
    assert(sippCsv.includes("Budi Santoso") && sippCsv.includes("Siti Aminah"), "SIPP Employee Names presence");

    // -------------------------------------------------------------
    // 3. TEST E-DABU BPJS KESEHATAN CSV GENERATOR
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing BPJS Kesehatan e-Dabu Engine ---");
    const bpjsKesCsv = generateBpjsKesCsv(mockPayslips, mockCompany, { month: 9, year: 2026 });

    assert(bpjsKesCsv.includes("No,No Kartu BPJS Kes,NIK KTP"), "e-Dabu CSV Header presence");
    assert(bpjsKesCsv.includes("12000000"), "BPJS Kesehatan Cap Rp 12.000.000 applied");
    assert(bpjsKesCsv.includes("0001234567890"), "BPJS Kesehatan member number presence");

    // -------------------------------------------------------------
    // 4. TEST WLKP DEMOGRAPHICS AGGREGATOR
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing WLKP Ketenagakerjaan Demographics Engine ---");
    const mockEmployees = [
      {
        employmentStatus: "PERMANENT",
        department: { name: "Engineering" },
        personalData: { gender: "MALE", birthDate: new Date("1992-05-14") },
      },
      {
        employmentStatus: "CONTRACT",
        department: { name: "Human Capital" },
        personalData: { gender: "FEMALE", birthDate: new Date("1996-08-20") },
      },
      {
        employmentStatus: "PROBATION",
        department: { name: "Engineering" },
        personalData: { gender: "MALE", birthDate: new Date("2003-01-10") },
      },
    ];

    const wlkp = calculateWlkpDemographics(mockEmployees);
    assert(wlkp.totalEmployees === 3, "WLKP Total Employees count");
    assert(wlkp.statusBreakdown.pkwtt === 1, "WLKP PKWTT (Permanent) count");
    assert(wlkp.statusBreakdown.pkwt === 1, "WLKP PKWT (Contract) count");
    assert(wlkp.statusBreakdown.probation === 1, "WLKP Probation/Intern count");
    assert(wlkp.genderBreakdown.male === 2 && wlkp.genderBreakdown.female === 1, "WLKP Gender distribution");
    assert(wlkp.departmentBreakdown["Engineering"] === 2, "WLKP Department distribution");

    // -------------------------------------------------------------
    // 5. TEST EXECUTIVE BI METRICS CALCULATOR
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Executive BI Analytics Engine ---");
    const mockAttendance = [
      { status: "PRESENT" },
      { status: "PRESENT" },
      { status: "LATE" },
    ];
    const mockLeaves = [{ status: "APPROVED" }, { status: "REJECTED" }];

    const bi = calculateExecutiveMetrics({
      employees: mockEmployees,
      attendanceRecords: mockAttendance,
      payslips: mockPayslips,
      leaveRequests: mockLeaves,
    });

    assert(bi.headcount.total === 3, "BI Headcount total");
    assert(bi.headcount.turnoverRate === 0.0, "BI Turnover rate calculation");
    assert(bi.attendance.punctualityRate === 66.7, "BI Attendance punctuality percentage");
    assert(bi.payrollCost.totalGross === 28000000, "BI Payroll gross aggregation");
    assert(bi.leave.totalApproved === 1, "BI Approved leave count");

  } catch (err: any) {
    console.error("❌ Exception during test execution:", err);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runComplianceTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
