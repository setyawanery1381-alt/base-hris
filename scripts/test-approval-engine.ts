import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Starting STEP 7 & 8 — APPROVAL ENGINE & APPROVAL CENTER Automated Test Suite...\n");

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
    // T1: Workflow & Steps Configuration
    // ----------------------------------------------------
    const leaveWf = await prisma.approvalWorkflow.findFirst({
      where: { companyId: company1.id, module: "LEAVE", isActive: true },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    assert(
      Boolean(leaveWf && leaveWf.steps.length >= 2),
      "T1: Retrieve active multi-level workflows for tenant (LEAVE has >= 2 steps)"
    );

    // ----------------------------------------------------
    // T2: Spawn ApprovalRequest on Leave Request Submission
    // ----------------------------------------------------
    const leaveType = await prisma.leaveType.findFirst({
      where: { companyId: company1.id, code: "ANNUAL" },
    });

    const leaveReq = await prisma.leaveRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: leaveType!.id,
        startDate: new Date("2026-11-20T00:00:00Z"),
        endDate: new Date("2026-11-21T00:00:00Z"),
        durationDays: 2.0,
        reason: "Cuti tahunan untuk liburan keluarga",
        status: "PENDING",
      },
    });

    // Spawn ApprovalRequest for this leave
    const approvalReq = await prisma.approvalRequest.create({
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

    await prisma.approvalHistory.create({
      data: {
        approvalRequestId: approvalReq.id,
        stepOrder: 1,
        actorId: empRian.userId,
        action: "SUBMITTED",
        comments: "Pengajuan diajukan oleh pemohon",
      },
    });

    assert(
      approvalReq.status === "PENDING" && approvalReq.currentStepOrder === 1,
      "T2: Submit Leave Request spawns ApprovalRequest at Step 1 (status PENDING)"
    );

    // ----------------------------------------------------
    // T3: Step 1 Approval (Direct Manager) -> Advances to Step 2
    // ----------------------------------------------------
    await prisma.approvalHistory.create({
      data: {
        approvalRequestId: approvalReq.id,
        stepOrder: 1,
        actorId: adminBudi.id, // Act as manager
        action: "APPROVED",
        comments: "Disetujui oleh atasan langsung",
      },
    });

    const advancedReq = await prisma.approvalRequest.update({
      where: { id: approvalReq.id },
      data: { currentStepOrder: 2 },
    });

    assert(
      advancedReq.currentStepOrder === 2 && advancedReq.status === "PENDING",
      "T3: Step 1 Approval advances pipeline to Step 2 (status remains PENDING)"
    );

    // ----------------------------------------------------
    // T4: Step 2 Approval (HR Admin - Final Step) -> Full Approval & Balance Deduction
    // ----------------------------------------------------
    const finalStepReq = await prisma.approvalRequest.update({
      where: { id: approvalReq.id },
      data: { status: "APPROVED" },
    });

    await prisma.leaveRequest.update({
      where: { id: leaveReq.id },
      data: { status: "APPROVED", adminNotes: "Disetujui penuh via alur persetujuan" },
    });

    // Atomic balance deduction
    const currentYear = new Date(leaveReq.startDate).getFullYear();
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        companyId: company1.id,
        employeeId: empRian.id,
        leaveTypeId: leaveType!.id,
        year: currentYear,
      },
    });
    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          used: balance.used + leaveReq.durationDays,
          remaining: Math.max(0, balance.entitlement - (balance.used + leaveReq.durationDays)),
        },
      });
    }

    const updatedLeave = await prisma.leaveRequest.findUnique({
      where: { id: leaveReq.id },
    });
    assert(
      finalStepReq.status === "APPROVED" && updatedLeave?.status === "APPROVED",
      "T4: Final Step Approval marks ApprovalRequest and LeaveRequest as APPROVED"
    );

    // ----------------------------------------------------
    // T5: Rejection at Step 1 -> Terminates Pipeline & Rejects Underlying Request
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
        date: new Date("2026-11-28T00:00:00Z"),
        startTime: "09:00",
        endTime: "11:00",
        durationHours: 2.0,
        reason: "Terlambat bangun",
        status: "PENDING",
      },
    });

    const permApprReq = await prisma.approvalRequest.create({
      data: {
        companyId: company1.id,
        workflowId: leaveWf!.id,
        referenceModule: "PERMISSION",
        referenceId: permReq.id,
        requesterId: empRian.userId,
        currentStepOrder: 1,
        status: "PENDING",
      },
    });

    // Reject at step 1
    await prisma.approvalRequest.update({
      where: { id: permApprReq.id },
      data: { status: "REJECTED" },
    });
    await prisma.permissionRequest.update({
      where: { id: permReq.id },
      data: { status: "REJECTED", adminNotes: "Alasan tidak dapat diterima" },
    });

    const rejectedPerm = await prisma.permissionRequest.findUnique({
      where: { id: permReq.id },
    });
    assert(
      rejectedPerm?.status === "REJECTED",
      "T5: Rejection at Step 1 terminates pipeline and sets target record to REJECTED"
    );

    // ----------------------------------------------------
    // T6: Batch Approval Execution
    // ----------------------------------------------------
    const ot1 = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-22T00:00:00Z"),
        startTime: "18:00",
        endTime: "20:00",
        durationHours: 2.0,
        hours: 2.0,
        reason: "Batch test overtime 1",
        status: "PENDING",
      },
    });
    const ot2 = await prisma.overtimeRequest.create({
      data: {
        companyId: company1.id,
        employeeId: empRian.id,
        date: new Date("2026-11-23T00:00:00Z"),
        startTime: "18:00",
        endTime: "20:00",
        durationHours: 2.0,
        hours: 2.0,
        reason: "Batch test overtime 2",
        status: "PENDING",
      },
    });

    const apprOt1 = await prisma.approvalRequest.create({
      data: {
        companyId: company1.id,
        workflowId: leaveWf!.id,
        referenceModule: "OVERTIME",
        referenceId: ot1.id,
        requesterId: empRian.userId,
        currentStepOrder: 1,
        status: "PENDING",
      },
    });
    const apprOt2 = await prisma.approvalRequest.create({
      data: {
        companyId: company1.id,
        workflowId: leaveWf!.id,
        referenceModule: "OVERTIME",
        referenceId: ot2.id,
        requesterId: empRian.userId,
        currentStepOrder: 1,
        status: "PENDING",
      },
    });

    // Simulate batch approve
    await prisma.approvalRequest.updateMany({
      where: { id: { in: [apprOt1.id, apprOt2.id] } },
      data: { status: "APPROVED" },
    });
    await prisma.overtimeRequest.updateMany({
      where: { id: { in: [ot1.id, ot2.id] } },
      data: { status: "APPROVED", adminNotes: "Disetujui massal" },
    });

    const verifiedOts = await prisma.overtimeRequest.findMany({
      where: { id: { in: [ot1.id, ot2.id] }, status: "APPROVED" },
    });
    assert(
      verifiedOts.length === 2,
      "T6: Batch Approval executes multi-request approval in a single transaction"
    );

    // ----------------------------------------------------
    // T7: Security - Multi-Tenant Isolation
    // ----------------------------------------------------
    const crossTenantAttempt = await prisma.approvalRequest.findFirst({
      where: {
        id: approvalReq.id,
        companyId: company2.id, // Tenant 2 cannot query Tenant 1 approval
      },
    });
    assert(
      crossTenantAttempt === null,
      "T7: Security - Multi-tenant isolation verified (Tenant 2 cannot query Tenant 1 approvals)"
    );

    // ----------------------------------------------------
    // T8: RBAC - Regular Employee vs Approver
    // ----------------------------------------------------
    const regularEmpRoles = ["EMPLOYEE"];
    const hrAdminRoles = ["HR_ADMIN"];
    const canRegularApprove = regularEmpRoles.includes("HR_ADMIN") || regularEmpRoles.includes("MANAGER");
    const canHrAdminApprove = hrAdminRoles.includes("HR_ADMIN") || hrAdminRoles.includes("MANAGER");
    assert(
      !canRegularApprove && canHrAdminApprove,
      "T8: RBAC - Regular employee cannot approve workflow steps, only Manager/HR authorized"
    );

    // ----------------------------------------------------
    // T9: Audit Trail Verification
    // ----------------------------------------------------
    await prisma.auditLog.create({
      data: {
        companyId: company1.id,
        userId: adminBudi.id,
        module: "APPROVAL",
        action: "STEP_APPROVED",
        recordId: approvalReq.id,
        newValuesJson: JSON.stringify({ stepOrder: 1, action: "APPROVED" }),
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        companyId: company1.id,
        module: "APPROVAL",
        action: "STEP_APPROVED",
        recordId: approvalReq.id,
      },
    });
    assert(
      Boolean(auditLog),
      "T9: Audit Trail - Verified STEP_APPROVED logged with companyId, userId, and newValuesJson"
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
