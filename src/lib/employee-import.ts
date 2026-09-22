import * as XLSX from "xlsx";

export interface ParsedEmployeeRow {
  rowNumber: number;
  employeeIdNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  departmentName?: string;
  positionName?: string;
  employmentStatus: "PERMANENT" | "PROBATION" | "CONTRACT";
  employmentType: "FULL_TIME" | "PART_TIME" | "INTERN";
  joinDate: string; // YYYY-MM-DD
  idCardNumber?: string;
  npwp?: string;
  bpjsKesehatan?: string;
  bpjsKetenagakerjaan?: string;
  taxStatus: string;
  basicSalary: number;
  bankName?: string;
  bankAccountNumber?: string;
  isValid: boolean;
  errors: string[];
}

export const IMPORT_HEADERS_MAPPING: Record<string, string> = {
  // NIK
  "nik": "employeeIdNumber",
  "nik karyawan": "employeeIdNumber",
  "nomor induk karyawan": "employeeIdNumber",
  "employee id": "employeeIdNumber",
  "employee_id": "employeeIdNumber",
  "employeeidnumber": "employeeIdNumber",

  // Nama Depan
  "nama depan": "firstName",
  "first name": "firstName",
  "firstname": "firstName",
  "nama": "firstName", // fallback if only one name column

  // Nama Belakang
  "nama belakang": "lastName",
  "last name": "lastName",
  "lastname": "lastName",

  // Email
  "email": "email",
  "alamat email": "email",
  "work email": "email",

  // Phone
  "no hp": "phone",
  "nomor hp": "phone",
  "no handphone": "phone",
  "nomor handphone": "phone",
  "telepon": "phone",
  "phone": "phone",

  // Gender
  "jenis kelamin": "gender",
  "gender": "gender",
  "jk": "gender",

  // Departemen
  "departemen": "departmentName",
  "department": "departmentName",
  "divisi": "departmentName",

  // Jabatan
  "jabatan": "positionName",
  "posisi": "positionName",
  "position": "positionName",

  // Status Karyawan
  "status karyawan": "employmentStatus",
  "status kerja": "employmentStatus",
  "employment status": "employmentStatus",
  "status": "employmentStatus",

  // Tipe Kerja
  "tipe kerja": "employmentType",
  "tipe pekerjaan": "employmentType",
  "tipe karyawan": "employmentType",
  "employment type": "employmentType",

  // Tanggal Masuk
  "tanggal masuk": "joinDate",
  "tanggal bergabung": "joinDate",
  "tgl masuk": "joinDate",
  "join date": "joinDate",
  "joindate": "joinDate",

  // NIK KTP
  "nik ktp": "idCardNumber",
  "nomor ktp": "idCardNumber",
  "no ktp": "idCardNumber",
  "ktp": "idCardNumber",
  "idcardnumber": "idCardNumber",

  // NPWP
  "npwp": "npwp",
  "nomor npwp": "npwp",
  "no npwp": "npwp",

  // BPJS Kesehatan
  "bpjs kesehatan": "bpjsKesehatan",
  "no bpjs kesehatan": "bpjsKesehatan",
  "nomor bpjs kesehatan": "bpjsKesehatan",
  "bpjs kes": "bpjsKesehatan",
  "bpjskesehatan": "bpjsKesehatan",

  // BPJS Ketenagakerjaan
  "bpjs ketenagakerjaan": "bpjsKetenagakerjaan",
  "no bpjs tk": "bpjsKetenagakerjaan",
  "nomor bpjs tk": "bpjsKetenagakerjaan",
  "bpjs tk": "bpjsKetenagakerjaan",
  "bpjsketenagakerjaan": "bpjsKetenagakerjaan",

  // Status PTKP
  "status ptkp": "taxStatus",
  "status pajak": "taxStatus",
  "status pajak ptkp": "taxStatus",
  "ptkp": "taxStatus",
  "taxstatus": "taxStatus",

  // Gaji Pokok
  "gaji pokok": "basicSalary",
  "gaji": "basicSalary",
  "basic salary": "basicSalary",
  "basicsalary": "basicSalary",

  // Bank
  "nama bank": "bankName",
  "bank": "bankName",
  "bankname": "bankName",

  // Nomor Rekening
  "nomor rekening": "bankAccountNumber",
  "no rekening": "bankAccountNumber",
  "no rek": "bankAccountNumber",
  "rekening": "bankAccountNumber",
  "bankaccountnumber": "bankAccountNumber",
};

