import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateAssetCode } from "@/lib/claims-assets-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const condition = searchParams.get("condition");
    const query = searchParams.get("q");

    const where: any = { companyId: session.companyId };

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (condition && condition !== "ALL") {
      where.condition = condition;
    }
    if (query) {
      where.OR = [
        { assetCode: { contains: query } },
        { name: { contains: query } },
        { serialNumber: { contains: query } },
        { brand: { contains: query } },
      ];
    }

    const assets = await db.companyAsset.findMany({
      where,
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            employee: {
              select: {
                id: true,
                employeeIdNumber: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAssets = assets.length;
    const assignedCount = assets.filter((a) => a.status === "ASSIGNED").length;
    const availableCount = assets.filter((a) => a.status === "AVAILABLE").length;
    const maintenanceCount = assets.filter((a) => a.status === "IN_MAINTENANCE").length;

    return NextResponse.json({
      success: true,
      data: assets,
      summary: {
        totalAssets,
        assignedCount,
        availableCount,
        maintenanceCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/assets error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang dapat menambahkan aset kantor" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      category = "LAPTOP",
      brand,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      warrantyExpiry,
      condition = "GOOD",
      location,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama aset wajib diisi" }, { status: 400 });
    }

    // Generate asset code if not provided
    let assetCode = body.assetCode;
    if (!assetCode) {
      const count = await db.companyAsset.count({
        where: { companyId: session.companyId, category },
      });
      assetCode = generateAssetCode(category, count + 1);
    }

    // Check code uniqueness within tenant
    const existing = await db.companyAsset.findFirst({
      where: { companyId: session.companyId, assetCode },
    });
    if (existing) {
      return NextResponse.json({ error: `Kode aset ${assetCode} sudah digunakan` }, { status: 400 });
    }

    const newAsset = await db.companyAsset.create({
      data: {
        companyId: session.companyId,
        assetCode,
        name,
        category,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        condition,
        status: "AVAILABLE",
        location: location || "Kantor Pusat",
        notes: notes || null,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "COMPANY_ASSET",
      action: "REGISTER_ASSET",
      recordId: newAsset.id,
      newValues: { assetCode, name, category, serialNumber },
    });

    return NextResponse.json({
      success: true,
      message: "Aset berhasil ditambahkan ke inventaris",
      data: newAsset,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/assets error:", error);
    return NextResponse.json({ error: error.message || "Failed to create asset" }, { status: 500 });
  }
}
