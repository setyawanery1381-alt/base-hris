import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.manage")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin mengubah shift." },
        { status: 403 }
      );
    }

    const shiftId = params.id;
    const existing = await db.shift.findFirst({
      where: { id: shiftId, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Shift tidak ditemukan atau di luar wewenang perusahaan Anda." },
        { status: 404 }
      );
    }

    const body = await req.json();

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (body.startTime && !timeRegex.test(body.startTime)) {
      return NextResponse.json({ error: "Format jam masuk tidak valid." }, { status: 400 });
    }
    if (body.endTime && !timeRegex.test(body.endTime)) {
      return NextResponse.json({ error: "Format jam pulang tidak valid." }, { status: 400 });
    }

    if (body.code && body.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await db.shift.findUnique({
        where: {
          companyId_code: {
            companyId: session.companyId,
            code: body.code.trim().toUpperCase(),
          },
        },
      });
      if (codeCheck) {
        return NextResponse.json(
          { error: `Kode shift '${body.code.trim().toUpperCase()}' sudah digunakan.` },
          { status: 400 }
        );
      }
    }

    const updated = await db.shift.update({
      where: { id: shiftId },
      data: {
        name: body.name ? body.name.trim() : existing.name,
        code: body.code ? body.code.trim().toUpperCase() : existing.code,
        startTime: body.startTime || existing.startTime,
        endTime: body.endTime || existing.endTime,
        breakDurationMinutes: body.breakDurationMinutes !== undefined ? Number(body.breakDurationMinutes) : existing.breakDurationMinutes,
        isOvernight: body.isOvernight !== undefined ? Boolean(body.isOvernight) : existing.isOvernight,
        color: body.color || existing.color,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "SCHEDULE",
      action: "UPDATE_SHIFT",
      recordId: shiftId,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({
      success: true,
      message: "Shift berhasil diperbarui.",
      shift: updated,
    });
  } catch (err: any) {
    console.error("PUT Shift Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui shift." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.manage")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin menghapus shift." },
        { status: 403 }
      );
    }

    const shiftId = params.id;
    const existing = await db.shift.findFirst({
      where: { id: shiftId, companyId: session.companyId },
      include: {
        _count: { select: { schedules: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Shift tidak ditemukan atau di luar wewenang perusahaan Anda." },
        { status: 404 }
      );
    }

    if (existing._count.schedules > 0) {
      return NextResponse.json(
        {
          error: `Shift tidak dapat dihapus karena masih digunakan pada ${existing._count.schedules} jadwal karyawan. Silakan hapus atau pindahkan jadwal terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await db.shift.delete({
      where: { id: shiftId },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "SCHEDULE",
      action: "DELETE_SHIFT",
      recordId: shiftId,
      oldValues: existing,
    });

    return NextResponse.json({
      success: true,
      message: "Shift berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE Shift Error:", err);
    return NextResponse.json({ error: "Gagal menghapus shift." }, { status: 500 });
  }
}
