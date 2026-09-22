import { db } from "../src/lib/db";
import {
  generateSampleCsvString,
  generateSampleExcelBuffer,
  parseRawImportRows,
} from "../src/lib/employee-import";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

async function main() {
  console.log("\n=======================================================");
  console.log("  TEST: BULK EMPLOYEE CSV / EXCEL IMPORT & VALIDATION");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Test Sample Template Generation
  console.log("1. Testing Template Generation...");
  const csvTemplate = generateSampleCsvString();
  assert(
    csvTemplate.includes("NIK Karyawan") &&
      csvTemplate.includes("Nama Depan") &&
      csvTemplate.includes("Gaji Pokok"),
    "CSV Template contains essential Indonesian headers"
  );

  const excelBuffer = generateSampleExcelBuffer();
  assert(excelBuffer && excelBuffer.length > 0, "Excel Template buffer generated");
  const parsedFromExcel = XLSX.read(excelBuffer, { type: "array" });
  assert(
    parsedFromExcel.SheetNames.includes("Template Karyawan"),
    "Excel workbook contains 'Template Karyawan' sheet"
  );

  // 2. Test Parser & Field Normalizer
  console.log("\n2. Testing Parser & Normalization Engine...");
  const testRows = [
    {
      "nik": "EMP-901",
      "nama depan": "Ahmad",
      "nama belakang": "Fauzi",
      "email": "ahmad.fauzi@testkanaya.com",
      "jenis kelamin": "L",
      "status kerja": "Tetap",
      "tipe kerja": "Full Time",
      "tanggal masuk": "2026-02-01",
      "nik ktp": "3201012345670001",
      "npwp": "08.123.456.7-001.000",
      "bpjs kesehatan": "000111222333",
      "bpjs ketenagakerjaan": "999888777",
      "status ptkp": "K/1",
      "gaji pokok": "Rp 9.500.000",
      "nama bank": "BCA",
      "nomor rekening": "1234567890",
      "departemen": "Software Engineering",
      "jabatan": "Backend Developer",
    },
    {
      // Missing NIK
      "nama depan": "Tanpa",
      "nama belakang": "NIK",
      "email": "tanpanik@testkanaya.com",
    },
    {
      // Invalid Email
      "nik": "EMP-902",
      "nama depan": "Email",
      "nama belakang": "Salah",
      "email": "bukan-email-valid",
    },
    {
      // Duplicate NIK with row 1
      "nik": "EMP-901",
      "nama depan": "Duplikat",
      "nama belakang": "NIK",
      "email": "duplikatnik@testkanaya.com",
    },
  ];

  const parsedResults = parseRawImportRows(testRows);
  assert(parsedResults.length === 4, "Parsed 4 input rows");

  const row1 = parsedResults[0];
  assert(row1.isValid === true, "Row 1 is fully valid");
  assert(row1.gender === "MALE", "Gender 'L' normalized to 'MALE'");
  assert(row1.employmentStatus === "PERMANENT", "Status 'Tetap' normalized to 'PERMANENT'");
  assert(row1.basicSalary === 9500000, "Salary 'Rp 9.500.000' parsed to 9500000");
  assert(row1.joinDate === "2026-02-01", "Date formatted as 2026-02-01");
  assert(row1.taxStatus === "K/1", "PTKP set to 'K/1'");

  const row2 = parsedResults[1];
  assert(row2.isValid === false, "Row 2 flagged invalid for missing NIK");
  assert(row2.errors.some((e) => e.includes("NIK")), "Row 2 error explains missing NIK");

  const row3 = parsedResults[2];
  assert(row3.isValid === false, "Row 3 flagged invalid for format email");
  assert(row3.errors.some((e) => e.includes("email")), "Row 3 error explains invalid email");

  const row4 = parsedResults[3];
  assert(row4.isValid === false, "Row 4 flagged invalid for duplicate NIK");
  assert(row4.errors.some((e) => e.includes("duplikat")), "Row 4 error explains duplicate NIK");

  // 3. Test Database Insertion & Relationships
  console.log("\n3. Testing Database Batch Import Simulation...");
  const company = await db.company.findFirst({
    where: { code: "kanaya" },
  });
  if (!company) {
    console.error("Test aborted: Kanaya company not found");
    return;
  }

  // Cleanup test employee if already exists
  const existingTestEmp = await db.employee.findUnique({
    where: {
      companyId_employeeIdNumber: {
        companyId: company.id,
        employeeIdNumber: "EMP-901",
      },
    },
  });
  if (existingTestEmp) {
    await db.employee.delete({ where: { id: existingTestEmp.id } });
  }
  const existingUser = await db.user.findUnique({
    where: { email: "ahmad.fauzi@testkanaya.com" },
  });
  if (existingUser) {
    await db.user.delete({ where: { id: existingUser.id } });
  }

  // Simulate import of row1
  const employeeRole = await db.role.findFirst({ where: { name: "EMPLOYEE" } });
  const dept = await db.department.findFirst({ where: { companyId: company.id } });
  const pos = await db.position.findFirst({ where: { companyId: company.id } });
  const leaveTypes = await db.leaveType.findMany({ where: { companyId: company.id } });

  const passwordHash = await bcrypt.hash("password123", 10);
  const currentYear = new Date().getFullYear();

  const importedEmployee = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        email: row1.email,
        passwordHash,
        name: `${row1.firstName} ${row1.lastName}`,
        status: "ACTIVE",
        roles: employeeRole ? { create: { roleId: employeeRole.id } } : undefined,
      },
    });

    const emp = await tx.employee.create({
      data: {
        companyId: company.id,
        userId: user.id,
        employeeIdNumber: row1.employeeIdNumber,
        firstName: row1.firstName,
        lastName: row1.lastName,
        departmentId: dept?.id,
        positionId: pos?.id,
        joinDate: new Date(row1.joinDate),
        employmentStatus: row1.employmentStatus,
        employmentType: row1.employmentType,
        personalData: {
          create: {
            phone: row1.phone,
            gender: row1.gender,
            idCardNumber: row1.idCardNumber,
            npwp: row1.npwp,
            bpjsKesehatan: row1.bpjsKesehatan,
            bpjsKetenagakerjaan: row1.bpjsKetenagakerjaan,
            bankName: row1.bankName,
            bankAccountNumber: row1.bankAccountNumber,
            bankAccountHolder: `${row1.firstName} ${row1.lastName}`,
          },
        },
        salaryProfile: {
          create: {
            companyId: company.id,
            basicSalary: row1.basicSalary,
            taxStatus: row1.taxStatus,
            idCardNumber: row1.idCardNumber,
            npwp: row1.npwp,
            bpjsKesehatanNumber: row1.bpjsKesehatan,
            bpjsKetenagakerjaanNumber: row1.bpjsKetenagakerjaan,
            bankName: row1.bankName,
            bankAccountNumber: row1.bankAccountNumber,
            bankAccountHolder: `${row1.firstName} ${row1.lastName}`,
          },
        },
      },
      include: {
        personalData: true,
        salaryProfile: true,
      },
    });

    for (const lt of leaveTypes) {
      await tx.leaveBalance.create({
        data: {
          companyId: company.id,
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: currentYear,
          entitlement: lt.defaultEntitlement,
          used: 0,
          remaining: lt.defaultEntitlement,
        },
      });
    }

    return emp;
  });

  assert(!!importedEmployee.id, "Employee created successfully in DB");
  assert(
    importedEmployee.personalData?.idCardNumber === "3201012345670001",
    "EmployeePersonalData NIK KTP created correctly"
  );
  assert(
    importedEmployee.salaryProfile?.basicSalary === 9500000,
    "EmployeeSalaryProfile basicSalary created correctly"
  );
  assert(
    importedEmployee.salaryProfile?.taxStatus === "K/1",
    "EmployeeSalaryProfile taxStatus PTKP K/1 created correctly"
  );

  const balances = await db.leaveBalance.findMany({
    where: { employeeId: importedEmployee.id },
  });
  assert(
    balances.length === leaveTypes.length,
    `Leave balances initialized (${balances.length}/${leaveTypes.length} leave types)`
  );

  console.log("\n-------------------------------------------------------");
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
