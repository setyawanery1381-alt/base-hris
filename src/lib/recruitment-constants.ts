export const PIPELINE_STAGES = [
  { id: "APPLIED", label: "Lamaran Masuk", badgeColor: "bg-slate-100 text-slate-700" },
  { id: "SCREENING", label: "Screening CV", badgeColor: "bg-amber-100 text-amber-800" },
  { id: "INTERVIEW_HR", label: "Wawancara HR", badgeColor: "bg-blue-100 text-blue-800" },
  { id: "INTERVIEW_USER", label: "Wawancara User", badgeColor: "bg-purple-100 text-purple-800" },
  { id: "OFFERING", label: "Offering Letter", badgeColor: "bg-teal-100 text-teal-800" },
  { id: "HIRED", label: "Diterima (Hired)", badgeColor: "bg-emerald-100 text-emerald-800" },
  { id: "REJECTED", label: "Ditolak", badgeColor: "bg-rose-100 text-rose-800" },
];

export const DEFAULT_ONBOARDING_TASKS = [
  {
    title: "Pengumpulan Berkas Administrasi (KTP, KK, NPWP, & Buku Tabungan)",
    category: "DOCUMENT",
    daysFromJoin: 1,
  },
  {
    title: "Pembuatan Akun Email Perusahaan & Kredensial Akses Base HRIS",
    category: "IT_SETUP",
    daysFromJoin: 1,
  },
  {
    title: "Serah Terima Perangkat Laptop, ID Card, & Perlengkapan Kerja",
    category: "IT_SETUP",
    daysFromJoin: 1,
  },
  {
    title: "Sesi Pengenalan Budaya Kerja, Peraturan Perusahaan, & Kebijakan HR",
    category: "HR_ORIENTATION",
    daysFromJoin: 3,
  },
  {
    title: "Pengenalan Tim Kerja Divisi & Penugasan Mentor / Buddy",
    category: "TEAM_INTRO",
    daysFromJoin: 5,
  },
  {
    title: "Sesi Evaluasi 30 Hari Pertama Masa Percobaan (Probation Review)",
    category: "TRAINING",
    daysFromJoin: 30,
  },
];
