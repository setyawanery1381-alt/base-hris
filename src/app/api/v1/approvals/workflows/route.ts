import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await db.approvalWorkflow.findMany({
      where: { companyId: session.companyId },
      include: {
        steps: {
          include: {
            approverRole: true,
            approverUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { module: "asc" },
    });

    const roles = await db.role.findMany({
      where: {
        OR: [
          { companyId: session.companyId },
          { companyId: null },
        ],
      },
      select: { id: true, name: true, description: true },
    });

    return NextResponse.json({ success: true, workflows, roles });
  } catch (err: any) {
    console.error("GET /api/v1/approvals/workflows error:", err);
    return NextResponse.json({ error: "Gagal memuat alur approval: " + err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR Admin yang dapat membuat alur persetujuan." }, { status: 403 });
    }

    const body = await req.json();
    const { module, name, description, steps } = body;

    if (!module || !name) {
      return NextResponse.json({ error: "Modul dan nama alur approval wajib diisi." }, { status: 400 });
    }

    const workflow = await db.$transaction(async (tx) => {
      const wf = await tx.approvalWorkflow.create({
        data: {
          companyId: session.companyId!,
          module,
          name,
          description: description || null,
          isActive: true,
        },
      });

      if (Array.isArray(steps) && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const st = steps[i];
          await tx.approvalWorkflowStep.create({
            data: {
              workflowId: wf.id,
              stepOrder: i + 1,
              approverType: st.approverType || "DIRECT_MANAGER",
              approverRoleId: st.approverRoleId || null,
              approverUserId: st.approverUserId || null,
            },
          });
        }
      }

      return wf;
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "APPROVAL",
      action: "WORKFLOW_CREATED",
      recordId: workflow.id,
      newValues: { module, name, stepsCount: steps?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      message: "Alur persetujuan berhasil dibuat.",
      workflow,
    });
  } catch (err: any) {
    console.error("POST /api/v1/approvals/workflows error:", err);
    return NextResponse.json({ error: "Gagal membuat alur persetujuan: " + err.message }, { status: 500 });
  }
}
