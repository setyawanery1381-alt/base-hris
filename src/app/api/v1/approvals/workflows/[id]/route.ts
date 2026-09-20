import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, isActive, steps } = body;

    const existingWf = await db.approvalWorkflow.findUnique({
      where: { id },
    });

    if (!existingWf || existingWf.companyId !== session.companyId) {
      return NextResponse.json({ error: "Alur persetujuan tidak ditemukan." }, { status: 404 });
    }

    const updated = await db.$transaction(async (tx) => {
      const wf = await tx.approvalWorkflow.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description !== undefined ? description : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      if (Array.isArray(steps)) {
        await tx.approvalWorkflowStep.deleteMany({
          where: { workflowId: id },
        });

        for (let i = 0; i < steps.length; i++) {
          const st = steps[i];
          await tx.approvalWorkflowStep.create({
            data: {
              workflowId: id,
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
      action: "WORKFLOW_UPDATED",
      recordId: id,
      newValues: { name, isActive, stepsCount: steps?.length },
    });

    return NextResponse.json({
      success: true,
      message: "Alur persetujuan berhasil diperbarui.",
      workflow: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/v1/approvals/workflows/[id] error:", err);
    return NextResponse.json({ error: "Gagal memperbarui alur persetujuan: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const workflow = await db.approvalWorkflow.findUnique({
      where: { id },
    });

    if (!workflow || workflow.companyId !== session.companyId) {
      return NextResponse.json({ error: "Alur persetujuan tidak ditemukan." }, { status: 404 });
    }

    await db.approvalWorkflow.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "APPROVAL",
      action: "WORKFLOW_DEACTIVATED",
      recordId: id,
    });

    return NextResponse.json({
      success: true,
      message: "Alur persetujuan berhasil dinonaktifkan.",
    });
  } catch (err: any) {
    console.error("DELETE /api/v1/approvals/workflows/[id] error:", err);
    return NextResponse.json({ error: "Gagal menonaktifkan alur persetujuan: " + err.message }, { status: 500 });
  }
}
