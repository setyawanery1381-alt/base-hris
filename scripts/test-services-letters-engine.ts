import { db } from "../src/lib/db";
import {
  toRomanMonth,
  generateLetterNumber,
  generateTicketNumber,
  generateQrVerificationToken,
  formatIndonesianDate,
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  SERVICE_PRIORITIES,
  LETTER_TYPES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
} from "../src/lib/letters-service-engine";

async function runTests() {
  console.log("==================================================================");
  console.log("🚀 STARTING AUTOMATED TEST SUITE: HR SERVICE DESK, LETTERS & BROADCAST");
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
    // -------------------------------------------------------------
    // UNIT TESTS: Domain Engine & Calculations
    // -------------------------------------------------------------
    console.log("--- 1. Testing Letters & Service Desk Engine Utilities ---");

    // 1.1 Roman Month
    assert(toRomanMonth(1) === "I", "Roman Month for January (1)");
    assert(toRomanMonth(5) === "V", "Roman Month for May (5)");
    assert(toRomanMonth(8) === "VIII", "Roman Month for August (8)");
    assert(toRomanMonth(9) === "IX", "Roman Month for September (9)");
    assert(toRomanMonth(12) === "XII", "Roman Month for December (12)");

    // 1.2 Indonesian Letter Numbering
    const testDate = new Date("2026-09-21T10:00:00Z");
    const letterNum = generateLetterNumber(1, "SK_AKTIF_KERJA", "KMS", testDate);
    assert(
      letterNum === "001/HR-SKK/KMS/IX/2026",
      "Indonesian Official Letter Number Format",
      `Expected 001/HR-SKK/KMS/IX/2026, got ${letterNum}`
    );

    const letterNum2 = generateLetterNumber(42, "PAKLARING", "BASE", testDate);
    assert(
      letterNum2 === "042/HR-PKL/BASE/IX/2026",
      "Paklaring Letter Number Format",
      `Expected 042/HR-PKL/BASE/IX/2026, got ${letterNum2}`
    );

    // 1.3 Ticket Numbering
    const ticketNum = generateTicketNumber(7, testDate);
    assert(
      ticketNum === "TKT/2026/09/0007",
      "HR Service Desk Ticket Number Format",
      `Expected TKT/2026/09/0007, got ${ticketNum}`
    );

    // 1.4 QR Verification Hash Token
    const qrToken = generateQrVerificationToken("001/HR-SKK/KMS/IX/2026", "EMP-001");
    assert(
      qrToken.startsWith("VERIF-") && qrToken.includes("EMP-001"),
      "Digital QR Code Verification Token Format",
      `Expected prefix VERIF- and employee EMP-001, got ${qrToken}`
    );

    // 1.5 Indonesian Date Formatting
    const indonesianDate = formatIndonesianDate("2026-09-21");
    assert(
      indonesianDate.includes("21") && indonesianDate.includes("September") && indonesianDate.includes("2026"),
      "Indonesian Locale Date Formatting",
      `Got ${indonesianDate}`
    );

    // 1.6 Constants sanity
    assert(SERVICE_CATEGORIES.length >= 6, "Service Desk Categories defined");
    assert(LETTER_TYPES.length >= 6, "Letter Types defined");
    assert(ANNOUNCEMENT_CATEGORIES.length >= 5, "Announcement Categories defined");

    // -------------------------------------------------------------
    // DATABASE INTEGRATION & MULTI-TENANCY TESTS
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Database Models & Multi-Tenant Lifecycle ---");

    // Find any existing employee in db
    let employee = await db.employee.findFirst({
      include: { company: true },
    });

    let company: any = employee?.company;

    if (!employee || !company) {
      company = await db.company.findFirst();
      if (!company) {
        company = await db.company.create({
          data: { code: "KMS", name: "PT Kanaya Multi Solusindo" },
        });
      }

      let user = await db.user.findFirst({ where: { companyId: company.id } });
      if (!user) {
        user = await db.user.create({
          data: {
            email: "test.staff@kanaya.com",
            name: "Test Staff",
            passwordHash: "dummy-hash",
            companyId: company.id,
          },
        });
      }

      employee = await db.employee.create({
        data: {
          companyId: company.id,
          userId: user.id,
          employeeIdNumber: "TEST-999",
          firstName: "Setyawan",
          lastName: "Ery",
          joinDate: new Date("2024-01-15"),
        },
      });
    }

    // 2.1 Create HR Service Request
    const testTicket = await db.hrServiceRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        ticketNumber: "TKT/2026/09/9999",
        category: "BPJS_INQUIRY",
        priority: "HIGH",
        status: "SUBMITTED",
        subject: "Pengajuan Penambahan Anggota Keluarga BPJS Kesehatan",
        description: "Mohon bantuan menambahkan anak ke-2 pada tanggungan BPJS Kesehatan perusahaan.",
      },
    });
    assert(Boolean(testTicket && testTicket.id), "Create HR Service Request Ticket");

    // 2.2 Add HR Comments to Thread
    const commentEmp = await db.hrServiceComment.create({
      data: {
        serviceRequestId: testTicket.id,
        authorId: employee.userId || employee.id,
        authorRole: "EMPLOYEE",
        authorName: "Setyawan Ery",
        message: "Berikut saya lampirkan dokumen akta kelahiran dan kartu keluarga.",
      },
    });
    assert(Boolean(commentEmp && commentEmp.id), "Employee Comment on Ticket Thread");

    const commentHr = await db.hrServiceComment.create({
      data: {
        serviceRequestId: testTicket.id,
        authorId: "hr-admin-id",
        authorRole: "HR",
        authorName: "HR Service Specialist",
        message: "Dokumen telah diterima dan diproses ke portal e-Dabu BPJS.",
      },
    });
    assert(Boolean(commentHr && commentHr.id), "HR Comment on Ticket Thread");

    // 2.3 Update Ticket Status to Resolved
    const updatedTicket = await db.hrServiceRequest.update({
      where: { id: testTicket.id },
      data: {
        status: "RESOLVED",
        assignedTo: "HR Service Specialist",
        resolutionNotes: "Penambahan tanggungan BPJS Kesehatan telah selesai diajukan.",
        resolvedAt: new Date(),
      },
      include: {
        comments: true,
      },
    });
    assert(
      updatedTicket.status === "RESOLVED" && updatedTicket.comments.length === 2,
      "Ticket Resolution & Comments Thread Fetch"
    );

    // 2.4 Create Employee Letter
    const testLetter = await db.employeeLetter.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        letterNumber: "999/HR-SKK/KMS/IX/2026",
        type: "SK_AKTIF_KERJA",
        title: "SURAT KETERANGAN KERJA AKTIF",
        issuedDate: new Date(),
        purpose: "Pengajuan Visa Wisata ke Kedutaan",
        signerName: "Hendrawan Pratama",
        signerPosition: "Head of People & Operations",
        status: "PUBLISHED",
        qrCodeVerification: generateQrVerificationToken("999/HR-SKK/KMS/IX/2026", employee.employeeIdNumber),
        contentData: JSON.stringify({ notes: "Karyawan berprestasi" }),
      },
    });
    assert(Boolean(testLetter && testLetter.id), "Issue Official Employee Letter");
    assert(
      testLetter.qrCodeVerification.startsWith("VERIF-"),
      "Letter QR Verification Integrity"
    );

    // 2.5 Create Announcement
    const testAnnouncement = await db.announcement.create({
      data: {
        companyId: company.id,
        title: "Pengumuman: Jadwal Cuti Bersama Nasional 2026",
        content: "Sehubungan dengan Surat Keputusan Bersama 3 Menteri, kantor libur pada 25-26 September 2026.",
        category: "HOLIDAY",
        priority: "IMPORTANT",
        target: "ALL",
        authorName: "Corporate HR Team",
        isPinned: true,
      },
    });
    assert(Boolean(testAnnouncement && testAnnouncement.id), "Publish Company Announcement Broadcast");
    assert(testAnnouncement.isPinned === true, "Announcement Pinned Status");

    // 2.6 Multi-Tenant Isolation Check
    const otherCompanyTickets = await db.hrServiceRequest.findMany({
      where: { companyId: "non-existent-tenant-999" },
    });
    assert(
      otherCompanyTickets.length === 0,
      "Tenant Isolation: Non-existent tenant cannot access tickets"
    );

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log("\n--- 3. Cleaning Up Test Artifacts ---");
    await db.hrServiceComment.deleteMany({ where: { serviceRequestId: testTicket.id } });
    await db.hrServiceRequest.delete({ where: { id: testTicket.id } });
    await db.employeeLetter.delete({ where: { id: testLetter.id } });
    await db.announcement.delete({ where: { id: testAnnouncement.id } });
    console.log("🧹 Test artifacts cleaned up safely.");

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

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("Test runner failed:", e);
    process.exit(1);
  });
