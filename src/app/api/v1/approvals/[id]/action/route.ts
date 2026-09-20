import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { action, comments } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'APPROVE' atau 'REJECT'." }, { status: 400 });
    }

    // 1. Find ApprovalRequest with workflow & steps
    const approvalRequest = await db.approvalRequest.findUnique({
      where: { id },
      include: {
        workflow: {
          include: {
            steps: {
              include: { approverRole: true, approverUser: true },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    if (!approvalRequest || approvalRequest.companyId !== session.companyId) {
      return NextResponse.json({ error: "Pengajuan persetujuan tidak ditemukan." }, { status: 404 });
    }

    if (approvalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Pengajuan ini sudah berstatus ${approvalRequest.status} dan tidak dapat diproses lagi.` },
        { status: 400 }
      );
    }

    const currentStep = approvalRequest.workflow.steps.find(
      (s) => s.stepOrder === approvalRequest.currentStepOrder
    );
    const totalSteps = approvalRequest.workflow.steps.length;

    // 2. Validate Authorization
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    const isManager = session.roles.includes("MANAGER");

    let isAuthorized = isHr;
    if (!isAuthorized && currentStep) {
      if (currentStep.approverType === "ROLE" && currentStep.approverRole) {
        isAuthorized = session.roles.includes(currentStep.approverRole.name);
      } else if (currentStep.approverType === "SPECIFIC_USER") {
        isAuthorized = currentStep.approverUserId === session.userId;
      } else if (currentStep.approverType === "DIRECT_MANAGER") {
        isAuthorized = isManager;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki wewenang untuk menyetujui tahap ini." },
        { status: 403 }
      );
    }

    // 3. Process Transaction
    const result = await db.$transaction(async (tx) => {
      if (action === "REJECT") {
        // A. REJECTION
        await tx.approvalRequest.update({
          where: { id },
          data: { status: "REJECTED" },
        });

        await tx.approvalHistory.create({
          data: {
            approvalRequestId: id,
            stepOrder: approvalRequest.currentStepOrder,
            actorId: session.userId!,
            action: "REJECTED",
            comments: comments || null,
          },
        });

        // Update target module record
        if (approvalRequest.referenceModule === "LEAVE") {
          await tx.leaveRequest.update({
            where: { id: approvalRequest.referenceId },
            data: { status: "REJECTED", adminNotes: comments || "Ditolak pada alur persetujuan." },
          });
        } else if (approvalRequest.referenceModule === "PERMISSION") {
          await tx.permissionRequest.update({
            where: { id: approvalRequest.referenceId },
            data: { status: "REJECTED", adminNotes: comments || "Ditolak pada alur persetujuan." },
          });
        } else if (approvalRequest.referenceModule === "OVERTIME") {
          await tx.overtimeRequest.update({
            where: { id: approvalRequest.referenceId },
            data: { status: "REJECTED", adminNotes: comments || "Ditolak pada alur persetujuan." },
          });
        }

        // Notify requester
        await tx.notification.create({
          data: {
            companyId: session.companyId!,
            userId: approvalRequest.requesterId,
            category: "APPROVAL",
            title: `Pengajuan ${approvalRequest.referenceModule} Ditolak ✗`,
            message: `Pengajuan ${approvalRequest.referenceModule} Anda ditolak pada tahap ${approvalRequest.currentStepOrder}. ${comments ? "Catatan: " + comments : ""}`,
            referenceModule: approvalRequest.referenceModule,
            referenceId: approvalRequest.referenceId,
          },
        });

        return { finalStatus: "REJECTED", advanced: false };
      } else {
        // B. APPROVAL
        await tx.approvalHistory.create({
          data: {
            approvalRequestId: id,
            stepOrder: approvalRequest.currentStepOrder,
            actorId: session.userId!,
            action: "APPROVED",
            comments: comments || null,
          },
        });

        const isFinalStep = approvalRequest.currentStepOrder >= totalSteps;

        if (!isFinalStep) {
          // Advance to next step
          const nextStep = approvalRequest.currentStepOrder + 1;
          await tx.approvalRequest.update({
            where: { id },
            data: { currentStepOrder: nextStep },
          });

          // Notify next step approvers if role-based
          const nextStepDef = approvalRequest.workflow.steps.find((s) => s.stepOrder === nextStep);
          if (nextStepDef?.approverRoleId) {
            const roleUsers = await tx.userRole.findMany({
              where: { roleId: nextStepDef.approverRoleId },
              select: { userId: true },
            });
            for (const ru of roleUsers) {
              await tx.notification.create({
                data: {
                  companyId: session.companyId!,
                  userId: ru.userId,
                  category: "APPROVAL",
                  title: `Persetujuan Menunggu Tindakan (Tahap ${nextStep})`,
                  message: `Pengajuan ${approvalRequest.referenceModule} dari ${approvalRequest.requester.name} memerlukan persetujuan Anda.`,
                  referenceModule: approvalRequest.referenceModule,
                  referenceId: approvalRequest.referenceId,
                },
              });
            }
          }

          return { finalStatus: "PENDING", advanced: true, nextStep };
        } else {
          // FINAL STEP APPROVED
          await tx.approvalRequest.update({
            where: { id },
            data: { status: "APPROVED" },
          });

          // Update target module record to APPROVED
          if (approvalRequest.referenceModule === "LEAVE") {
            const leaveReq = await tx.leaveRequest.findUnique({
              where: { id: approvalRequest.referenceId },
            });
            if (leaveReq) {
              await tx.leaveRequest.update({
                where: { id: leaveReq.id },
                data: { status: "APPROVED", adminNotes: comments || "Disetujui via Alur Approval." },
              });
              // Deduct leave balance
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
          } else if (approvalRequest.referenceModule === "PERMISSION") {
            await tx.permissionRequest.update({
              where: { id: approvalRequest.referenceId },
              data: { status: "APPROVED", adminNotes: comments || "Disetujui via Alur Approval." },
            });
          } else if (approvalRequest.referenceModule === "OVERTIME") {
            await tx.overtimeRequest.update({
              where: { id: approvalRequest.referenceId },
              data: {
                status: "APPROVED",
                adminNotes: comments || "Disetujui via Alur Approval.",
                approvedBy: session.userId,
              },
            });
          }

          // Notify requester
          await tx.notification.create({
            data: {
              companyId: session.companyId!,
              userId: approvalRequest.requesterId,
              category: "APPROVAL",
              title: `Pengajuan ${approvalRequest.referenceModule} Disetujui Penuh ✓`,
              message: `Pengajuan ${approvalRequest.referenceModule} Anda telah disetujui sepenuhnya oleh seluruh peninjau.`,
              referenceModule: approvalRequest.referenceModule,
              referenceId: approvalRequest.referenceId,
            },
          });

          return { finalStatus: "APPROVED", advanced: false };
        }
      }
    });

    // 4. Record Audit Log
    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "APPROVAL",
      action: action === "APPROVE" ? "STEP_APPROVED" : "STEP_REJECTED",
      recordId: id,
      newValues: {
        stepOrder: approvalRequest.currentStepOrder,
        action,
        comments,
        ...result,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? result.advanced
            ? `Persetujuan tahap ${approvalRequest.currentStepOrder} berhasil, dialihkan ke tahap ${result.nextStep}.`
            : `Pengajuan ${approvalRequest.referenceModule} telah disetujui sepenuhnya!`
          : `Pengajuan ${approvalRequest.referenceModule} telah ditolak.`,
      ...result,
    });
  } catch (err: any) {
    console.error("Approval action error:", err);
    return NextResponse.json({ error: "Gagal memproses aksi persetujuan: " + err.message }, { status: 500 });
  }
}
