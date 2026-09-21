import { db } from "../src/lib/db";
import {
  generateLetterNumber,
  generateTicketNumber,
  generateQrVerificationToken,
} from "../src/lib/letters-service-engine";

async function seedPhase7Data() {
  console.log("🌱 SEEDING PHASE 7 DEMO DATA: HR SERVICE DESK, LETTERS & ANNOUNCEMENTS...");

  // 1. Get primary company
  let company = await db.company.findFirst({
    where: { code: "kanaya" },
    include: { employees: { include: { position: true, department: true } } },
  });

  if (!company || company.employees.length === 0) {
    company = await db.company.findFirst({
      where: { employees: { some: {} } },
      include: { employees: { include: { position: true, department: true } } },
    });
  }

  if (!company || company.employees.length === 0) {
    console.error("Company or employees not found. Please ensure initial seeds ran.");
    return;
  }

  const emps = company.employees;
  const primaryEmp = emps[0];
  const secondaryEmp = emps.length > 1 ? emps[1] : emps[0];
  const adminUser = await db.user.findFirst({
    where: { companyId: company.id },
  });

  const authorName = adminUser?.name || "Budi Pratama, S.Psi (HR Director)";

  console.log(`Found Company: ${company.name} with ${emps.length} employees.`);

  // 2. Clear previous Phase 7 demo data if re-seeding
  await db.hrServiceComment.deleteMany({
    where: { serviceRequest: { companyId: company.id } },
  });
  await db.hrServiceRequest.deleteMany({ where: { companyId: company.id } });
  await db.employeeLetter.deleteMany({ where: { companyId: company.id } });
  await db.announcement.deleteMany({ where: { companyId: company.id } });

  console.log("Cleaned previous demo data.");

  // 3. Seed Announcements
  console.log("Broadcasting company announcements...");
  const announcementsData = [
    {
      title: "Kebijakan Pelaksanaan WFA (Work From Anywhere) & Fleksibilitas Jam Kerja Q4 2026",
      content: `Yth. Seluruh Karyawan PT Kanaya Multi Solusindo,

Manajemen menetapkan kebijakan fleksibilitas kerja baru mulai 1 Oktober 2026:
1. Karyawan divisi Engineering dan Product berhak mengajukan 2 hari WFA dalam sepekan dengan persetujuan Lead masing-masing.
2. Check-in kehadiran tetap wajib dilakukan via aplikasi BASE HRIS Mobile dengan validasi selfie dan GPS live.
3. Core working hours ditetapkan pukul 10:00 - 16:00 WIB untuk memastikan kelancaran koordinasi lintas tim.

Harap memperhatikan target pencapaian KPI masing-masing selama periode evaluasi.`,
      category: "POLICY_UPDATE",
      priority: "CRITICAL",
      target: "ALL",
      authorName: "Direksi & Divisi People & Operations",
      isPinned: true,
      date: new Date("2026-09-20T08:30:00Z"),
    },
    {
      title: "Pemberitahuan Libur Nasional Maulid Nabi Muhammad SAW 1448 H",
      content: `Diberitahukan kepada seluruh karyawan bahwa kantor akan libur operasional pada tanggal 24 September 2026 dalam rangka peringatan Hari Besar Nasional.

Operasional kantor akan kembali normal pada hari kerja berikutnya. Bagi tim Customer Support dan On-Call Onboarding yang bertugas piket, perhitungan lembur hari libur nasional akan dihitung otomatis sesuai UU Cipta Kerja melalui sistem Payroll BASE HRIS.`,
      category: "HOLIDAY",
      priority: "IMPORTANT",
      target: "ALL",
      authorName: "Corporate HR Team",
      isPinned: true,
      date: new Date("2026-09-18T10:00:00Z"),
    },
    {
      title: "Townhall & Sharing Session: Q3 Business Performance & Roadmap AI Innovation",
      content: `Halo Insan Kanaya,

Jangan lewatkan agenda Townhall All-Hands Meeting Q3 2026:
🗓️ Hari/Tanggal: Jumat, 25 September 2026
⏰ Waktu: 14:00 - 16:30 WIB
📍 Lokasi: Auditorium Lantai 8 & Zoom Webinar

Agenda meliputi paparan kinerja perusahaan kuartal ketiga, peluncuran modul baru BASE HRIS AI Logic, serta sesi apresiasi Employee of the Quarter. Disediakan doorprize dan coffee break untuk seluruh peserta offline!`,
      category: "EVENT",
      priority: "NORMAL",
      target: "ALL",
      authorName: "Internal Communications",
      isPinned: false,
      date: new Date("2026-09-15T09:00:00Z"),
    },
    {
      title: "Pengingat: Batas Akhir Klaim Reimbursement Medis & Transportasi Bulan September",
      content: `Pemberitahuan kepada seluruh karyawan: Pengajuan klaim kwitansi medis, kacamata, dan perjalanan dinas periode bulan September 2026 akan ditutup pada tanggal 25 September pukul 17:00 WIB.

Pastikan struk/bukti asli telah difoto dengan jelas dan diajukan melalui menu 'Klaim/Reimburse' di aplikasi mobile. Pengajuan setelah tanggal tersebut akan diproses pada payroll bulan berikutnya.`,
      category: "GENERAL",
      priority: "NORMAL",
      target: "ALL",
      authorName: "Finance & Payroll HR",
      isPinned: false,
      date: new Date("2026-09-12T11:00:00Z"),
    },
  ];

  for (const ann of announcementsData) {
    await db.announcement.create({
      data: {
        companyId: company.id,
        ...ann,
      },
    });
  }

  // 4. Seed Official Employee Letters
  console.log("Generating official Indonesian letters...");
  const lettersData = [
    {
      employeeId: primaryEmp.id,
      letterNumber: generateLetterNumber(1, "SK_AKTIF_KERJA", company.code, new Date("2026-09-10")),
      type: "SK_AKTIF_KERJA",
      title: "SURAT KETERANGAN KERJA AKTIF",
      issuedDate: new Date("2026-09-10"),
      purpose: "Pengajuan Visa Wisata Kedutaan Besar Jepang",
      signerName: "Hendrawan Pratama, M.M.",
      signerPosition: "Head of People & Operations",
      signerNik: "DIR-002",
      status: "PUBLISHED",
      qrCodeVerification: generateQrVerificationToken(
        generateLetterNumber(1, "SK_AKTIF_KERJA", company.code, new Date("2026-09-10")),
        primaryEmp.employeeIdNumber
      ),
      contentData: JSON.stringify({
        notes: "Karyawan memiliki rekam jejak kedisiplinan dan kinerja sangat baik.",
      }),
    },
    {
      employeeId: primaryEmp.id,
      letterNumber: generateLetterNumber(2, "SK_PENGHASILAN", company.code, new Date("2026-09-15")),
      type: "SK_PENGHASILAN",
      title: "SURAT KETERANGAN PENGHASILAN KARYAWAN",
      issuedDate: new Date("2026-09-15"),
      purpose: "Pengajuan KPR Bank Mandiri KC Puri Indah",
      signerName: "Hendrawan Pratama, M.M.",
      signerPosition: "Head of People & Operations",
      signerNik: "DIR-002",
      status: "PUBLISHED",
      qrCodeVerification: generateQrVerificationToken(
        generateLetterNumber(2, "SK_PENGHASILAN", company.code, new Date("2026-09-15")),
        primaryEmp.employeeIdNumber
      ),
      contentData: JSON.stringify({
        monthlySalary: 18500000,
        notes: "Gaji pokok beserta tunjangan tetap telah dipotong pajak PPh 21 dan BPJS ketenagakerjaan.",
      }),
    },
    {
      employeeId: secondaryEmp.id,
      letterNumber: generateLetterNumber(3, "SURAT_PERINGATAN_1", company.code, new Date("2026-09-05")),
      type: "SURAT_PERINGATAN_1",
      title: "SURAT PERINGATAN PERTAMA (SP 1)",
      issuedDate: new Date("2026-09-05"),
      validUntil: new Date("2027-03-05"),
      purpose: "Sanksi Kedisiplinan Keterlambatan Kerja Tanpa Konfirmasi",
      signerName: "Hendrawan Pratama, M.M.",
      signerPosition: "Head of People & Operations",
      signerNik: "DIR-002",
      status: "PUBLISHED",
      qrCodeVerification: generateQrVerificationToken(
        generateLetterNumber(3, "SURAT_PERINGATAN_1", company.code, new Date("2026-09-05")),
        secondaryEmp.employeeIdNumber
      ),
      contentData: JSON.stringify({
        spReason: "Keterlambatan masuk kerja lebih dari 45 menit sebanyak 5 hari kerja berturut-turut tanpa izin atasan.",
      }),
    },
    {
      employeeId: secondaryEmp.id,
      letterNumber: generateLetterNumber(4, "PAKLARING", company.code, new Date("2026-08-30")),
      type: "PAKLARING",
      title: "SURAT PENGALAMAN KERJA (PAKLARING)",
      issuedDate: new Date("2026-08-30"),
      purpose: "Bukti Riwayat Kerja & Pengalaman Profesional",
      signerName: "Hendrawan Pratama, M.M.",
      signerPosition: "Head of People & Operations",
      signerNik: "DIR-002",
      status: "PUBLISHED",
      qrCodeVerification: generateQrVerificationToken(
        generateLetterNumber(4, "PAKLARING", company.code, new Date("2026-08-30")),
        secondaryEmp.employeeIdNumber
      ),
      contentData: JSON.stringify({
        lastWorkingDay: "2026-08-31",
        reasonOfLeaving: "Menyelesaikan kontrak kerja proyek dengan sangat baik.",
      }),
    },
  ];

  for (const letData of lettersData) {
    await db.employeeLetter.create({
      data: {
        companyId: company.id,
        ...letData,
      },
    });
  }

  // 5. Seed HR Service Desk Tickets & Two-way Chat Threads
  console.log("Generating HR Service Desk tickets & chat threads...");

  // Ticket 1: BPJS Inquiry (RESOLVED)
  const ticket1 = await db.hrServiceRequest.create({
    data: {
      companyId: company.id,
      employeeId: primaryEmp.id,
      ticketNumber: generateTicketNumber(1, new Date("2026-09-12")),
      category: "BPJS_INQUIRY",
      priority: "HIGH",
      status: "RESOLVED",
      subject: "Pendaftaran Penambahan Faskes & Tanggungan Bayi BPJS Kesehatan",
      description: "Halo Tim HR, saya baru saja menyambut kelahiran anak kedua. Mohon bantuannya untuk menambahkan anak saya ke kartu BPJS Kesehatan tanggungan perusahaan.",
      assignedTo: "Nurul Aini (HR Benefits Specialist)",
      resolutionNotes: "Penambahan data anak ke kepesertaan e-Dabu BPJS Kesehatan telah berhasil diproses. Kartu digital KIS sudah aktif di aplikasi Mobile JKN.",
      resolvedAt: new Date("2026-09-14T15:30:00Z"),
      createdAt: new Date("2026-09-12T09:00:00Z"),
    },
  });

  await db.hrServiceComment.createMany({
    data: [
      {
        serviceRequestId: ticket1.id,
        authorId: primaryEmp.userId || primaryEmp.id,
        authorRole: "EMPLOYEE",
        authorName: `${primaryEmp.firstName} ${primaryEmp.lastName}`,
        message: "Selamat pagi Bu Nurul, saya sudah siapkan berkas Akta Kelahiran dan Kartu Keluarga terbaru. Apakah perlu dikirim fisik atau scan PDF saja?",
        createdAt: new Date("2026-09-12T09:15:00Z"),
      },
      {
        serviceRequestId: ticket1.id,
        authorId: adminUser?.id || "hr-admin-1",
        authorRole: "HR",
        authorName: "Nurul Aini (HR Benefits)",
        message: "Selamat pagi Mas! Selamat atas kelahiran buah hatinya. Cukup kirimkan file scan PDF KK dan Surat Keterangan Lahir / Akta via chat ini ya.",
        createdAt: new Date("2026-09-12T11:00:00Z"),
      },
      {
        serviceRequestId: ticket1.id,
        authorId: primaryEmp.userId || primaryEmp.id,
        authorRole: "EMPLOYEE",
        authorName: `${primaryEmp.firstName} ${primaryEmp.lastName}`,
        message: "Baik Bu, dokumen sudah saya email dan konfirmasi nomor NIK bayi. Terima kasih banyak!",
        createdAt: new Date("2026-09-12T13:30:00Z"),
      },
      {
        serviceRequestId: ticket1.id,
        authorId: adminUser?.id || "hr-admin-1",
        authorRole: "HR",
        authorName: "Nurul Aini (HR Benefits)",
        message: "Sudah terbit ya Mas nomor kartu BPJS-nya di e-Dabu. Tiket ini kami selesaikan. Jangan ragu hubungi kami jika ada pertanyaan lain.",
        createdAt: new Date("2026-09-14T15:30:00Z"),
      },
    ],
  });

  // Ticket 2: Data Change (IN_PROGRESS)
  const ticket2 = await db.hrServiceRequest.create({
    data: {
      companyId: company.id,
      employeeId: primaryEmp.id,
      ticketNumber: generateTicketNumber(2, new Date("2026-09-19")),
      category: "DATA_CHANGE",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      subject: "Pembaruan Nomor Rekening Payroll Bank Mandiri",
      description: "Mohon izin melakukan update nomor rekening transfer gaji payroll mulai periode akhir bulan September ini karena rekening BCA lama dinonaktifkan.",
      assignedTo: "Fajar Wicaksono (Payroll Specialist)",
      createdAt: new Date("2026-09-19T14:00:00Z"),
    },
  });

  await db.hrServiceComment.createMany({
    data: [
      {
        serviceRequestId: ticket2.id,
        authorId: primaryEmp.userId || primaryEmp.id,
        authorRole: "EMPLOYEE",
        authorName: `${primaryEmp.firstName} ${primaryEmp.lastName}`,
        message: "Nomor Rekening Mandiri baru saya: 137-00-1234567-8 atas nama pribadi. Buku tabungan halaman depan sudah siap.",
        createdAt: new Date("2026-09-19T14:10:00Z"),
      },
      {
        serviceRequestId: ticket2.id,
        authorId: adminUser?.id || "hr-admin-2",
        authorRole: "HR",
        authorName: "Fajar Wicaksono (Payroll)",
        message: "Halo, data rekening sudah kami terima dan sedang diproses verifikasi ke sistem perbankan. Akan kami update statusnya hari Senin.",
        createdAt: new Date("2026-09-20T10:00:00Z"),
      },
    ],
  });

  // Ticket 3: General Inquiry (SUBMITTED)
  await db.hrServiceRequest.create({
    data: {
      companyId: company.id,
      employeeId: secondaryEmp.id,
      ticketNumber: generateTicketNumber(3, new Date("2026-09-21")),
      category: "GENERAL",
      priority: "LOW",
      status: "SUBMITTED",
      subject: "Informasi Fasilitas Medical Check Up (MCU) Tahunan Perusahaan",
      description: "Halo HR, apakah ada klinik rekanan terdekat area Jakarta Barat untuk pelaksanaan MCU tahunan karyawan, dan bagaimana alur rujukan pendaftarannya?",
      createdAt: new Date("2026-09-21T08:00:00Z"),
    },
  });

  console.log("✅ Seed Phase 7 data completed successfully!");
}

seedPhase7Data()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
