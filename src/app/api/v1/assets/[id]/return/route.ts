import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang dapat memproses pengembalian aset kantor" }, { status: 403 });
    }

    const asset = await db.companyAsset.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: { employee: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    const activeAssignment = asset.assignments[0];
    if (!activeAssignment) {
      return NextResponse.json({ error: "Tidak ada peminjaman aktif untuk aset ini" }, { status: 400 });
    }

    const body = await req.json();
    const {
      returnDate,
      returnCondition = "GOOD",
      returnNotes,
      newStatus,
    } = body;

    const resolvedStatus = newStatus || (returnCondition === "DAMAGED" ? "IN_MAINTENANCE" : "AVAILABLE");

    const updatedAssignment = await db.$transaction(async (tx) => {
      const closed = await tx.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          returnCondition,
          returnNotes: returnNotes || "Aset dikembalikan ke inventaris kantor",
          status: "RETURNED",
        },
      });

      await tx.companyAsset.update({
        where: { id: params.id },
        data: {
          status: resolvedStatus,
          condition: returnCondition,
        },
      });

      return closed;
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "COMPANY_ASSET",
      action: "RETURN_ASSET",
      recordId: updatedAssignment.id,
      newValues: {
        assetId: params.id,
        returnCondition,
        assetNewStatus: resolvedStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Aset ${asset.name} berhasil dikembalikan dan status diperbarui menjadi ${resolvedStatus}`,
      data: updatedAssignment,
    });
  } catch (error: any) {
    console.error("POST /api/v1/assets/[id]/return error:", error);
    return NextResponse.json({ error: error.message || "Failed to return asset" }, { status: 500 });
  }
}
