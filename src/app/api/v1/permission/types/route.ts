import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    const permissionTypes = await db.permissionType.findMany({
      where: {
        companyId: session.companyId,
        ...(showAll && isHr ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      permissionTypes,
    });
  } catch (err: any) {
    console.error("GET Permission Types Error:", err);
    return NextResponse.json({ error: "Gagal memuat jenis izin." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat membuat jenis izin." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      category = "HOURLY",
      description,
      isPaid = true,
      requiresAttachment = false,
      maxHours,
      maxDaysPerMonth,
      isActive = true,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama jenis izin wajib diisi." }, { status: 400 });
    }

    const formattedCode = (code || name.toUpperCase().replace(/\s+/g, "_")).slice(0, 30);

    const existing = await db.permissionType.findFirst({
      where: {
        companyId: session.companyId,
        code: formattedCode,
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode jenis izin '${formattedCode}' sudah digunakan di perusahaan ini.` }, { status: 400 });
    }

    const permissionType = await db.permissionType.create({
      data: {
        companyId: session.companyId,
        name,
        code: formattedCode,
        category,
        description,
        isPaid: Boolean(isPaid),
        requiresAttachment: Boolean(requiresAttachment),
        maxHours: maxHours ? parseFloat(maxHours) : null,
        maxDaysPerMonth: maxDaysPerMonth ? parseInt(maxDaysPerMonth, 10) : null,
        isActive: Boolean(isActive),
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: "PERMISSION_TYPE_CREATED",
      recordId: permissionType.id,
      newValues: { name, code: formattedCode, category, isPaid, requiresAttachment },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis izin baru berhasil ditambahkan.",
      permissionType,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST Permission Type Error:", err);
    return NextResponse.json({ error: "Gagal membuat jenis izin: " + err.message }, { status: 500 });
  }
}
