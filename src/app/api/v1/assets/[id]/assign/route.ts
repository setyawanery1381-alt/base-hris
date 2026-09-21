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

    const companyId = session.companyId;

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang dapat melakukan serah terima aset (BAST)" }, { status: 403 });
    }

    const asset = await db.companyAsset.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        assignments: { where: { status: "ACTIVE" } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    if (asset.status === "ASSIGNED" || asset.assignments.length > 0) {
      return NextResponse.json({
        error: "Aset ini sedang dipinjam oleh karyawan lain. Lakukan pengembalian terlebih dahulu sebelum serah terima baru.",
      }, { status: 400 });
    }

    const body = await req.json();
    const {
      employeeId,
      assignedDate,
      expectedReturnDate,
      handoverCondition = "GOOD",
      handoverNotes,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Pilih karyawan penerima aset" }, { status: 400 });
    }

    const employee = await db.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Data karyawan penerima tidak ditemukan" }, { status: 404 });
    }

    const assignment = await db.$transaction(async (tx) => {
      const createdAssignment = await tx.assetAssignment.create({
        data: {
          companyId,
          assetId: params.id,
          employeeId,
          assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          handoverCondition,
          handoverNotes: handoverNotes || "Berita Acara Serah Terima Aset (BAST)",
          status: "ACTIVE",
        },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeIdNumber: true },
          },
        },
      });

      await tx.companyAsset.update({
        where: { id: params.id },
        data: {
          status: "ASSIGNED",
          condition: handoverCondition,
        },
      });

      return createdAssignment;
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "COMPANY_ASSET",
      action: "ASSIGN_ASSET",
      recordId: assignment.id,
      newValues: {
        assetId: params.id,
        employeeId,
        handoverCondition,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Aset ${asset.name} berhasil diserahkan kepada ${assignment.employee.firstName} ${assignment.employee.lastName}`,
      data: assignment,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/assets/[id]/assign error:", error);
    return NextResponse.json({ error: error.message || "Failed to assign asset" }, { status: 500 });
  }
}
