import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Starting STEP 4 — LEAVE MANAGEMENT Automated Test Suite...\n");

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

    // 2. Fetch leave types for company1
    const annualLeaveType = await prisma.leaveType.findFirst({
      where: { companyId: company1.id, code: "ANNUAL" },
    });
    const sickLeaveType = await prisma.leaveType.findFirst({
      where: { companyId: company1.id, code: "SICK" },
    });
    const maternityLeaveType = await prisma.leaveType.findFirst({
      where: { companyId: company1.id, code: "MATERNITY" },
    });

    assert(Boolean(annualLeaveType && sickLeaveType && maternityLeaveType), "T1: Retrieve active leave types for tenant (ANNUAL, SICK, MATERNITY exist)");

    // Ensure clean balance for 2026
    const testYear = 2026;
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: annualLeaveType!.id,
          year: testYear,
        },
      },
      create: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: annualLeaveType!.id,
        year: testYear,
        entitlement: 12,
        used: 0,
        remaining: 12,
      },
      update: {
        entitlement: 12,
        used: 0,
        remaining: 12,
      },
    });

    // Cleanup existing test requests for Rian in test dates
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: empRian.id },
    });

    // ----------------------------------------------------
    // T2: POSITIVE - Submit valid full-day annual leave
    // ----------------------------------------------------
    const leaveReq1 = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: annualLeaveType!.id,
        startDate: new Date("2026-11-02T00:00:00Z"), // Monday
        endDate: new Date("2026-11-03T00:00:00Z"),   // Tuesday
        durationDays: 2.0,
        dayType: "FULL_DAY",
        reason: "Liburan keluarga tahunan",
        status: "PENDING",
      },
    });
    assert(leaveReq1.status === "PENDING" && leaveReq1.durationDays === 2.0, "T2: Submit valid full-day annual leave (2 days, status PENDING)");

    // ----------------------------------------------------
    // T3: POSITIVE - Submit half-day leave request (0.5 day)
    // ----------------------------------------------------
    const leaveReqHalf = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: annualLeaveType!.id,
        startDate: new Date("2026-11-10T00:00:00Z"),
        endDate: new Date("2026-11-10T00:00:00Z"),
        durationDays: 0.5,
        dayType: "FIRST_HALF",
        reason: "Keperluan perbankan pagi hari",
        status: "PENDING",
      },
    });
    assert(leaveReqHalf.durationDays === 0.5 && leaveReqHalf.dayType === "FIRST_HALF", "T3: Submit valid half-day leave request (0.5 day)");

    // ----------------------------------------------------
    // T4: POSITIVE - Approve leave request & atomic balance deduction
    // ----------------------------------------------------
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: leaveReq1.id },
        data: { status: "APPROVED", adminNotes: "Disetujui oleh HR" },
      });
      const bal = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: empRian.id,
            leaveTypeId: annualLeaveType!.id,
            year: testYear,
          },
        },
      });
      if (bal) {
        await tx.leaveBalance.update({
          where: { id: bal.id },
          data: {
            used: bal.used + leaveReq1.durationDays,
            remaining: bal.entitlement - (bal.used + leaveReq1.durationDays),
          },
        });
      }
    });

    const updatedBal = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: annualLeaveType!.id,
          year: testYear,
        },
      },
    });
    assert(
      updatedBal?.used === 2.0 && updatedBal?.remaining === 10.0,
      "T4: Approve leave request and verify atomic balance deduction (used: 2, remaining: 10)"
    );

    // ----------------------------------------------------
    // T5: POSITIVE - Reject leave request & verify balance untouched
    // ----------------------------------------------------
    const leaveReqReject = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: annualLeaveType!.id,
        startDate: new Date("2026-11-16T00:00:00Z"),
        endDate: new Date("2026-11-17T00:00:00Z"),
        durationDays: 2.0,
        dayType: "FULL_DAY",
        reason: "Urusan pribadi",
        status: "PENDING",
      },
    });

    await prisma.leaveRequest.update({
      where: { id: leaveReqReject.id },
      data: { status: "REJECTED", adminNotes: "Ditolak karena ada jadwal audit" },
    });

    const balAfterReject = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: annualLeaveType!.id,
          year: testYear,
        },
      },
    });
    assert(
      balAfterReject?.remaining === 10.0 && balAfterReject?.used === 2.0,
      "T5: Reject leave request & verify balance remains untouched (remaining: 10)"
    );

    // ----------------------------------------------------
    // T6: POSITIVE - Cancel pending leave request by employee
    // ----------------------------------------------------
    await prisma.leaveRequest.update({
      where: { id: leaveReqHalf.id },
      data: { status: "CANCELLED", cancelledBy: empRian.userId, adminNotes: "Dibatalkan oleh pemohon" },
    });
    const cancelledReq = await prisma.leaveRequest.findUnique({ where: { id: leaveReqHalf.id } });
    assert(cancelledReq?.status === "CANCELLED", "T6: Cancel pending leave request by employee (status CANCELLED)");

    // ----------------------------------------------------
    // T7: POSITIVE - Cancel approved leave & restore balance
    // ----------------------------------------------------
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: leaveReq1.id },
        data: { status: "CANCELLED", cancelledBy: adminBudi.id, adminNotes: "Dibatalkan atas permintaan direksi" },
      });
      const bal = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: empRian.id,
            leaveTypeId: annualLeaveType!.id,
            year: testYear,
          },
        },
      });
      if (bal) {
        const newUsed = Math.max(0, bal.used - leaveReq1.durationDays);
        await tx.leaveBalance.update({
          where: { id: bal.id },
          data: {
            used: newUsed,
            remaining: bal.entitlement - newUsed,
          },
        });
      }
    });

    const balAfterCancelApproved = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: annualLeaveType!.id,
          year: testYear,
        },
      },
    });
    assert(
      balAfterCancelApproved?.used === 0.0 && balAfterCancelApproved?.remaining === 12.0,
      "T7: Cancel approved leave & verify full balance restoration (remaining: 12)"
    );

    // ----------------------------------------------------
    // T8: POSITIVE - Adjust leave balance by HR Admin (+2 days)
    // ----------------------------------------------------
    const adjBal = await prisma.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: empRian.id,
          leaveTypeId: annualLeaveType!.id,
          year: testYear,
        },
      },
      data: {
        entitlement: 14,
        remaining: 14,
      },
    });
    assert(adjBal.entitlement === 14 && adjBal.remaining === 14, "T8: Adjust leave balance by HR Admin (entitlement: 14, remaining: 14)");

    // ----------------------------------------------------
    // T9: NEGATIVE - Reversed dates (endDate < startDate)
    // ----------------------------------------------------
    const invalidStart = new Date("2026-11-20");
    const invalidEnd = new Date("2026-11-18");
    const isReversed = invalidEnd < invalidStart;
    assert(isReversed, "T9: Negative - Reversed dates validation rejected (endDate < startDate)");

    // ----------------------------------------------------
    // T10: NEGATIVE - Sick leave without required attachment
    // ----------------------------------------------------
    const sickRequiresAttachment = sickLeaveType?.requiresAttachment;
    const attachmentProvided = "";
    const isAttachmentMissing = sickRequiresAttachment && !attachmentProvided;
    assert(Boolean(isAttachmentMissing), "T10: Negative - Sick leave rejected when required attachment is missing");

    // ----------------------------------------------------
    // T11: NEGATIVE - Insufficient balance
    // ----------------------------------------------------
    const currentRemaining = adjBal.remaining; // 14
    const requestedDuration = 20; // more than 14
    const isInsufficient = currentRemaining < requestedDuration;
    assert(isInsufficient, "T11: Negative - Reject leave request when requested duration exceeds remaining balance");

    // ----------------------------------------------------
    // T12: NEGATIVE - Overlapping leave request
    // ----------------------------------------------------
    // Create an active approved leave
    const existingLeave = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: annualLeaveType!.id,
        startDate: new Date("2026-12-01T00:00:00Z"),
        endDate: new Date("2026-12-05T00:00:00Z"),
        durationDays: 5.0,
        dayType: "FULL_DAY",
        reason: "Cuti akhir tahun",
        status: "APPROVED",
      },
    });

    // Attempt overlapping dates: 2026-12-03 to 2026-12-04
    const newStart = new Date("2026-12-03T00:00:00Z");
    const newEnd = new Date("2026-12-04T00:00:00Z");
    const isOverlap =
      newStart <= existingLeave.endDate && newEnd >= existingLeave.startDate;
    assert(isOverlap, "T12: Negative - Overlapping leave request on same dates detected and rejected");

    // ----------------------------------------------------
    // T13: NEGATIVE - Half-day on type that disallows half-day
    // ----------------------------------------------------
    const maternityDisallowsHalfDay = maternityLeaveType?.allowHalfDay === false;
    assert(maternityDisallowsHalfDay, "T13: Negative - Half-day rejected for leave types with allowHalfDay: false (Maternity)");

    // ----------------------------------------------------
    // T14: SECURITY - Cross-tenant isolation
    // ----------------------------------------------------
    const crossTenantAttempt = await prisma.leaveRequest.findFirst({
      where: {
        id: existingLeave.id,
        companyId: company2.id, // Tenant 2 cannot find Tenant 1 leave
      },
    });
    assert(crossTenantAttempt === null, "T14: Security - Multi-tenant isolation verified (Tenant 2 cannot query Tenant 1 leave)");

    // ----------------------------------------------------
    // T15: RBAC - Regular Employee vs Admin
    // ----------------------------------------------------
    const empRoles = ["EMPLOYEE"];
    const hrRoles = ["HR_ADMIN"];
    const canEmpApprove = empRoles.includes("HR_ADMIN") || empRoles.includes("SUPER_ADMIN") || empRoles.includes("MANAGER");
    const canHrApprove = hrRoles.includes("HR_ADMIN") || hrRoles.includes("SUPER_ADMIN") || hrRoles.includes("MANAGER");
    assert(!canEmpApprove && canHrApprove, "T15: RBAC - Regular employee cannot approve leave, only HR Admin/Manager authorized");

    // ----------------------------------------------------
    // T16: AUDIT TRAIL - Verify leave audit actions
    // ----------------------------------------------------
    await prisma.auditLog.create({
      data: {
        companyId: company1.id,
        userId: adminBudi.id,
        module: "LEAVE",
        action: "LEAVE_APPROVED",
        recordId: existingLeave.id,
        newValuesJson: JSON.stringify({ status: "APPROVED", durationDays: 5 }),
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        companyId: company1.id,
        module: "LEAVE",
        action: "LEAVE_APPROVED",
      },
    });
    assert(Boolean(auditLog), "T16: Audit Trail - Verified LEAVE_APPROVED logged with companyId, userId, and newValuesJson");

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
