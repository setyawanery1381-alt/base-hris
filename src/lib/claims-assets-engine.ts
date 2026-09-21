// =============================================================
// BASE HRIS - CLAIMS, SPPD & ASSETS CALCULATION & DOMAIN ENGINE
// Safe for both Client and Server imports (No db/fs dependencies)
// =============================================================

export const CLAIM_CATEGORIES = [
  { id: "MEDICAL", label: "Medis & Pengobatan", description: "Rawat jalan, obat dokter, kuitansi klinik/RS", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "TRANSPORT", label: "Transportasi & Parkir", description: "Bensin, tol, taksi/ojol, tiket perjalanan dinas", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "MEAL", label: "Konsumsi & Makan Lembur", description: "Makan dinas, jamuan klien, konsumsi lembur", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "OPTICAL", label: "Kacamata & Lensa", description: "Pemeriksaan mata & pembelian kacamata kerja", badgeColor: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "COMMUNICATION", label: "Pulsa & Paket Data", description: "Komunikasi operasional & kuota internet dinas", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "PROJECT_EXPENSE", label: "Operasional Lapangan / Proyek", description: "Biaya logistik proyek & perlengkapan lapangan", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "OTHER", label: "Lainnya", description: "Pengeluaran dinas lain yang disetujui", badgeColor: "bg-slate-100 text-slate-700 border-slate-200" },
] as const;

export const CLAIM_STATUSES = {
  PENDING: { label: "Menunggu Review", color: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Disetujui HR/Manager", color: "bg-blue-50 text-blue-700 border-blue-200" },
  REJECTED: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
  PAID: { label: "Sudah Dicairkan (Lunas)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const TRANSPORT_TYPES = [
  { id: "FLIGHT", label: "Pesawat Terbang" },
  { id: "TRAIN", label: "Kereta Api (KAI)" },
  { id: "CAR_RENTAL", label: "Sewa Mobil / Taksi" },
  { id: "COMPANY_CAR", label: "Kendaraan Operasional Kantor" },
  { id: "PUBLIC_TRANSPORT", label: "Transportasi Umum / Bus" },
] as const;

export const TRIP_STATUSES = {
  PENDING: { label: "Menunggu Persetujuan", color: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Disetujui (Terbit SPPD)", color: "bg-blue-50 text-blue-700 border-blue-200" },
  DISBURSED: { label: "Uang Muka Dicairkan", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Selesai", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Dibatalkan", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const TRIP_SETTLEMENT_STATUSES = {
  NOT_SETTLED: { label: "Belum Ada Realisasi", color: "bg-slate-100 text-slate-600 border-slate-200" },
  SUBMITTED: { label: "Realisasi Diajukan", color: "bg-amber-50 text-amber-700 border-amber-200" },
  SETTLED: { label: "Pertanggungjawaban Selesai (Settled)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const ASSET_CATEGORIES = [
  { id: "LAPTOP", prefix: "LAP", label: "Laptop & MacBook" },
  { id: "DESKTOP", prefix: "DSK", label: "Komputer PC Desktop" },
  { id: "MONITOR", prefix: "MON", label: "Monitor & Display" },
  { id: "PHONE", prefix: "PHN", label: "Smartphone / Tablet" },
  { id: "VEHICLE", prefix: "VHC", label: "Kendaraan Operasional (Mobil/Motor)" },
  { id: "OFFICE_EQUIPMENT", prefix: "OEQ", label: "Peralatan Kantor (Printer, dsb)" },
  { id: "FURNITURE", prefix: "FUR", label: "Perabot & Meja Kursi" },
  { id: "OTHER", prefix: "AST", label: "Aset Lainnya" },
] as const;

export const ASSET_CONDITIONS = {
  EXCELLENT: { label: "Sangat Baik (Seperti Baru)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  GOOD: { label: "Baik & Berfungsi Normal", color: "bg-blue-50 text-blue-700 border-blue-200" },
  FAIR: { label: "Cukup (Ada Bekas Pemakaian)", color: "bg-amber-50 text-amber-700 border-amber-200" },
  DAMAGED: { label: "Rusak / Butuh Servis", color: "bg-rose-50 text-rose-700 border-rose-200" },
  DISPOSED: { label: "Dihapus / Tidak Dipakai", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export const ASSET_STATUSES = {
  AVAILABLE: { label: "Tersedia di Gudang", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ASSIGNED: { label: "Digunakan Karyawan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_MAINTENANCE: { label: "Dalam Perbaikan / Servis", color: "bg-amber-50 text-amber-700 border-amber-200" },
  LOST: { label: "Hilang", color: "bg-rose-50 text-rose-700 border-rose-200" },
  DISPOSED: { label: "Disposed / Dihapus", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

/**
 * Format number into Indonesian Rupiah currency string
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate total per-diem allowance based on duration in days and daily rate
 */
export function calculatePerDiemTotal(durationDays: number, perDiemRate: number): number {
  const days = Math.max(1, Math.floor(durationDays || 1));
  const rate = Math.max(0, perDiemRate || 0);
  return days * rate;
}

/**
 * Calculate trip duration in days (inclusive of departure and return dates)
 */
export function calculateTripDuration(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Calculate settlement balance for a business trip
 * Balance = cashAdvance - actualExpense
 * Positive -> Employee refunds leftover cash to company (Lebih Bayar)
 * Negative -> Company reimburses shortage to employee (Kurang Bayar)
 * Zero -> Exact match (Pas)
 */
export function calculateSettlementBalance(cashAdvance: number, actualExpense: number) {
  const advance = Math.max(0, cashAdvance || 0);
  const actual = Math.max(0, actualExpense || 0);
  const balance = advance - actual;

  let type: "REFUND_TO_COMPANY" | "REIMBURSE_TO_EMPLOYEE" | "BALANCED" = "BALANCED";
  if (balance > 0) {
    type = "REFUND_TO_COMPANY";
  } else if (balance < 0) {
    type = "REIMBURSE_TO_EMPLOYEE";
  }

  return {
    advance,
    actual,
    balance,
    absBalance: Math.abs(balance),
    type,
    formattedBalance: formatRupiah(Math.abs(balance)),
    statusDescription:
      type === "REFUND_TO_COMPANY"
        ? `Lebih Bayar: Karyawan mengembalikan sisa ${formatRupiah(Math.abs(balance))} ke kantor`
        : type === "REIMBURSE_TO_EMPLOYEE"
        ? `Kurang Bayar: Kantor mengganti kelebihan biaya karyawan ${formatRupiah(Math.abs(balance))}`
        : "Realisasi pas dengan uang muka (Rp 0)",
  };
}

/**
 * Calculate total claim sum from an array of items
 */
export function calculateClaimTotal(items: Array<{ amount: number }>): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

/**
 * Generate unique Claim Number
 * Format: CLM/YYYY/MM/XXXX
 */
export function generateClaimNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `CLM/${year}/${month}/${seq}`;
}

/**
 * Generate unique Business Trip (SPPD) Number
 * Format: SPPD/YYYY/MM/XXXX
 */
export function generateTripNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `SPPD/${year}/${month}/${seq}`;
}

/**
 * Generate unique Asset Code
 * Format: AST-[CATEGORY_PREFIX]-XXXX
 */
export function generateAssetCode(category: string, sequenceNumber: number): string {
  const cat = ASSET_CATEGORIES.find((c) => c.id === category);
  const prefix = cat ? cat.prefix : "AST";
  const seq = String(sequenceNumber).padStart(4, "0");
  return `AST-${prefix}-${seq}`;
}
