import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await db.businessTrip.findFirst({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
            user: { select: { email: true, name: true } },
          },
        },
        company: {
          include: {
            branding: true,
          },
        },
        expenses: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Data Perjalanan Dinas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: trip });
  } catch (error: any) {
    console.error("GET /api/v1/trips/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN") || session.roles.includes("FINANCE");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR atau Keuangan yang dapat memperbarui status SPPD" }, { status: 403 });
    }

    const existingTrip = await db.businessTrip.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "SPPD tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { action, disbursedCashAdvance, rejectionReason } = body;

    const updateData: any = {};

    if (action === "APPROVE") {
      updateData.status = "APPROVED";
      updateData.approvedAt = new Date();
      updateData.approvedBy = session.name || session.email;
      updateData.rejectionReason = null;
    } else if (action === "REJECT") {
      updateData.status = "REJECTED";
      updateData.rejectionReason = rejectionReason || "Pengajuan dinas tidak disetujui";
      updateData.approvedAt = null;
      updateData.approvedBy = session.name || session.email;
    } else if (action === "DISBURSE") {
      updateData.status = "DISBURSED";
      updateData.disbursedCashAdvance = disbursedCashAdvance !== undefined
        ? Number(disbursedCashAdvance)
        : existingTrip.cashAdvance;
    } else if (action === "COMPLETE") {
      updateData.status = "COMPLETED";
    } else {
      return NextResponse.json({ error: "Aksi tidak valid (APPROVE, REJECT, DISBURSE, COMPLETE)" }, { status: 400 });
    }

    const updated = await db.businessTrip.update({
      where: { id: params.id },
      data: updateData,
      include: { employee: true, expenses: true },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "BUSINESS_TRIP",
      action: `TRIP_${action}`,
      recordId: params.id,
      oldValues: { status: existingTrip.status },
      newValues: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Status SPPD berhasil diperbarui menjadi ${updateData.status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/trips/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update trip" }, { status: 500 });
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

    const existingTrip = await db.businessTrip.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "SPPD tidak ditemukan" }, { status: 404 });
    }

    if (existingTrip.status !== "PENDING") {
      return NextResponse.json({ error: "Hanya SPPD berstatus PENDING yang dapat dibatalkan" }, { status: 400 });
    }

    await db.businessTrip.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "BUSINESS_TRIP",
      action: "DELETE_SPPD",
      recordId: params.id,
      oldValues: { tripNumber: existingTrip.tripNumber },
    });

    return NextResponse.json({
      success: true,
      message: "SPPD berhasil dibatalkan dan dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/trips/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete trip" }, { status: 500 });
  }
}
