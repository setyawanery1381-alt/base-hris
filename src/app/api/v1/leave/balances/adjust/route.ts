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

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat menyesuaikan saldo cuti." }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, leaveTypeId, year = new Date().getFullYear(), adjustment, reason } = body;

    if (!employeeId || !leaveTypeId || adjustment === undefined) {
      return NextResponse.json({ error: "Data penyesuaian saldo tidak lengkap (employeeId, leaveTypeId, adjustment wajib diisi)." }, { status: 400 });
    }

    const numAdjustment = Number(adjustment);
    if (isNaN(numAdjustment)) {
      return NextResponse.json({ error: "Nilai penyesuaian harus berupa angka." }, { status: 400 });
    }

    // Verify employee belongs to same company
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee || employee.companyId !== session.companyId) {
      return NextResponse.json({ error: "Karyawan tidak ditemukan di perusahaan ini." }, { status: 404 });
    }

    // Verify leave type
    const leaveType = await db.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType || leaveType.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis cuti tidak ditemukan." }, { status: 404 });
    }

    // Upsert balance
    const existing = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year: Number(year),
        },
      },
    });

    let updatedBalance;
    if (existing) {
      const newEntitlement = Math.max(0, existing.entitlement + numAdjustment);
      const newRemaining = Math.max(0, existing.remaining + numAdjustment);
      updatedBalance = await db.leaveBalance.update({
        where: { id: existing.id },
        data: {
          entitlement: newEntitlement,
          remaining: newRemaining,
        },
      });
    } else {
      const newEntitlement = Math.max(0, leaveType.defaultEntitlement + numAdjustment);
      updatedBalance = await db.leaveBalance.create({
        data: {
          companyId: session.companyId,
          employeeId,
          leaveTypeId,
          year: Number(year),
          entitlement: newEntitlement,
          used: 0,
          remaining: newEntitlement,
        },
      });
    }

    // Create notification for employee
    if (employee.user) {
      await db.notification.create({
        data: {
          companyId: session.companyId,
          userId: employee.user.id,
          category: "INFO",
          title: "Penyesuaian Saldo Cuti",
          message: `Saldo ${leaveType.name} Anda untuk tahun ${year} telah disesuaikan sebesar ${numAdjustment > 0 ? "+" : ""}${numAdjustment} hari. Alasan: ${reason || "Penyesuaian oleh HR"}`,
          referenceModule: "LEAVE",
          referenceId: updatedBalance.id,
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_BALANCE_ADJUSTED",
      recordId: updatedBalance.id,
      newValues: {
        employeeId,
        leaveTypeId,
        year,
        adjustment: numAdjustment,
        reason,
        newEntitlement: updatedBalance.entitlement,
        newRemaining: updatedBalance.remaining,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Saldo cuti ${employee.firstName} berhasil disesuaikan (${numAdjustment > 0 ? "+" : ""}${numAdjustment} hari).`,
      balance: updatedBalance,
    });
  } catch (err: any) {
    console.error("POST Adjust Balance Error:", err);
    return NextResponse.json({ error: "Gagal menyesuaikan saldo cuti: " + err.message }, { status: 500 });
  }
}
