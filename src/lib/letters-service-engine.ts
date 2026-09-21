// =============================================================
// BASE HRIS - HR SERVICE DESK, OFFICIAL LETTERS & ANNOUNCEMENTS ENGINE
// Safe for both Client and Server imports (No db/fs dependencies)
// =============================================================

export const SERVICE_CATEGORIES = [
  { id: "EMPLOYMENT_LETTER", label: "Permohonan Surat Keterangan Kerja", description: "Untuk pengajuan visa, paspor, dinas, atau bank", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "SALARY_LETTER", label: "Permohonan Surat Keterangan Penghasilan", description: "Untuk pengajuan KPR, kredit bank, atau sewa properti", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "DATA_CHANGE", label: "Pembaruan Data Pribadi / PTKP / Rekening", description: "Perubahan alamat, rekening bank payroll, atau status keluarga", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "BPJS_INQUIRY", label: "Layanan & Bantuan BPJS (Kesehatan / Ketenagakerjaan)", description: "Penambahan tanggungan keluarga, kendala faskes, atau klaim JHT", badgeColor: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "OFFBOARDING", label: "Pengunduran Diri & Penerbitan Paklaring", description: "Konsultasi resign, serah terima tugas, dan sertifikat kerja", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "GENERAL", label: "Konsultasi & Pertanyaan Umum HR", description: "Kebijakan kantor, fasilitas karyawan, atau saran kerja", badgeColor: "bg-slate-100 text-slate-700 border-slate-200" },
] as const;

export const SERVICE_STATUSES = {
  SUBMITTED: { label: "Menunggu Respon", color: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_REVIEW: { label: "Sedang Ditinjau HR", color: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "Sedang Diproses", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  RESOLVED: { label: "Selesai Dijawab", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Tiket Ditutup", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const SERVICE_PRIORITIES = {
  LOW: { label: "Rendah", color: "bg-slate-100 text-slate-600 border-slate-200" },
  MEDIUM: { label: "Normal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  HIGH: { label: "Penting", color: "bg-amber-50 text-amber-700 border-amber-200" },
  URGENT: { label: "Mendesak / Urgent", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const LETTER_TYPES = [
  { id: "SK_AKTIF_KERJA", prefix: "SKK", label: "Surat Keterangan Kerja Aktif", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "SK_PENGHASILAN", prefix: "SKP", label: "Surat Keterangan Penghasilan (Slip/KPR)", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "SURAT_PERINGATAN_1", prefix: "SP1", label: "Surat Peringatan Pertama (SP 1)", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "SURAT_PERINGATAN_2", prefix: "SP2", label: "Surat Peringatan Kedua (SP 2)", badgeColor: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "SURAT_PERINGATAN_3", prefix: "SP3", label: "Surat Peringatan Ketiga (SP 3 / Terakhir)", badgeColor: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "PAKLARING", prefix: "PKL", label: "Surat Pengalaman Kerja (Paklaring)", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
] as const;

export const ANNOUNCEMENT_CATEGORIES = [
  { id: "GENERAL", label: "Informasi Umum", badgeColor: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "POLICY_UPDATE", label: "Pembaruan Kebijakan & Peraturan", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "HOLIDAY", label: "Hari Libur Nasional & Cuti Bersama", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "EVENT", label: "Acara & Kegiatan Perusahaan", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "URGENT", label: "Pengumuman Mendesak (Urgent)", badgeColor: "bg-rose-50 text-rose-700 border-rose-200" },
] as const;

export const ANNOUNCEMENT_PRIORITIES = {
  NORMAL: { label: "Biasa", color: "bg-slate-100 text-slate-600" },
  IMPORTANT: { label: "Penting", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  CRITICAL: { label: "Kritikal / Wajib Dibaca", color: "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse" },
};

/**
 * Convert month number (1 - 12) to Roman numeral
 */
export function toRomanMonth(monthNumber: number): string {
  const romanMap = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const index = Math.max(1, Math.min(12, monthNumber)) - 1;
  return romanMap[index];
}

/**
 * Generate standard Indonesian HR Official Letter Number
 * Format: [SEQ]/HR-[TYPE]/[COMPANY_CODE]/[ROMAN_MONTH]/[YEAR]
 * Example: 014/HR-SKK/KMS/IX/2026
 */
export function generateLetterNumber(
  sequenceNumber: number,
  letterType: string,
  companyCode: string = "KMS",
  date: Date = new Date()
): string {
  const seq = String(sequenceNumber).padStart(3, "0");
  const foundType = LETTER_TYPES.find((t) => t.id === letterType);
  const prefix = foundType ? foundType.prefix : "HR";
  const romanMonth = toRomanMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const compCode = (companyCode || "KMS").toUpperCase().slice(0, 4);

  return `${seq}/HR-${prefix}/${compCode}/${romanMonth}/${year}`;
}

/**
 * Generate unique Helpdesk Ticket Number
 * Format: TKT/YYYY/MM/XXXX
 */
export function generateTicketNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `TKT/${year}/${month}/${seq}`;
}

/**
 * Generate verification QR hash / token for official letters
 */
export function generateQrVerificationToken(letterNumber: string, employeeIdNumber: string): string {
  const cleanedLetter = letterNumber.replace(/[^A-Za-z0-9]/g, "");
  return `VERIF-${cleanedLetter}-${employeeIdNumber}`;
}

/**
 * Format Date into formal Indonesian string
 * Example: 21 September 2026
 */
export function formatIndonesianDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
