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

    const isAuthorized =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    if (!isAuthorized) {
      return NextResponse.json({
        error: "Forbidden: Hanya HR Admin atau Manager yang dapat menyetujui/menolak cuti.",
      }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { action, comments } = body; // "APPROVE" or "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'APPROVE' atau 'REJECT'." }, { status: 400 });
    }

    const leave = await db.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: { include: { user: true } },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Pengajuan cuti tidak ditemukan." }, { status: 404 });
    }

    if (leave.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json({
        error: `Pengajuan cuti ini sudah tidak dalam status menunggu persetujuan (Status saat ini: ${leave.status}).`,
      }, { status: 400 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // Run in transaction
    await db.$transaction(async (tx) => {
      // 1. Update leave request status
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: newStatus,
          adminNotes: comments || null,
        },
      });

      // 2. If approved, deduct leave balance
      if (action === "APPROVE" && leave.leaveType.defaultEntitlement > 0) {
        const year = new Date(leave.startDate).getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year,
            },
          },
        });

        if (balance) {
          const newUsed = balance.used + leave.durationDays;
          const newRemaining = Math.max(0, balance.entitlement - newUsed);
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: { used: newUsed, remaining: newRemaining },
          });
        }
      }

      // 3. Send Notification to Employee
      if (leave.employee.user) {
        await tx.notification.create({
          data: {
            companyId: session.companyId!,
            userId: leave.employee.user.id,
            category: "APPROVAL",
            title: action === "APPROVE" ? "Cuti Disetujui ✓" : "Cuti Ditolak ✗",
            message: `Pengajuan ${leave.leaveType.name} Anda untuk tanggal ${new Date(leave.startDate).toLocaleDateString("id-ID")} s/d ${new Date(leave.endDate).toLocaleDateString("id-ID")} (${leave.durationDays} hari) telah ${action === "APPROVE" ? "disetujui" : "ditolak"}. ${comments ? "Catatan: " + comments : ""}`,
            referenceModule: "LEAVE",
            referenceId: leave.id,
          },
        });
      }
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: action === "APPROVE" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      recordId: leave.id,
      newValues: { status: newStatus, comments, durationDays: leave.durationDays },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan cuti ${leave.employee.firstName} berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}.`,
    });
  } catch (err: any) {
    console.error("Leave action error:", err);
    return NextResponse.json({ error: "Gagal memproses aksi cuti: " + err.message }, { status: 500 });
  }
}