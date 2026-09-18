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
    const { action, comments } = await req.json(); // "APPROVE" or "REJECT"

    const leave = await db.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: { include: { user: true } } },
    });

    if (!leave) {
      return NextResponse.json({ error: "Pengajuan cuti tidak ditemukan." }, { status: 404 });
    }

    if (leave.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // Run in transaction
    await db.$transaction(async (tx) => {
      // 1. Update leave request status
      await tx.leaveRequest.update({
        where: { id },
        data: { status: newStatus },
      });

      // 2. If approved, deduct leave balance
      if (action === "APPROVE") {
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
      await tx.notification.create({
        data: {
          companyId: session.companyId!,
          userId: leave.employee.user.id,
          category: "APPROVAL",
          title: action === "APPROVE" ? "Cuti Disetujui ✓" : "Cuti Ditolak ✗",
          message: `Pengajuan cuti Anda untuk tanggal ${new Date(leave.startDate).toLocaleDateString("id-ID")} telah ${action === "APPROVE" ? "disetujui" : "ditolak"}. Catatan: ${comments || "-"}`,
          referenceModule: "LEAVE",
          referenceId: leave.id,
        },
      });
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: action === "APPROVE" ? "APPROVE" : "REJECT",
      recordId: leave.id,
      newValues: { status: newStatus, comments },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan cuti berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}.`,
    });
  } catch (err: any) {
    console.error("Leave action error:", err);
    return NextResponse.json({ error: "Gagal memproses aksi cuti: " + err.message }, { status: 500 });
  }
}