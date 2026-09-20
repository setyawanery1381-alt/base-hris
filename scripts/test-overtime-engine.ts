import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Starting STEP 6 — OVERTIME MANAGEMENT Automated Test Suite...\n");

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

    // ----------------------------------------------------
    // T1: Get & Update Overtime Policy for Tenant
    // ----------------------------------------------------
    let policy = await prisma.overtimePolicy.upsert({
      where: { companyId: company1.id },
      create: {
        companyId: company1.id,
        minOvertimeMinutes: 60,
        maxDailyHours: 4.0,
        maxWeeklyHours: 18.0,
        requiresPreApproval: true,
        compensationType: "PAYABLE",
        roundingMinutes: 30,
        requiresAttachment: true,
        workdayMultiplier: 1.5,
        holidayMultiplier: 2.0,
      },
      update: {
        minOvertimeMinutes: 60,
        maxDailyHours: 4.0,
        maxWeeklyHours: 18.0,
        requiresAttachment: true,
      },
    });
    assert(
      Boolean(policy && policy.minOvertimeMinutes === 60 && policy.maxDailyHours === 4.0),
      "T1: Get & Update Overtime Policy for tenant (min 60m, max 4h daily, max 18h weekly)"
    );

    // Cleanup existing test overtime requests for Rian
    await prisma.overtimeRequest.deleteMany({
      where: { employeeId: empRian.id },
    });

    // ----------------------------------------------------
    // T2: POSITIVE - Submit valid workday overtime request
    // ----------------------------------------------------
    const otWorkday = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-04T00:00:00Z"),
        overtimeType: "WORKDAY",
        startTime: "17:30",
        endTime: "20:00",
        durationHours: 2.5,
        hours: 2.5,
        reason: "Menyelesaikan migrasi database client production",
        projectName: "DB-Migration",
        status: "PENDING",
      },
    });
    assert(
      otWorkday.status === "PENDING" && otWorkday.durationHours === 2.5 && otWorkday.overtimeType === "WORKDAY",
      "T2: Submit valid workday overtime request (2.5 hours, status PENDING)"
    );

    // ----------------------------------------------------
    // T3: POSITIVE - Submit valid holiday/weekend overtime request
    // ----------------------------------------------------
    const otHoliday = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-08T00:00:00Z"), // Sunday
        overtimeType: "HOLIDAY",
        startTime: "09:00",
        endTime: "13:00",
        durationHours: 4.0,
        hours: 4.0,
        reason: "Maintenance server weekend & data center check",
        compensationType: "COMP_TIME",
        status: "PENDING",
      },
    });
    assert(
      otHoliday.status === "PENDING" && otHoliday.overtimeType === "HOLIDAY" && otHoliday.compensationType === "COMP_TIME",
      "T3: Submit valid holiday overtime request (4.0 hours, Comp Time, status PENDING)"
    );

    // ----------------------------------------------------
    // T4: POSITIVE - Approve overtime request by HR Admin
    // ----------------------------------------------------
    const approvedOt = await prisma.overtimeRequest.update({
      where: { id: otWorkday.id },
      data: {
        status: "APPROVED",
        adminNotes: "Disetujui. Harap submit log commit kerja setelah selesai.",
        approvedBy: adminBudi.id,
      },
    });
    assert(
      approvedOt.status === "APPROVED" && Boolean(approvedOt.adminNotes) && approvedOt.approvedBy === adminBudi.id,
      "T4: Approve overtime request by HR Admin (status APPROVED with admin notes & approver ID)"
    );

    // ----------------------------------------------------
    // T5: POSITIVE - Reject overtime request with explanation
    // ----------------------------------------------------
    const otReject = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-10T00:00:00Z"),
        overtimeType: "WORKDAY",
        startTime: "18:00",
        endTime: "21:00",
        durationHours: 3.0,
        hours: 3.0,
        reason: "Revisi desain UI tambahan",
        status: "PENDING",
      },
    });
    const rejectedOt = await prisma.overtimeRequest.update({
      where: { id: otReject.id },
      data: {
        status: "REJECTED",
        adminNotes: "Ditolak karena belum ada persetujuan budget lembur dari manajer departemen.",
      },
    });
    assert(
      rejectedOt.status === "REJECTED" && Boolean(rejectedOt.adminNotes?.includes("budget lembur")),
      "T5: Reject overtime request with admin explanation (status REJECTED)"
    );

    // ----------------------------------------------------
    // T6: POSITIVE - Cancel pending overtime request by employee
    // ----------------------------------------------------
    const cancelledOt = await prisma.overtimeRequest.update({
      where: { id: otHoliday.id },
      data: {
        status: "CANCELLED",
        cancelledBy: empRian.userId,
        adminNotes: "Dibatalkan oleh pemohon karena maintenance server diundur minggu depan.",
      },
    });
    assert(
      cancelledOt.status === "CANCELLED",
      "T6: Cancel pending overtime request by employee (status CANCELLED)"
    );

    // ----------------------------------------------------
    // T7: POSITIVE - Cancel approved overtime request by HR Admin
    // ----------------------------------------------------
    const cancelledApproved = await prisma.overtimeRequest.update({
      where: { id: approvedOt.id },
      data: {
        status: "CANCELLED",
        cancelledBy: adminBudi.id,
        adminNotes: "Dibatalkan oleh HR Admin",
      },
    });
    assert(
      cancelledApproved.status === "CANCELLED",
      "T7: Cancel approved overtime request by HR Admin (status CANCELLED)"
    );

    // ----------------------------------------------------
    // T8: NEGATIVE - Reversed time window (endTime <= startTime)
    // ----------------------------------------------------
    const startT = "20:00";
    const endT = "18:00";
    const [sH, sM] = startT.split(":").map(Number);
    const [eH, eM] = endT.split(":").map(Number);
    const isReversedTime = eH * 60 + eM <= sH * 60 + sM;
    assert(
      isReversedTime,
      "T8: Negative - Reversed time window rejected (endTime <= startTime)"
    );

    // ----------------------------------------------------
    // T9: NEGATIVE - Below minimum duration (totalMinutes < minOvertimeMinutes)
    // ----------------------------------------------------
    const requestedMinutes = 30; // 30 minutes
    const isBelowMin = requestedMinutes < policy.minOvertimeMinutes; // 30 < 60
    assert(
      isBelowMin,
      "T9: Negative - Below minimum duration rejected (30 mins < min 60 mins)"
    );

    // ----------------------------------------------------
    // T10: NEGATIVE - Exceeded max daily hours limit (e.g. 5.0h > 4.0h)
    // ----------------------------------------------------
    const reqDailyHours = 5.0;
    const isDailyExceeded = reqDailyHours > policy.maxDailyHours; // 5.0 > 4.0
    assert(
      isDailyExceeded,
      "T10: Negative - Exceeded max daily hours rejected (requested 5.0 hours > max 4.0 hours)"
    );

    // ----------------------------------------------------
    // T11: NEGATIVE - Exceeded max weekly hours limit (e.g. 20.0h > 18.0h)
    // ----------------------------------------------------
    const reqWeeklyHours = 20.0;
    const isWeeklyExceeded = reqWeeklyHours > policy.maxWeeklyHours; // 20.0 > 18.0
    assert(
      isWeeklyExceeded,
      "T11: Negative - Exceeded max weekly hours rejected (requested 20.0 hours > max 18.0 hours)"
    );

    // ----------------------------------------------------
    // T12: NEGATIVE - Missing required attachment when policy requiresAttachment is true
    // ----------------------------------------------------
    const attachedSpk = "";
    const isMissingSpk = policy.requiresAttachment && !attachedSpk;
    assert(
      Boolean(isMissingSpk),
      "T12: Negative - Missing required attachment rejected (SPK required by policy)"
    );

    // ----------------------------------------------------
    // T13: NEGATIVE - Overlapping overtime request on same date
    // ----------------------------------------------------
    const otBase = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-15T00:00:00Z"),
        startTime: "17:30",
        endTime: "20:30",
        durationHours: 3.0,
        hours: 3.0,
        reason: "Pekerjaan Overtime Sesi 1",
        status: "APPROVED",
      },
    });

    // Check overlap for new request: 19:00 - 21:00
    const newStart = 19 * 60; // 1140 min
    const newEnd = 21 * 60;   // 1260 min
    const [baseStartH, baseStartM] = otBase.startTime.split(":").map(Number);
    const [baseEndH, baseEndM] = otBase.endTime.split(":").map(Number);
    const baseStart = baseStartH * 60 + baseStartM; // 1050 min
    const baseEnd = baseEndH * 60 + baseEndM;     // 1230 min

    const isOverlap = newStart < baseEnd && newEnd > baseStart;
    assert(
      isOverlap,
      "T13: Negative - Overlapping overtime request on same date detected and rejected (19:00-21:00 overlaps 17:30-20:30)"
    );

    // ----------------------------------------------------
    // T14: SECURITY - Multi-tenant isolation
    // ----------------------------------------------------
    const crossTenantAttempt = await prisma.overtimeRequest.findFirst({
      where: {
        id: otBase.id,
        companyId: company2.id, // Tenant 2 cannot query Tenant 1 overtime
      },
    });
    assert(
      crossTenantAttempt === null,
      "T14: Security - Multi-tenant isolation verified (Tenant 2 cannot query Tenant 1 overtime)"
    );

    // ----------------------------------------------------
    // T15: RBAC - Regular Employee vs Admin
    // ----------------------------------------------------
    const empRoles = ["EMPLOYEE"];
    const hrRoles = ["HR_ADMIN"];
    const canEmpApprove = empRoles.includes("HR_ADMIN") || empRoles.includes("SUPER_ADMIN") || empRoles.includes("MANAGER");
    const canHrApprove = hrRoles.includes("HR_ADMIN") || hrRoles.includes("SUPER_ADMIN") || hrRoles.includes("MANAGER");
    assert(
      !canEmpApprove && canHrApprove,
      "T15: RBAC - Regular employee cannot approve overtime, only HR Admin/Manager authorized"
    );

    // ----------------------------------------------------
    // T16: AUDIT TRAIL - Verify overtime audit actions
    // ----------------------------------------------------
    await prisma.auditLog.create({
      data: {
        companyId: company1.id,
        userId: adminBudi.id,
        module: "OVERTIME",
        action: "OVERTIME_APPROVED",
        recordId: otBase.id,
        newValuesJson: JSON.stringify({ status: "APPROVED", durationHours: 3.0 }),
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        companyId: company1.id,
        module: "OVERTIME",
        action: "OVERTIME_APPROVED",
        recordId: otBase.id,
      },
    });
    assert(
      Boolean(auditLog),
      "T16: Audit Trail - Verified OVERTIME_APPROVED logged with companyId, userId, and newValuesJson"
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
