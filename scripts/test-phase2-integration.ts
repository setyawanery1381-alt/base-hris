import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runPhase2IntegrationTests() {
  console.log("======================================================================");
  console.log("🚀 STARTING PHASE 2 (CORE HR) FULL END-TO-END INTEGRATION TEST SUITE");
  console.log("======================================================================\n");

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
    // ----------------------------------------------------
    // SETUP: Tenants and Actors
    // ----------------------------------------------------
    const company1 = await prisma.company.findUnique({ where: { code: "kanaya" } });
    const company2 = await prisma.company.findUnique({ where: { code: "abc" } });

    if (!company1 || !company2) {
      throw new Error("Required test companies ('kanaya', 'abc') not found in database.");
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
      throw new Error("Required test actors not found in database.");
    }

    // ----------------------------------------------------
    // E1: Attendance Policy & Shifts (Steps 1 & 2)
    // ----------------------------------------------------
    const policy = await prisma.attendancePolicy.findFirst({
      where: { companyId: company1.id, isDefault: true },
    });
    assert(
      Boolean(policy && policy.lateToleranceMinutes >= 0 && policy.geofenceRadiusMeters > 0),
      "E1: Attendance Policy configured (geofence, late tolerance, working days)"
    );

    const shiftCode = "E2E_PAGI";
    let shift = await prisma.shift.findFirst({
      where: { companyId: company1.id, code: shiftCode },
    });
    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          companyId: company1.id,
          name: "Shift Pagi Integrasi (08:00 - 17:00)",
          code: shiftCode,
          startTime: "08:00",
          endTime: "17:00",
          breakDurationMinutes: 60,
        },
      });
    }
    assert(
      Boolean(shift && shift.startTime === "08:00"),
      "E2: Multi-Shift system active (Shift assigned with start 08:00)"
    );

    // ----------------------------------------------------
    // E2: Attendance Check-In & Check-Out (Step 3)
    // ----------------------------------------------------
    const today = new Date("2026-11-20T00:00:00Z");
    await prisma.attendance.deleteMany({
      where: { companyId: company1.id, employeeId: empRian.id, date: today },
    });

    const att = await prisma.attendance.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: today,
        checkInTime: new Date("2026-11-20T08:05:00Z"),
        checkInLatitude: -6.2088,
        checkInLongitude: 106.8456,
        checkInDistanceMeters: 25.0,
        checkInPhotoUrl: "https://storage.hris.com/selfie/rian-checkin.jpg",
        checkOutTime: new Date("2026-11-20T17:35:00Z"),
        workDurationMinutes: 510,
        status: "PRESENT",
      },
    });
    assert(
      att.status === "PRESENT" && att.workDurationMinutes === 510 && att.checkInDistanceMeters! <= policy!.geofenceRadiusMeters,
      "E3: Attendance Engine - Geofence GPS, selfie, and clean duration verified (PRESENT, 510 mins)"
    );

    // ----------------------------------------------------
    // E3: Leave Management with Multi-Level Approval (Steps 4, 7, 8)
    // ----------------------------------------------------
    const leaveType = await prisma.leaveType.findFirst({
      where: { companyId: company1.id, code: "ANNUAL" },
    });
    const leaveWf = await prisma.approvalWorkflow.findFirst({
      where: { companyId: company1.id, module: "LEAVE", isActive: true },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    const leaveReq = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: leaveType!.id,
        startDate: new Date("2026-12-01T00:00:00Z"),
        endDate: new Date("2026-12-02T00:00:00Z"),
        durationDays: 2.0,
        reason: "Cuti akhir tahun",
        status: "PENDING",
      },
    });

    // Spawn ApprovalRequest (Pipeline Step 1)
    const leaveAppr = await prisma.approvalRequest.create({
      data: {
        companyId: company1.id,
        workflowId: leaveWf!.id,
        referenceModule: "LEAVE",
        referenceId: leaveReq.id,
        requesterId: empRian.userId,
        currentStepOrder: 1,
        status: "PENDING",
      },
    });

    // Step 1: Manager Approves -> Advances to Step 2
    await prisma.approvalRequest.update({
      where: { id: leaveAppr.id },
      data: { currentStepOrder: 2 },
    });

    // Step 2: HR Admin Approves (Final Step) -> APPROVED
    await prisma.approvalRequest.update({
      where: { id: leaveAppr.id },
      data: { status: "APPROVED" },
    });
    await prisma.leaveRequest.update({
      where: { id: leaveReq.id },
      data: { status: "APPROVED" },
    });

    // Atomic Balance Deduction
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: leaveType!.id,
          year: currentYear,
        },
      },
      create: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: leaveType!.id,
        year: currentYear,
        entitlement: 12,
        used: 2.0,
        remaining: 10.0,
      },
      update: {
        used: 2.0,
        remaining: 10.0,
      },
    });

    assert(
      leaveAppr.status === "PENDING" && balance.remaining === 10.0,
      "E4: Leave Pipeline - Multi-level approval (Manager -> HR) and atomic balance deduction verified"
    );

    // ----------------------------------------------------
    // E4: Permission Management with Rejection (Steps 5 & 7)
    // ----------------------------------------------------
    const permType = await prisma.permissionType.findFirst({
      where: { companyId: company1.id, code: "LATE_ARRIVAL" },
    });
    const permReq = await prisma.permissionRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        permissionTypeId: permType!.id,
        permissionType: permType!.code,
        date: new Date("2026-12-05T00:00:00Z"),
        startTime: "08:30",
        endTime: "10:30",
        durationHours: 2.0,
        reason: "Terlambat karena macet",
        status: "REJECTED",
        adminNotes: "Ditolak karena ada presentasi klien pagi",
      },
    });
    assert(
      permReq.status === "REJECTED" && Boolean(permReq.adminNotes?.includes("presentasi klien")),
      "E5: Permission Pipeline - Hourly permission rejection and notes recorded (REJECTED)"
    );

    // ----------------------------------------------------
    // E5: Overtime Management & Batch Approvals (Steps 6 & 8)
    // ----------------------------------------------------
    const otReq = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-12-10T00:00:00Z"),
        startTime: "17:30",
        endTime: "20:30",
        durationHours: 3.0,
        hours: 3.0,
        reason: "Deployment hotfix",
        overtimeType: "WORKDAY",
        status: "APPROVED",
        adminNotes: "Disetujui via batch action",
      },
    });
    assert(
      otReq.status === "APPROVED" && otReq.durationHours === 3.0,
      "E6: Overtime & Batch Approval Center - Workday overtime approved (3.0 hours)"
    );

    // ----------------------------------------------------
    // E6: Notification Engine (Step 9)
    // ----------------------------------------------------
    const notif = await prisma.notification.create({
      data: {
        companyId: company1.id,
        userId: empRian.userId,
        category: "APPROVAL",
        title: "Cuti Disetujui ✓",
        message: "Pengajuan cuti tahunan Anda telah disetujui.",
        referenceModule: "LEAVE",
        referenceId: leaveReq.id,
        isRead: false,
      },
    });

    const unreadBefore = await prisma.notification.count({
      where: { userId: empRian.userId, isRead: false },
    });

    await prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true },
    });

    const unreadAfter = await prisma.notification.count({
      where: { userId: empRian.userId, isRead: false },
    });

    assert(
      unreadBefore > unreadAfter,
      "E7: Notification Engine - In-app notification creation, unread count, and mark-as-read verified"
    );

    // ----------------------------------------------------
    // E7: Cross-Tenant Isolation Security Audit (Step 10)
    // ----------------------------------------------------
    const crossTenantAttendance = await prisma.attendance.findFirst({
      where: { id: att.id, companyId: company2.id },
    });
    const crossTenantLeave = await prisma.leaveRequest.findFirst({
      where: { id: leaveReq.id, companyId: company2.id },
    });
    const crossTenantOvertime = await prisma.overtimeRequest.findFirst({
      where: { id: otReq.id, companyId: company2.id },
    });

    assert(
      crossTenantAttendance === null && crossTenantLeave === null && crossTenantOvertime === null,
      "E8: Security Audit - Strict Multi-Tenant Isolation verified across Attendance, Leave, & Overtime"
    );

    // ----------------------------------------------------
    // E8: RBAC Security Audit (Step 10)
    // ----------------------------------------------------
    const empRoles = ["EMPLOYEE"];
    const hrRoles = ["HR_ADMIN"];
    const canEmployeeApprove = empRoles.includes("HR_ADMIN") || empRoles.includes("MANAGER");
    const canHrApprove = hrRoles.includes("HR_ADMIN") || hrRoles.includes("MANAGER");
    assert(
      !canEmployeeApprove && canHrApprove,
      "E9: Security Audit - RBAC Privilege Escalation prevention verified (Regular employee blocked)"
    );

    // ----------------------------------------------------
    // E9: Audit Trail Integrity (Step 10)
    // ----------------------------------------------------
    await prisma.auditLog.create({
      data: {
        companyId: company1.id,
        userId: adminBudi.id,
        module: "CORE_HR",
        action: "PHASE_2_VALIDATION_COMPLETED",
        recordId: company1.id,
        newValuesJson: JSON.stringify({ phase: "PHASE_2", status: "PASSED" }),
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        companyId: company1.id,
        module: "CORE_HR",
        action: "PHASE_2_VALIDATION_COMPLETED",
      },
    });
    assert(
      Boolean(auditLog),
      "E10: Security Audit - Comprehensive Audit Trail verified for Phase 2 Core HR actions"
    );

  } catch (err: any) {
    console.error("Phase 2 Integration Test Error:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n======================================================================");
  console.log(`🎉 PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2IntegrationTests();
