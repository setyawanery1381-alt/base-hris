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

    const leaveTypes = await db.leaveType.findMany({
      where: {
        companyId: session.companyId,
        ...(showAll && isHr ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      leaveTypes,
    });
  } catch (err: any) {
    console.error("GET Leave Types Error:", err);
    return NextResponse.json({ error: "Gagal memuat jenis cuti." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Hanya HR Admin yang dapat membuat jenis cuti." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      code,
      description,
      defaultEntitlement = 12,
      isPaid = true,
      requiresAttachment = false,
      minNoticeDays = 0,
      allowHalfDay = true,
      isActive = true,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama jenis cuti wajib diisi." }, { status: 400 });
    }

    const formattedCode = (code || name.toUpperCase().replace(/\s+/g, "_")).slice(0, 30);

    const existing = await db.leaveType.findFirst({
      where: {
        companyId: session.companyId,
        code: formattedCode,
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode jenis cuti '${formattedCode}' sudah digunakan di perusahaan ini.` }, { status: 400 });
    }

    const leaveType = await db.leaveType.create({
      data: {
        companyId: session.companyId,
        name,
        code: formattedCode,
        description,
        defaultEntitlement: Number(defaultEntitlement),
        isPaid: Boolean(isPaid),
        requiresAttachment: Boolean(requiresAttachment),
        minNoticeDays: Number(minNoticeDays),
        allowHalfDay: Boolean(allowHalfDay),
        isActive: Boolean(isActive),
      },
    });

    // Auto-create LeaveBalance for all current employees in this company for current year
    const currentYear = new Date().getFullYear();
    const employees = await db.employee.findMany({
      where: { companyId: session.companyId },
    });

    for (const emp of employees) {
      await db.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
        create: {
          companyId: session.companyId,
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          entitlement: leaveType.defaultEntitlement,
          used: 0,
          remaining: leaveType.defaultEntitlement,
        },
        update: {},
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_TYPE_CREATED",
      recordId: leaveType.id,
      newValues: { name, code: formattedCode, defaultEntitlement, isPaid, requiresAttachment },
    });

    return NextResponse.json({
      success: true,
      message: "Jenis cuti baru berhasil ditambahkan.",
      leaveType,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST Leave Type Error:", err);
    return NextResponse.json({ error: "Gagal membuat jenis cuti: " + err.message }, { status: 500 });
  }
}
