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
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat mengubah jenis izin." }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.permissionType.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis izin tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      category,
      description,
      isPaid,
      requiresAttachment,
      maxHours,
      maxDaysPerMonth,
      isActive,
    } = body;

    const updated = await db.permissionType.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isPaid !== undefined ? { isPaid: Boolean(isPaid) } : {}),
        ...(requiresAttachment !== undefined ? { requiresAttachment: Boolean(requiresAttachment) } : {}),
        ...(maxHours !== undefined ? { maxHours: maxHours ? parseFloat(maxHours) : null } : {}),
        ...(maxDaysPerMonth !== undefined ? { maxDaysPerMonth: maxDaysPerMonth ? parseInt(maxDaysPerMonth, 10) : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: "PERMISSION_TYPE_UPDATED",
      recordId: id,
      newValues: { name, category, isPaid, requiresAttachment, isActive },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis izin berhasil diperbarui.",
      permissionType: updated,
    });
  } catch (err: any) {
    console.error("PUT Permission Type Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui jenis izin: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat menonaktifkan jenis izin." }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.permissionType.findUnique({
      where: { id },
    });

    if (!existing || existing.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis izin tidak ditemukan." }, { status: 404 });
    }

    const updated = await db.permissionType.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: "PERMISSION_TYPE_DEACTIVATED",
      recordId: id,
      newValues: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis izin berhasil dinonaktifkan.",
      permissionType: updated,
    });
  } catch (err: any) {
    console.error("DELETE Permission Type Error:", err);
    return NextResponse.json({ error: "Gagal menonaktifkan jenis izin: " + err.message }, { status: 500 });
  }
}
