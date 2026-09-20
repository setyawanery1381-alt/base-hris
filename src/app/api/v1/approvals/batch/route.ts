import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHrOrManager =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    if (!isHrOrManager) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin atau Manager yang dapat melakukan persetujuan massal." }, { status: 403 });
    }

    const body = await req.json();
    const { requestIds, action, comments } = body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: "Daftar ID permohonan wajib diisi." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'APPROVE' atau 'REJECT'." }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of requestIds) {
      try {
        const approvalReq = await db.approvalRequest.findUnique({
          where: { id },
          include: {
            workflow: {
              include: { steps: { orderBy: { stepOrder: "asc" } } },
            },
          },
        });

        if (!approvalReq || approvalReq.companyId !== session.companyId || approvalReq.status !== "PENDING") {
          failedCount++;
          continue;
        }

        const totalSteps = approvalReq.workflow.steps.length;
        const isFinalStep = approvalReq.currentStepOrder >= totalSteps;

        await db.$transaction(async (tx) => {
          if (action === "REJECT") {
            await tx.approvalRequest.update({
              where: { id },
              data: { status: "REJECTED" },
            });
            await tx.approvalHistory.create({
              data: {
                approvalRequestId: id,
                stepOrder: approvalReq.currentStepOrder,
                actorId: session.userId!,
                action: "REJECTED",
                comments: comments || "Ditolak via persetujuan massal",
              },
            });
            if (approvalReq.referenceModule === "LEAVE") {
              await tx.leaveRequest.update({
                where: { id: approvalReq.referenceId },
                data: { status: "REJECTED", adminNotes: comments || "Ditolak massal." },
              });
            } else if (approvalReq.referenceModule === "PERMISSION") {
              await tx.permissionRequest.update({
                where: { id: approvalReq.referenceId },
                data: { status: "REJECTED", adminNotes: comments || "Ditolak massal." },
              });
            } else if (approvalReq.referenceModule === "OVERTIME") {
              await tx.overtimeRequest.update({
                where: { id: approvalReq.referenceId },
                data: { status: "REJECTED", adminNotes: comments || "Ditolak massal." },
              });
            }
          } else {
            // APPROVE
            await tx.approvalHistory.create({
              data: {
                approvalRequestId: id,
                stepOrder: approvalReq.currentStepOrder,
                actorId: session.userId!,
                action: "APPROVED",
                comments: comments || "Disetujui via persetujuan massal",
              },
            });

            if (!isFinalStep) {
              await tx.approvalRequest.update({
                where: { id },
                data: { currentStepOrder: approvalReq.currentStepOrder + 1 },
              });
            } else {
              await tx.approvalRequest.update({
                where: { id },
                data: { status: "APPROVED" },
              });

              if (approvalReq.referenceModule === "LEAVE") {
                const leaveReq = await tx.leaveRequest.findUnique({
                  where: { id: approvalReq.referenceId },
                });
                if (leaveReq) {
                  await tx.leaveRequest.update({
                    where: { id: leaveReq.id },
                    data: { status: "APPROVED", adminNotes: comments || "Disetujui massal." },
                  });
                  const currentYear = new Date(leaveReq.startDate).getFullYear();
                  const balance = await tx.leaveBalance.findFirst({
                    where: {
                      companyId: session.companyId!,
                      employeeId: leaveReq.employeeId,
                      leaveTypeId: leaveReq.leaveTypeId,
                      year: currentYear,
                    },
                  });
                  if (balance) {
                    const newUsed = balance.used + leaveReq.durationDays;
                    const newRemaining = Math.max(0, balance.entitlement - newUsed);
                    await tx.leaveBalance.update({
                      where: { id: balance.id },
                      data: { used: newUsed, remaining: newRemaining },
                    });
                  }
                }
              } else if (approvalReq.referenceModule === "PERMISSION") {
                await tx.permissionRequest.update({
                  where: { id: approvalReq.referenceId },
                  data: { status: "APPROVED", adminNotes: comments || "Disetujui massal." },
                });
              } else if (approvalReq.referenceModule === "OVERTIME") {
                await tx.overtimeRequest.update({
                  where: { id: approvalReq.referenceId },
                  data: {
                    status: "APPROVED",
                    adminNotes: comments || "Disetujui massal.",
                    approvedBy: session.userId,
                  },
                });
              }
            }
          }
        });

        successCount++;
      } catch (e: any) {
        failedCount++;
        errors.push(e.message);
      }
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "APPROVAL",
      action: action === "APPROVE" ? "BATCH_APPROVED" : "BATCH_REJECTED",
      newValues: { total: requestIds.length, successCount, failedCount, action },
    });

    return NextResponse.json({
      success: true,
      message: `Persetujuan massal selesai: ${successCount} berhasil, ${failedCount} gagal.`,
      successCount,
      failedCount,
      errors,
    });
  } catch (err: any) {
    console.error("Batch approval error:", err);
    return NextResponse.json({ error: "Gagal memproses persetujuan massal: " + err.message }, { status: 500 });
  }
}
