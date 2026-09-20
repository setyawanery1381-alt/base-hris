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

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat mengubah jenis cuti." }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.leaveType.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis cuti tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      description,
      defaultEntitlement,
      isPaid,
      requiresAttachment,
      minNoticeDays,
      allowHalfDay,
      isActive,
    } = body;

    const updated = await db.leaveType.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(defaultEntitlement !== undefined ? { defaultEntitlement: Number(defaultEntitlement) } : {}),
        ...(isPaid !== undefined ? { isPaid: Boolean(isPaid) } : {}),
        ...(requiresAttachment !== undefined ? { requiresAttachment: Boolean(requiresAttachment) } : {}),
        ...(minNoticeDays !== undefined ? { minNoticeDays: Number(minNoticeDays) } : {}),
        ...(allowHalfDay !== undefined ? { allowHalfDay: Boolean(allowHalfDay) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_TYPE_UPDATED",
      recordId: id,
      newValues: { name, defaultEntitlement, isPaid, requiresAttachment, isActive },
    });

    return NextResponse.json({
      success: true,
      message: "Konfigurasi jenis cuti berhasil diperbarui.",
      leaveType: updated,
    });
  } catch (err: any) {
    console.error("PUT Leave Type Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui jenis cuti: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat menghapus jenis cuti." }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.leaveType.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis cuti tidak ditemukan." }, { status: 404 });
    }

    // Toggle isActive to false (soft delete to preserve integrity of existing requests and balances)
    const updated = await db.leaveType.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_TYPE_DEACTIVATED",
      recordId: id,
      newValues: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis cuti berhasil dinonaktifkan.",
      leaveType: updated,
    });
  } catch (err: any) {
    console.error("DELETE Leave Type Error:", err);
    return NextResponse.json({ error: "Gagal menonaktifkan jenis cuti: " + err.message }, { status: 500 });
  }
}
