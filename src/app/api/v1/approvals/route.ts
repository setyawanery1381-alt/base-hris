import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const moduleFilter = searchParams.get("module"); // ALL, LEAVE, PERMISSION, OVERTIME
    const statusFilter = searchParams.get("status") || "PENDING"; // PENDING, APPROVED, REJECTED, ALL
    const scope = searchParams.get("scope") || "all"; // mine vs all

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    const isManager = session.roles.includes("MANAGER");

    // 1. Fetch active workflows with steps
    const workflows = await db.approvalWorkflow.findMany({
      where: { companyId: session.companyId, isActive: true },
      include: {
        steps: {
          include: {
            approverRole: true,
            approverUser: true,
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    // 2. Fetch pending ApprovalRequests
    const whereReq: any = { companyId: session.companyId };
    if (statusFilter !== "ALL") {
      whereReq.status = statusFilter;
    }
    if (moduleFilter && moduleFilter !== "ALL") {
      whereReq.referenceModule = moduleFilter;
    }

    const approvalRequests = await db.approvalRequest.findMany({
      where: whereReq,
      include: {
        workflow: {
          include: {
            steps: {
              include: { approverRole: true, approverUser: true },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            employee: {
              include: { department: true, position: true },
            },
          },
        },
        history: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { actionAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Hydrate target records (Leave, Permission, Overtime)
    const leaveIds = approvalRequests.filter((r) => r.referenceModule === "LEAVE").map((r) => r.referenceId);
    const permIds = approvalRequests.filter((r) => r.referenceModule === "PERMISSION").map((r) => r.referenceId);
    const otIds = approvalRequests.filter((r) => r.referenceModule === "OVERTIME").map((r) => r.referenceId);

    const [leaves, permissions, overtimes] = await Promise.all([
      db.leaveRequest.findMany({
        where: { id: { in: leaveIds } },
        include: { leaveType: true, employee: { include: { department: true, position: true } } },
      }),
      db.permissionRequest.findMany({
        where: { id: { in: permIds } },
        include: { typeDefinition: true, employee: { include: { department: true, position: true } } },
      }),
      db.overtimeRequest.findMany({
        where: { id: { in: otIds } },
        include: { employee: { include: { department: true, position: true } } },
      }),
    ]);

    const leaveMap = new Map(leaves.map((l) => [l.id, l]));
    const permMap = new Map(permissions.map((p) => [p.id, p]));
    const otMap = new Map(overtimes.map((o) => [o.id, o]));

    // Also fetch direct pending requests for backwards compatibility or requests created before approval engine
    const [directLeaves, directPerms, directOts] = await Promise.all([
      db.leaveRequest.findMany({
        where: { companyId: session.companyId, status: "PENDING" },
        include: { leaveType: true, employee: { include: { department: true, position: true, user: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.permissionRequest.findMany({
        where: { companyId: session.companyId, status: "PENDING" },
        include: { typeDefinition: true, employee: { include: { department: true, position: true, user: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.overtimeRequest.findMany({
        where: { companyId: session.companyId, status: "PENDING" },
        include: { employee: { include: { department: true, position: true, user: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Attach target details to approval requests
    const items = approvalRequests.map((ar) => {
      let targetDetails: any = null;
      if (ar.referenceModule === "LEAVE") targetDetails = leaveMap.get(ar.referenceId);
      if (ar.referenceModule === "PERMISSION") targetDetails = permMap.get(ar.referenceId);
      if (ar.referenceModule === "OVERTIME") targetDetails = otMap.get(ar.referenceId);

      const currentStep = ar.workflow.steps.find((s) => s.stepOrder === ar.currentStepOrder);
      const totalSteps = ar.workflow.steps.length;

      // Determine if current user can approve this step
      let canUserApprove = false;
      if (isHr) {
        canUserApprove = true;
      } else if (currentStep) {
        if (currentStep.approverType === "ROLE" && currentStep.approverRole) {
          canUserApprove = session.roles.includes(currentStep.approverRole.name);
        } else if (currentStep.approverType === "SPECIFIC_USER") {
          canUserApprove = currentStep.approverUserId === session.userId;
        } else if (currentStep.approverType === "DIRECT_MANAGER") {
          // If manager, check if target employee's managerId matches or if caller is MANAGER
          canUserApprove = isManager;
        }
      }

      return {
        ...ar,
        currentStep,
        totalSteps,
        targetDetails,
        canUserApprove,
      };
    });

    const filteredItems = scope === "mine" && !isHr
      ? items.filter((it) => it.canUserApprove)
      : items;

    // Aggregate counts
    const leaveCount = filteredItems.filter((i) => i.referenceModule === "LEAVE" && i.status === "PENDING").length;
    const permCount = filteredItems.filter((i) => i.referenceModule === "PERMISSION" && i.status === "PENDING").length;
    const otCount = filteredItems.filter((i) => i.referenceModule === "OVERTIME" && i.status === "PENDING").length;

    return NextResponse.json({
      success: true,
      items: filteredItems,
      directPending: {
        leaves: directLeaves,
        permissions: directPerms,
        overtimes: directOts,
      },
      counts: {
        total: leaveCount + permCount + otCount,
        leaves: leaveCount,
        permissions: permCount,
        overtimes: otCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/approvals error:", err);
    return NextResponse.json({ error: "Gagal memuat approval center: " + err.message }, { status: 500 });
  }
}