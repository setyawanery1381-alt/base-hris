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

    const whereClause: any = { companyId: session.companyId };
    if (employeeOnly || (session.roles.includes("EMPLOYEE") && !session.roles.includes("HR_ADMIN") && !session.roles.includes("MANAGER"))) {
      whereClause.employeeId = session.employeeId;
    }

    const requests = await db.overtimeRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          include: { department: true, position: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat lembur." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body;

    // Action mode: Approve or Reject
    if (action && id) {
      const updated = await db.overtimeRequest.update({
        where: { id },
        data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" },
      });

      await recordAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        module: "OVERTIME",
        action: action,
        recordId: id,
      });

      return NextResponse.json({ success: true, message: `Lembur di-${action === "APPROVE" ? "setujui" : "tolak"}.`, data: updated });
    }

    // Submit mode
    const { date, startTime, endTime, hours, reason, projectName } = body;
    const targetEmployeeId = body.employeeId || session.employeeId;

    const ot = await db.overtimeRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        date: new Date(date),
        startTime,
        endTime,
        hours: Number(hours),
        reason,
        projectName,
        status: "PENDING",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OVERTIME",
      action: "CREATE",
      recordId: ot.id,
      newValues: { hours, reason },
    });

    return NextResponse.json({ success: true, message: "Pengajuan lembur berhasil dikirim.", data: ot });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memproses lembur: " + err.message }, { status: 500 });
  }
}