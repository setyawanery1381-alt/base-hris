import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.view")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin melihat data shift." },
        { status: 403 }
      );
    }

    const shifts = await db.shift.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      success: true,
      shifts,
    });
  } catch (err: any) {
    console.error("GET Shifts Error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar shift." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.manage")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin membuat shift." },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.code || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "Nama, Kode Shift, Jam Masuk, dan Jam Pulang wajib diisi." },
        { status: 400 }
      );
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.startTime) || !timeRegex.test(body.endTime)) {
      return NextResponse.json(
        { error: "Format jam tidak valid (HH:mm)." },
        { status: 400 }
      );
    }

    const codeUpper = body.code.trim().toUpperCase();

    // Check code uniqueness within company
    const existing = await db.shift.findUnique({
      where: {
        companyId_code: {
          companyId: session.companyId,
          code: codeUpper,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kode shift '${codeUpper}' sudah digunakan di perusahaan ini.` },
        { status: 400 }
      );
    }

    const shift = await db.shift.create({
      data: {
        companyId: session.companyId,
        name: body.name.trim(),
        code: codeUpper,
        startTime: body.startTime,
        endTime: body.endTime,
        breakDurationMinutes: Number(body.breakDurationMinutes ?? 60),
        isOvernight: Boolean(body.isOvernight ?? false),
        color: body.color || "#0d9488",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "SCHEDULE",
      action: "CREATE_SHIFT",
      recordId: shift.id,
      newValues: shift,
    });

    return NextResponse.json({
      success: true,
      message: "Shift berhasil dibuat.",
      shift,
    });
  } catch (err: any) {
    console.error("POST Shift Error:", err);
    return NextResponse.json({ error: "Gagal membuat shift." }, { status: 500 });
  }
}
