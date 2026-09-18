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
    const employeeOnly = searchParams.get("mine") === "true";

    // If employee requesting only self
    const whereClause: any = {
      companyId: session.companyId,
    };
    if (employeeOnly || (session.roles.includes("EMPLOYEE") && !session.roles.includes("HR_ADMIN") && !session.roles.includes("MANAGER"))) {
      whereClause.employeeId = session.employeeId;
    }

    const [requests, balances, leaveTypes] = await Promise.all([
      db.leaveRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            include: { department: true, position: true },
          },
          leaveType: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.leaveBalance.findMany({
        where: {
          companyId: session.companyId,
          ...(session.employeeId && (employeeOnly || !session.roles.includes("HR_ADMIN")) ? { employeeId: session.employeeId } : {}),
        },
        include: {
          leaveType: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeIdNumber: true },
          },
        },
      }),
      db.leaveType.findMany({
        where: { companyId: session.companyId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      balances,
      leaveTypes,
    });
  } catch (err: any) {
    console.error("GET Leave Error:", err);
    return NextResponse.json({ error: "Gagal memuat data cuti." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leaveTypeId, startDate, endDate, durationDays = 1, dayType = "FULL_DAY", reason } = body;

    const targetEmployeeId = body.employeeId || session.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "Employee ID tidak ditemukan." }, { status: 400 });
    }

    // Check balance
    const currentYear = new Date(startDate).getFullYear();
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: targetEmployeeId,
          leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance && balance.remaining < durationDays) {
      return NextResponse.json({
        error: `Saldo cuti tidak mencukupi. Sisa saldo: ${balance.remaining} hari, diajukan: ${durationDays} hari.`,
      }, { status: 400 });
    }

    // Create Leave Request
    const leave = await db.leaveRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        durationDays: Number(durationDays),
        dayType,
        reason,
        status: "PENDING",
      },
      include: {
        leaveType: true,
        employee: true,
      },
    });

    // Create In-App Notification to HR/Managers
    await db.notification.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        category: "APPROVAL",
        title: "Pengajuan Cuti Baru",
        message: `${leave.employee.firstName} mengajukan cuti ${leave.leaveType.name} (${durationDays} hari) mulai ${startDate}.`,
        referenceModule: "LEAVE",
        referenceId: leave.id,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "CREATE",
      recordId: leave.id,
      newValues: { durationDays, reason },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan cuti berhasil dikirim dan menunggu persetujuan.",
      data: leave,
    });
  } catch (err: any) {
    console.error("POST Leave Error:", err);
    return NextResponse.json({ error: "Gagal membuat pengajuan cuti: " + err.message }, { status: 500 });
  }
}