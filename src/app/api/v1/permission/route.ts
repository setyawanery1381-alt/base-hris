import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// Helper to calculate hours between HH:mm and HH:mm
function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeOnly = searchParams.get("mine") === "true";
    const statusFilter = searchParams.get("status");
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month"); // YYYY-MM
    const departmentId = searchParams.get("departmentId");
    const filterEmployeeId = searchParams.get("employeeId");

    const isHrOrManager =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    const whereClause: any = {
      companyId: session.companyId,
    };

    if (employeeOnly || !isHrOrManager) {
      whereClause.employeeId = session.employeeId;
    } else if (filterEmployeeId) {
      whereClause.employeeId = filterEmployeeId;
    }

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    if (departmentId) {
      whereClause.employee = { departmentId };
    }

    if (dateParam) {
      const d = new Date(dateParam);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    } else if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      whereClause.date = { gte: startOfMonth, lte: endOfMonth };
    }

    const [requests, permissionTypes] = await Promise.all([
      db.permissionRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            include: { department: true, position: true },
          },
          typeDefinition: true,
        },
        orderBy: { date: "desc" },
      }),
      db.permissionType.findMany({
        where: {
          companyId: session.companyId,
          ...(isHrOrManager ? {} : { isActive: true }),
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const summary = {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
      cancelled: requests.filter((r) => r.status === "CANCELLED").length,
    };

    return NextResponse.json({
      success: true,
      requests,
      permissionTypes,
      summary,
    });
  } catch (err: any) {
    console.error("GET Permission Error:", err);
    return NextResponse.json({ error: "Gagal memuat data izin." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      permissionTypeId,
      date,
      startTime = "08:00",
      endTime = "17:00",
      reason,
      attachmentUrl,
    } = body;

    const targetEmployeeId = body.employeeId || session.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "Employee ID tidak ditemukan." }, { status: 400 });
    }

    if (!permissionTypeId || !date || !reason?.trim()) {
      return NextResponse.json({
        error: "Harap lengkapi semua data wajib (Jenis izin, tanggal, dan alasan).",
      }, { status: 400 });
    }

    const reqDate = new Date(date);
    if (isNaN(reqDate.getTime())) {
      return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
    }

    // Fetch permission type
    const permType = await db.permissionType.findUnique({
      where: { id: permissionTypeId },
    });

    if (!permType || permType.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis izin tidak ditemukan di perusahaan ini." }, { status: 404 });
    }

    if (!permType.isActive) {
      return NextResponse.json({
        error: `Jenis izin '${permType.name}' saat ini dinonaktifkan oleh kebijakan perusahaan.`,
      }, { status: 400 });
    }

    // Validate attachment
    if (permType.requiresAttachment && !attachmentUrl) {
      return NextResponse.json({
        error: `Pengajuan izin '${permType.name}' mewajibkan lampiran bukti dokumen atau surat resmi.`,
      }, { status: 400 });
    }

    let durationHours = 8.0;

    // Validate hourly constraints
    if (permType.category === "HOURLY") {
      const hours = calculateHours(startTime, endTime);
      if (hours <= 0) {
        return NextResponse.json({
          error: "Jam selesai izin harus lebih lambat daripada jam mulai izin.",
        }, { status: 400 });
      }

      if (permType.maxHours && hours > permType.maxHours) {
        return NextResponse.json({
          error: `Durasi izin '${permType.name}' melebihi batas maksimal (${permType.maxHours} jam). Diajukan: ${hours} jam.`,
        }, { status: 400 });
      }

      durationHours = hours;
    }

    // Check overlap
    const startOfDay = new Date(new Date(reqDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(reqDate).setHours(23, 59, 59, 999));

    const existingReq = await db.permissionRequest.findFirst({
      where: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingReq) {
      // If same date, check if time overlaps
      if (permType.category === "DAILY" || existingReq.startTime === startTime) {
        return NextResponse.json({
          error: `Sudah ada pengajuan izin pada tanggal yang sama (Status: ${existingReq.status}).`,
        }, { status: 400 });
      }
    }

    // Create Permission Request
    const permission = await db.permissionRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        permissionTypeId: permType.id,
        permissionType: permType.code,
        date: reqDate,
        startTime,
        endTime,
        durationHours,
        reason,
        attachmentUrl: attachmentUrl || null,
        status: "PENDING",
      },
      include: {
        typeDefinition: true,
        employee: true,
      },
    });

    // Send In-App Notification to HR/Manager
    await db.notification.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        category: "APPROVAL",
        title: "Pengajuan Izin Baru",
        message: `${permission.employee.firstName} ${permission.employee.lastName} mengajukan izin '${permType.name}' pada tanggal ${new Date(date).toLocaleDateString("id-ID")}.`,
        referenceModule: "PERMISSION",
        referenceId: permission.id,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: "PERMISSION_REQUESTED",
      recordId: permission.id,
      newValues: {
        permissionType: permType.code,
        date,
        startTime,
        endTime,
        durationHours,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan izin '${permType.name}' berhasil dikirim dan menunggu persetujuan.`,
      data: permission,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST Permission Error:", err);
    return NextResponse.json({ error: "Gagal membuat pengajuan izin: " + err.message }, { status: 500 });
  }
}
