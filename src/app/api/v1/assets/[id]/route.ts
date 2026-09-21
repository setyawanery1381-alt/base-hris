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

    const asset = await db.companyAsset.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                employeeIdNumber: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { assignedDate: "desc" },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    console.error("GET /api/v1/assets/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch asset" }, { status: 500 });
  }
}

export async function PUT(
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
      return NextResponse.json({ error: "Hanya HR yang berwenang mengubah data aset" }, { status: 403 });
    }

    const existingAsset = await db.companyAsset.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      category,
      brand,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      warrantyExpiry,
      condition,
      status,
      location,
      notes,
    } = body;

    const updated = await db.companyAsset.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existingAsset.name,
        category: category !== undefined ? category : existingAsset.category,
        brand: brand !== undefined ? brand : existingAsset.brand,
        model: model !== undefined ? model : existingAsset.model,
        serialNumber: serialNumber !== undefined ? serialNumber : existingAsset.serialNumber,
        purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : existingAsset.purchaseDate,
        purchasePrice: purchasePrice !== undefined ? (purchasePrice ? Number(purchasePrice) : null) : existingAsset.purchasePrice,
        warrantyExpiry: warrantyExpiry !== undefined ? (warrantyExpiry ? new Date(warrantyExpiry) : null) : existingAsset.warrantyExpiry,
        condition: condition !== undefined ? condition : existingAsset.condition,
        status: status !== undefined ? status : existingAsset.status,
        location: location !== undefined ? location : existingAsset.location,
        notes: notes !== undefined ? notes : existingAsset.notes,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "COMPANY_ASSET",
      action: "UPDATE_ASSET",
      recordId: params.id,
      oldValues: { name: existingAsset.name, condition: existingAsset.condition, status: existingAsset.status },
      newValues: { name: updated.name, condition: updated.condition, status: updated.status },
    });

    return NextResponse.json({
      success: true,
      message: "Data aset berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/v1/assets/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update asset" }, { status: 500 });
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

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang berwenang menghapus data aset" }, { status: 403 });
    }

    const existingAsset = await db.companyAsset.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        assignments: { where: { status: "ACTIVE" } },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    if (existingAsset.assignments.length > 0) {
      return NextResponse.json({
        error: "Tidak dapat menghapus aset yang sedang aktif dipinjam oleh karyawan. Lakukan pengembalian terlebih dahulu.",
      }, { status: 400 });
    }

    await db.companyAsset.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "COMPANY_ASSET",
      action: "DELETE_ASSET",
      recordId: params.id,
      oldValues: { assetCode: existingAsset.assetCode, name: existingAsset.name },
    });

    return NextResponse.json({
      success: true,
      message: "Aset berhasil dihapus dari inventaris",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/assets/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete asset" }, { status: 500 });
  }
}
