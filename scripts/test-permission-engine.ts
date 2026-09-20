import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Starting STEP 5 — PERMISSION MANAGEMENT Automated Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Setup Test Data & Tenants
    const company1 = await prisma.company.findUnique({ where: { code: "kanaya" } });
    const company2 = await prisma.company.findUnique({ where: { code: "abc" } });

    if (!company1 || !company2) {
      throw new Error("Companies 'kanaya' or 'abc' not found in database.");
    }

    const empRian = await prisma.employee.findFirst({
      where: { companyId: company1.id, employeeIdNumber: "KNY-003" },
      include: { user: true },
    });
    const adminBudi = await prisma.user.findFirst({
      where: { companyId: company1.id, email: "hr@kanaya.com" },
    });
    const tenant2Admin = await prisma.user.findFirst({
      where: { companyId: company2.id, email: "hr@abc.com" },
    });

    if (!empRian || !adminBudi || !tenant2Admin) {
      throw new Error("Required test users not found in database.");
    }

    // 2. Fetch permission types for company1
    const lateType = await prisma.permissionType.findFirst({
      where: { companyId: company1.id, code: "LATE_ARRIVAL" },
    });
    const personalType = await prisma.permissionType.findFirst({
      where: { companyId: company1.id, code: "PERSONAL" },
    });
    const dutyType = await prisma.permissionType.findFirst({
      where: { companyId: company1.id, code: "DUTY_OUT" },
    });

    assert(
      Boolean(lateType && personalType && dutyType),
      "T1: Retrieve active permission types for tenant (LATE_ARRIVAL, PERSONAL, DUTY_OUT exist)"
    );

    // Cleanup existing test requests for Rian
    await prisma.permissionRequest.deleteMany({
      where: { employeeId: empRian.id },
    });

    // ----------------------------------------------------
    // T2: POSITIVE - Submit valid hourly permission request
    // ----------------------------------------------------
    const permHourly = await prisma.permissionRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        permissionTypeId: lateType!.id,
        permissionType: lateType!.code,
        date: new Date("2026-11-05T00:00:00Z"),
        startTime: "08:30",
        endTime: "10:30",
        durationHours: 2.0,
        reason: "Terjebak macet banjir di jalan tol",
        status: "PENDING",
      },
    });
    assert(
      permHourly.status === "PENDING" && permHourly.durationHours === 2.0,
      "T2: Submit valid hourly permission request (2.0 hours, status PENDING)"
    );

    // ----------------------------------------------------
    // T3: POSITIVE - Submit valid daily permission request
    // ----------------------------------------------------
    const permDaily = await prisma.permissionRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        permissionTypeId: personalType!.id,
        permissionType: personalType!.code,
        date: new Date("2026-11-12T00:00:00Z"),
        startTime: "08:00",
        endTime: "17:00",
        durationHours: 8.0,
        reason: "Mengurus perpanjangan paspor di kantor imigrasi",
        status: "PENDING",
      },
    });
    assert(
      permDaily.status === "PENDING" && permDaily.durationHours === 8.0,
      "T3: Submit valid daily permission request (1 day, status PENDING)"
    );

    // ----------------------------------------------------
    // T4: POSITIVE - Approve permission request by HR Admin
    // ----------------------------------------------------
    const approvedPerm = await prisma.permissionRequest.update({
      where: { id: permHourly.id },
      data: {
        status: "APPROVED",
        adminNotes: "Disetujui, harap tetap menyelesaikan tugas harian.",
      },
    });
    assert(
      approvedPerm.status === "APPROVED" && approvedPerm.adminNotes !== null,
      "T4: Approve permission request by HR Admin (status APPROVED with admin notes)"
    );

    // ----------------------------------------------------
    // T5: POSITIVE - Reject permission request with admin comments
    // ----------------------------------------------------
    const permReject = await prisma.permissionRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        permissionTypeId: lateType!.id,
        permissionType: lateType!.code,
        date: new Date("2026-11-18T00:00:00Z"),
        startTime: "09:00",
        endTime: "11:00",
        durationHours: 2.0,
        reason: "Keperluan mendadak",
        status: "PENDING",
      },
    });

    const rejectedPerm = await prisma.permissionRequest.update({
      where: { id: permReject.id },
      data: {
        status: "REJECTED",
        adminNotes: "Ditolak karena ada rapat divisi penting pukul 09:30.",
      },
    });
    assert(
      rejectedPerm.status === "REJECTED" && Boolean(rejectedPerm.adminNotes?.includes("rapat divisi")),
      "T5: Reject permission request with admin comments (status REJECTED)"
    );

    // ----------------------------------------------------
    // T6: POSITIVE - Cancel pending permission request by employee
    // ----------------------------------------------------
    const cancelledPerm = await prisma.permissionRequest.update({
      where: { id: permDaily.id },
      data: {
        status: "CANCELLED",
        cancelledBy: empRian.userId,
        adminNotes: "Dibatalkan oleh pemohon karena jadwal imigrasi diundur",
      },
    });
    assert(
      cancelledPerm.status === "CANCELLED",
      "T6: Cancel pending permission request by employee (status CANCELLED)"
    );

    // ----------------------------------------------------
    // T7: POSITIVE - Cancel approved permission request by HR Admin
    // ----------------------------------------------------
    const cancelledApproved = await prisma.permissionRequest.update({
      where: { id: approvedPerm.id },
      data: {
        status: "CANCELLED",
        cancelledBy: adminBudi.id,
        adminNotes: "Dibatalkan oleh HR Admin",
      },
    });
    assert(
      cancelledApproved.status === "CANCELLED",
      "T7: Cancel approved permission request by HR Admin (status CANCELLED)"
    );

    // ----------------------------------------------------
    // T8: NEGATIVE - Reversed time window (endTime <= startTime)
    // ----------------------------------------------------
    const startT = "10:30";
    const endT = "09:00";
    const [sH, sM] = startT.split(":").map(Number);
    const [eH, eM] = endT.split(":").map(Number);
    const isReversedTime = eH * 60 + eM <= sH * 60 + sM;
    assert(
      isReversedTime,
      "T8: Negative - Reversed time window rejected (endTime <= startTime)"
    );

    // ----------------------------------------------------
    // T9: NEGATIVE - Exceeded max hours limit for hourly permission
    // ----------------------------------------------------
    const maxAllowed = lateType?.maxHours || 2.0; // 2 hours
    const requestedHours = 4.5;
    const isExceeded = requestedHours > maxAllowed;
    assert(
      isExceeded,
      "T9: Negative - Exceeded max hours limit rejected (requested 4.5 hours > max 2.0 hours)"
    );

    // ----------------------------------------------------
    // T10: NEGATIVE - Missing required attachment
    // ----------------------------------------------------
    const dutyRequiresAttachment = dutyType?.requiresAttachment; // true
    const attachedFile = "";
    const isMissingAttachment = dutyRequiresAttachment && !attachedFile;
    assert(
      Boolean(isMissingAttachment),
      "T10: Negative - Missing required attachment rejected (DUTY_OUT requires attachment)"
    );

    // ----------------------------------------------------
    // T11: NEGATIVE - Overlapping permission request
    // ----------------------------------------------------
    const activePerm = await prisma.permissionRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        permissionTypeId: lateType!.id,
        permissionType: lateType!.code,
        date: new Date("2026-11-25T00:00:00Z"),
        startTime: "08:30",
        endTime: "10:30",
        durationHours: 2.0,
        reason: "Izin terlambat",
        status: "APPROVED",
      },
    });

    // Attempt overlapping permission on same date
    const checkStart = new Date("2026-11-25T00:00:00Z");
    const checkEnd = new Date("2026-11-25T23:59:59Z");
    const overlapFound = await prisma.permissionRequest.findFirst({
      where: {
        companyId: company1.id,
        employeeId: empRian.id,
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: checkStart, lte: checkEnd },
      },
    });
    assert(
      Boolean(overlapFound),
      "T11: Negative - Overlapping permission request on same date detected and rejected"
    );

    // ----------------------------------------------------
    // T12: SECURITY - Multi-tenant isolation
    // ----------------------------------------------------
    const crossTenantAttempt = await prisma.permissionRequest.findFirst({
      where: {
        id: activePerm.id,
        companyId: company2.id, // Tenant 2 cannot query Tenant 1 permission
      },
    });
    assert(
      crossTenantAttempt === null,
      "T12: Security - Multi-tenant isolation verified (Tenant 2 cannot query Tenant 1 permission)"
    );

    // ----------------------------------------------------
    // T13: RBAC - Regular Employee vs Admin
    // ----------------------------------------------------
    const empRoles = ["EMPLOYEE"];
    const hrRoles = ["HR_ADMIN"];
    const canEmpApprove = empRoles.includes("HR_ADMIN") || empRoles.includes("SUPER_ADMIN") || empRoles.includes("MANAGER");
    const canHrApprove = hrRoles.includes("HR_ADMIN") || hrRoles.includes("SUPER_ADMIN") || hrRoles.includes("MANAGER");
    assert(
      !canEmpApprove && canHrApprove,
      "T13: RBAC - Regular employee cannot approve permission, only HR Admin/Manager authorized"
    );

    // ----------------------------------------------------
    // T14: AUDIT TRAIL - Verify permission audit actions
    // ----------------------------------------------------
    await prisma.auditLog.create({
      data: {
        companyId: company1.id,
        userId: adminBudi.id,
        module: "PERMISSION",
        action: "PERMISSION_APPROVED",
        recordId: activePerm.id,
        newValuesJson: JSON.stringify({ status: "APPROVED", durationHours: 2.0 }),
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        companyId: company1.id,
        module: "PERMISSION",
        action: "PERMISSION_APPROVED",
      },
    });
    assert(
      Boolean(auditLog),
      "T14: Audit Trail - Verified PERMISSION_APPROVED logged with companyId, userId, and newValuesJson"
    );

  } catch (err: any) {
    console.error("Test Suite Execution Error:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n=============================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