export const SAMPLE_TEMPLATE_ROWS = [
  {
    "NIK Karyawan": "EMP-011",
    "Nama Depan": "Budi",
    "Nama Belakang": "Santoso",
    "Email": "budi.santoso@kanaya.com",
    "Nomor HP": "081234567891",
    "Jenis Kelamin": "Laki-laki",
    "Departemen": "Software Engineering",
    "Jabatan": "Senior Frontend Engineer",
    "Status Karyawan": "PERMANENT",
    "Tipe Kerja": "FULL_TIME",
    "Tanggal Masuk": "2026-01-15",
    "NIK KTP": "3171012345670001",
    "NPWP": "09.123.456.7-012.000",
    "BPJS Kesehatan": "0001234567890",
    "BPJS Ketenagakerjaan": "98765432101",
    "Status PTKP": "TK/0",
    "Gaji Pokok": 12500000,
    "Nama Bank": "BCA",
    "Nomor Rekening": "5420129871",
  },
  {
    "NIK Karyawan": "EMP-012",
    "Nama Depan": "Siti",
    "Nama Belakang": "Rahmawati",
    "Email": "siti.rahmawati@kanaya.com",
    "Nomor HP": "081234567892",
    "Jenis Kelamin": "Perempuan",
    "Departemen": "Human Resources",
    "Jabatan": "HR Specialist",
    "Status Karyawan": "PROBATION",
    "Tipe Kerja": "FULL_TIME",
    "Tanggal Masuk": "2026-02-01",
    "NIK KTP": "3171012345670002",
    "NPWP": "09.123.456.7-012.001",
    "BPJS Kesehatan": "0001234567891",
    "BPJS Ketenagakerjaan": "98765432102",
    "Status PTKP": "K/1",
    "Gaji Pokok": 8500000,
    "Nama Bank": "Mandiri",
    "Nomor Rekening": "1370019283741",
  },
  {
    "NIK Karyawan": "EMP-013",
    "Nama Depan": "Reza",
    "Nama Belakang": "Pratama",
    "Email": "reza.pratama@kanaya.com",
    "Nomor HP": "081234567893",
    "Jenis Kelamin": "Laki-laki",
    "Departemen": "Finance & Accounting",
    "Jabatan": "Finance Specialist",
    "Status Karyawan": "CONTRACT",
    "Tipe Kerja": "FULL_TIME",
    "Tanggal Masuk": "2026-03-01",
    "NIK KTP": "3171012345670003",
    "NPWP": "09.123.456.7-012.002",
    "BPJS Kesehatan": "0001234567892",
    "BPJS Ketenagakerjaan": "98765432103",
    "Status PTKP": "TK/1",
    "Gaji Pokok": 9000000,
    "Nama Bank": "BRI",
    "Nomor Rekening": "012301049281503",
  },
];

