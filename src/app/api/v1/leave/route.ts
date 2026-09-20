import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// Helper to calculate working days between two dates
function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI"]
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayName = dayNames[cur.getDay()];
    if (workingDays.includes(dayName)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
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
    const yearParam = searchParams.get("year");
    const departmentId = searchParams.get("departmentId");
    const filterEmployeeId = searchParams.get("employeeId");

    const isHrOrManager =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    // Construct Where Clause for Requests
    const reqWhere: any = {
      companyId: session.companyId,
    };

    if (employeeOnly || !isHrOrManager) {
      reqWhere.employeeId = session.employeeId;
    } else if (filterEmployeeId) {
      reqWhere.employeeId = filterEmployeeId;
    }

    if (statusFilter && statusFilter !== "ALL") {
      reqWhere.status = statusFilter;
    }

    if (departmentId) {
      reqWhere.employee = { departmentId };
    }

    const currentYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Construct Where Clause for Balances
    const balWhere: any = {
      companyId: session.companyId,
      year: currentYear,
    };
    if (employeeOnly || !isHrOrManager) {
      balWhere.employeeId = session.employeeId;
    } else if (filterEmployeeId) {
      balWhere.employeeId = filterEmployeeId;
    }

    const [requests, balances, leaveTypes] = await Promise.all([
      db.leaveRequest.findMany({
        where: reqWhere,
        include: {
          employee: {
            include: { department: true, position: true },
          },
          leaveType: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.leaveBalance.findMany({
        where: balWhere,
        include: {
          leaveType: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeIdNumber: true, departmentId: true },
          },
        },
        orderBy: { employeeId: "asc" },
      }),
      db.leaveType.findMany({
        where: {
          companyId: session.companyId,
          ...(isHrOrManager ? {} : { isActive: true }),
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Compute summary metrics
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
      balances,
      leaveTypes,
      summary,
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
    const {
      leaveTypeId,
      startDate,
      endDate,
      dayType = "FULL_DAY",
      reason,
      attachmentUrl,
    } = body;

    const targetEmployeeId = body.employeeId || session.employeeId;
    if (!targetEmployeeId) {
      return NextResponse.json({ error: "Employee ID tidak ditemukan." }, { status: 400 });
    }

    // 1. Validate basic inputs
    if (!leaveTypeId || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({
        error: "Harap lengkapi semua data wajib (Jenis cuti, tanggal mulai, tanggal selesai, dan alasan).",
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
    }

    if (end < start) {
      return NextResponse.json({ error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." }, { status: 400 });
    }

    // 2. Fetch and validate LeaveType
    const leaveType = await db.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType || leaveType.companyId !== session.companyId) {
      return NextResponse.json({ error: "Jenis cuti tidak ditemukan di perusahaan ini." }, { status: 404 });
    }

    if (!leaveType.isActive) {
      return NextResponse.json({
        error: `Jenis cuti '${leaveType.name}' saat ini sedang dinonaktifkan oleh kebijakan perusahaan.`,
      }, { status: 400 });
    }

    // Check required attachment
    if (leaveType.requiresAttachment && !attachmentUrl) {
      return NextResponse.json({
        error: `Pengajuan cuti '${leaveType.name}' mewajibkan lampiran bukti dokumen / Surat Keterangan Dokter.`,
      }, { status: 400 });
    }

    // Check half-day permission
    if (dayType !== "FULL_DAY" && !leaveType.allowHalfDay) {
      return NextResponse.json({
        error: `Jenis cuti '${leaveType.name}' tidak mengizinkan pengajuan setengah hari.`,
      }, { status: 400 });
    }

    // Check notice days
    if (leaveType.minNoticeDays > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < leaveType.minNoticeDays) {
        return NextResponse.json({
          error: `Kebijakan '${leaveType.name}' mengharuskan pengajuan minimal ${leaveType.minNoticeDays} hari sebelum tanggal cuti.`,
        }, { status: 400 });
      }
    }

    // 3. Compute Duration Days
    let durationDays = 1.0;
    if (dayType === "FIRST_HALF" || dayType === "SECOND_HALF") {
      durationDays = 0.5;
    } else {
      // Full day calculation based on company working days policy
      const policy = await db.attendancePolicy.findFirst({
        where: { companyId: session.companyId, isDefault: true },
      });
      let activeDays = ["MON", "TUE", "WED", "THU", "FRI"];
      if (policy && policy.workingDays) {
        try {
          activeDays = JSON.parse(policy.workingDays);
        } catch {
          activeDays = policy.workingDays.split(",").map((d) => d.trim());
        }
      }
      const calculatedDays = calculateWorkingDays(startDate, endDate, activeDays);
      if (calculatedDays <= 0) {
        return NextResponse.json({
          error: "Rentang tanggal yang dipilih tidak memuat hari kerja aktif (semuanya adalah hari libur).",
        }, { status: 400 });
      }
      durationDays = calculatedDays;
    }

    // 4. Overlap Check
    const overlapping = await db.leaveRequest.findFirst({
      where: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json({
        error: `Terdapat pengajuan cuti lain yang bertabrakan pada rentang tanggal tersebut (Status: ${overlapping.status}).`,
      }, { status: 400 });
    }

    // 5. Balance Check (if entitlement > 0)
    const currentYear = start.getFullYear();
    let balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: targetEmployeeId,
          leaveTypeId,
          year: currentYear,
        },
      },
    });

    // Auto-create balance if not yet exists
    if (!balance && leaveType.defaultEntitlement > 0) {
      balance = await db.leaveBalance.create({
        data: {
          companyId: session.companyId,
          employeeId: targetEmployeeId,
          leaveTypeId,
          year: currentYear,
          entitlement: leaveType.defaultEntitlement,
          used: 0,
          remaining: leaveType.defaultEntitlement,
        },
      });
    }

    if (balance && leaveType.defaultEntitlement > 0 && balance.remaining < durationDays) {
      return NextResponse.json({
        error: `Saldo cuti '${leaveType.name}' tidak mencukupi. Sisa saldo: ${balance.remaining} hari, diajukan: ${durationDays} hari.`,
      }, { status: 400 });
    }

    // 6. Create Leave Request
    const leave = await db.leaveRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        durationDays,
        dayType,
        reason,
        attachmentUrl: attachmentUrl || null,
        status: "PENDING",
      },
      include: {
        leaveType: true,
        employee: true,
      },
    });

    // 7. Spawn ApprovalRequest if workflow exists
    const workflow = await db.approvalWorkflow.findFirst({
      where: { companyId: session.companyId, module: "LEAVE", isActive: true },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (workflow && workflow.steps.length > 0) {
      const apprReq = await db.approvalRequest.create({
        data: {
          companyId: session.companyId,
          workflowId: workflow.id,
          referenceModule: "LEAVE",
          referenceId: leave.id,
          requesterId: session.userId,
          currentStepOrder: 1,
          status: "PENDING",
        },
      });
      await db.approvalHistory.create({
        data: {
          approvalRequestId: apprReq.id,
          stepOrder: 1,
          actorId: session.userId,
          action: "SUBMITTED",
          comments: "Pengajuan diajukan oleh pemohon",
        },
      });
    }

    // 8. Send In-App Notification to HR/Managers
    await db.notification.create({
      data: {
        companyId: session.companyId,
        userId: session.userId,
        category: "APPROVAL",
        title: "Pengajuan Cuti Baru",
        message: `${leave.employee.firstName} ${leave.employee.lastName} mengajukan cuti '${leave.leaveType.name}' (${durationDays} hari) mulai ${startDate} s/d ${endDate}.`,
        referenceModule: "LEAVE",
        referenceId: leave.id,
      },
    });

    // 8. Record Audit Log
    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_REQUESTED",
      recordId: leave.id,
      newValues: {
        leaveTypeId,
        leaveTypeName: leave.leaveType.name,
        startDate,
        endDate,
        durationDays,
        dayType,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan cuti '${leave.leaveType.name}' berhasil dikirim (${durationDays} hari) dan menunggu persetujuan.`,
      data: leave,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST Leave Error:", err);
    return NextResponse.json({ error: "Gagal membuat pengajuan cuti: " + err.message }, { status: 500 });
  }
}