export function parseDateValue(val: any): string {
  if (!val) {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  // If already a Date object
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }

  // If number (Excel serial date number e.g. 45320)
  if (typeof val === "number") {
    // Excel base date: Dec 30 1899
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    return jsDate.toISOString().split("T")[0];
  }

  const str = String(val).trim();
  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Attempt JS date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

export function parseGender(val: any): "MALE" | "FEMALE" {
  if (!val) return "MALE";
  const str = String(val).trim().toUpperCase();
  if (["P", "PEREMPUAN", "WANITA", "FEMALE", "F"].includes(str)) {
    return "FEMALE";
  }
  return "MALE";
}

export function parseEmploymentStatus(val: any): "PERMANENT" | "PROBATION" | "CONTRACT" {
  if (!val) return "PROBATION";
  const str = String(val).trim().toUpperCase();
  if (str.includes("TETAP") || str.includes("PERM")) return "PERMANENT";
  if (str.includes("KONTRAK") || str.includes("CONTR")) return "CONTRACT";
  return "PROBATION";
}

export function parseEmploymentType(val: any): "FULL_TIME" | "PART_TIME" | "INTERN" {
  if (!val) return "FULL_TIME";
  const str = String(val).trim().toUpperCase();
  if (str.includes("PART") || str.includes("PARUH")) return "PART_TIME";
  if (str.includes("MAGANG") || str.includes("INTERN")) return "INTERN";
  return "FULL_TIME";
}

export function parseBasicSalary(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  let str = String(val).trim();

  // If format like "Rp 9.500.000,00" or "9.500.000":
  if (str.includes(",")) {
    // Dots are thousand separators, comma is decimal
    str = str.replace(/\./g, "").replace(",", ".");
  } else if ((str.match(/\./g) || []).length > 1) {
    // Multiple dots e.g. 9.500.000 -> all dots are thousand separators
    str = str.replace(/\./g, "");
  } else {
    // Single dot followed by exactly 3 digits e.g. "500.000" or "10.000"
    const digitsOnly = str.replace(/[^0-9.]/g, "");
    if (/^\d{1,3}\.\d{3}$/.test(digitsOnly)) {
      str = str.replace(/\./g, "");
    }
  }

  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseRawImportRows(rawRows: any[]): ParsedEmployeeRow[] {
  const parsedRows: ParsedEmployeeRow[] = [];
  const seenNiks = new Set<string>();
  const seenEmails = new Set<string>();

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNum = idx + 2; // header is row 1, data starts row 2

    // Map columns
    const mapped: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      const normalizedKey = key.trim().toLowerCase().replace(/[\t\r\n]/g, "");
      const targetField = IMPORT_HEADERS_MAPPING[normalizedKey];
      if (targetField) {
        mapped[targetField] = val;
      }
    }

    const errors: string[] = [];

    // NIK validation
    const employeeIdNumber = String(mapped.employeeIdNumber || "").trim();
    if (!employeeIdNumber) {
      errors.push("NIK Karyawan wajib diisi");
    } else if (seenNiks.has(employeeIdNumber.toUpperCase())) {
      errors.push(`NIK '${employeeIdNumber}' duplikat dalam file impor`);
    } else {
      seenNiks.add(employeeIdNumber.toUpperCase());
    }

    // First Name validation
    const firstName = String(mapped.firstName || "").trim();
    if (!firstName) {
      errors.push("Nama Depan wajib diisi");
    }

    const lastName = String(mapped.lastName || "").trim();

    // Email validation
    const email = String(mapped.email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.push("Email wajib diisi");
    } else if (!emailRegex.test(email)) {
      errors.push("Format email tidak valid");
    } else if (seenEmails.has(email)) {
      errors.push(`Email '${email}' duplikat dalam file impor`);
    } else {
      seenEmails.add(email);
    }

    // NIK KTP validation
    const idCardNumber = mapped.idCardNumber ? String(mapped.idCardNumber).trim() : undefined;
    const phone = mapped.phone ? String(mapped.phone).trim() : "";
    const gender = parseGender(mapped.gender);
    const departmentName = mapped.departmentName ? String(mapped.departmentName).trim() : undefined;
    const positionName = mapped.positionName ? String(mapped.positionName).trim() : undefined;
    const employmentStatus = parseEmploymentStatus(mapped.employmentStatus);
    const employmentType = parseEmploymentType(mapped.employmentType);
    const joinDate = parseDateValue(mapped.joinDate);
    const npwp = mapped.npwp ? String(mapped.npwp).trim() : undefined;
    const bpjsKesehatan = mapped.bpjsKesehatan ? String(mapped.bpjsKesehatan).trim() : undefined;
    const bpjsKetenagakerjaan = mapped.bpjsKetenagakerjaan ? String(mapped.bpjsKetenagakerjaan).trim() : undefined;
    
    // Tax Status
    let taxStatus = String(mapped.taxStatus || "TK/0").trim().toUpperCase();
    const validTaxStatuses = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];
    if (!validTaxStatuses.includes(taxStatus)) {
      taxStatus = "TK/0";
    }

    const basicSalary = parseBasicSalary(mapped.basicSalary);
    const bankName = mapped.bankName ? String(mapped.bankName).trim().toUpperCase() : undefined;
    const bankAccountNumber = mapped.bankAccountNumber ? String(mapped.bankAccountNumber).trim() : undefined;

    parsedRows.push({
      rowNumber: rowNum,
      employeeIdNumber,
      firstName,
      lastName,
      email,
      phone,
      gender,
      departmentName,
      positionName,
      employmentStatus,
      employmentType,
      joinDate,
      idCardNumber,
      npwp,
      bpjsKesehatan,
      bpjsKetenagakerjaan,
      taxStatus,
      basicSalary,
      bankName,
      bankAccountNumber,
      isValid: errors.length === 0,
      errors,
    });
  }

  return parsedRows;
}

export function generateSampleCsvString(): string {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
  return XLSX.utils.sheet_to_csv(ws);
}

export function generateSampleExcelBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);

  // Set column widths
  ws["!cols"] = [
    { wch: 14 }, // NIK
    { wch: 16 }, // Nama Depan
    { wch: 16 }, // Nama Belakang
    { wch: 28 }, // Email
    { wch: 16 }, // No HP
    { wch: 14 }, // Gender
    { wch: 24 }, // Departemen
    { wch: 26 }, // Jabatan
    { wch: 18 }, // Status
    { wch: 14 }, // Tipe
    { wch: 14 }, // Tgl Masuk
    { wch: 20 }, // NIK KTP
    { wch: 22 }, // NPWP
    { wch: 18 }, // BPJS Kes
    { wch: 18 }, // BPJS TK
    { wch: 12 }, // PTKP
    { wch: 16 }, // Gaji Pokok
    { wch: 12 }, // Bank
    { wch: 18 }, // No Rek
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Template Karyawan");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  return Buffer.from(wbout);
}
