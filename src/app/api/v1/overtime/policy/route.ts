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

    let policy = await db.overtimePolicy.findUnique({
      where: { companyId: session.companyId },
    });

    if (!policy) {
      policy = await db.overtimePolicy.create({
        data: {
          companyId: session.companyId,
          minOvertimeMinutes: 60,
          maxDailyHours: 4.0,
          maxWeeklyHours: 18.0,
          requiresPreApproval: true,
          compensationType: "PAYABLE",
          roundingMinutes: 30,
          requiresAttachment: false,
          workdayMultiplier: 1.5,
          holidayMultiplier: 2.0,
        },
      });
    }

    return NextResponse.json({ success: true, policy });
  } catch (err: any) {
    console.error("GET /api/v1/overtime/policy error:", err);
    return NextResponse.json({ error: "Gagal memuat kebijakan lembur: " + err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR Admin yang dapat mengubah kebijakan lembur." }, { status: 403 });
    }

    const body = await req.json();
    const {
      minOvertimeMinutes,
      maxDailyHours,
      maxWeeklyHours,
      requiresPreApproval,
      compensationType,
      roundingMinutes,
      requiresAttachment,
      workdayMultiplier,
      holidayMultiplier,
    } = body;

    const existingPolicy = await db.overtimePolicy.findUnique({
      where: { companyId: session.companyId },
    });

    const updatedPolicy = await db.overtimePolicy.upsert({
      where: { companyId: session.companyId },
      create: {
        companyId: session.companyId,
        minOvertimeMinutes: Number(minOvertimeMinutes ?? 60),
        maxDailyHours: Number(maxDailyHours ?? 4.0),
        maxWeeklyHours: Number(maxWeeklyHours ?? 18.0),
        requiresPreApproval: Boolean(requiresPreApproval ?? true),
        compensationType: compensationType || "PAYABLE",
        roundingMinutes: Number(roundingMinutes ?? 30),
        requiresAttachment: Boolean(requiresAttachment ?? false),
        workdayMultiplier: Number(workdayMultiplier ?? 1.5),
        holidayMultiplier: Number(holidayMultiplier ?? 2.0),
      },
      update: {
        minOvertimeMinutes: minOvertimeMinutes !== undefined ? Number(minOvertimeMinutes) : undefined,
        maxDailyHours: maxDailyHours !== undefined ? Number(maxDailyHours) : undefined,
        maxWeeklyHours: maxWeeklyHours !== undefined ? Number(maxWeeklyHours) : undefined,
        requiresPreApproval: requiresPreApproval !== undefined ? Boolean(requiresPreApproval) : undefined,
        compensationType: compensationType || undefined,
        roundingMinutes: roundingMinutes !== undefined ? Number(roundingMinutes) : undefined,
        requiresAttachment: requiresAttachment !== undefined ? Boolean(requiresAttachment) : undefined,
        workdayMultiplier: workdayMultiplier !== undefined ? Number(workdayMultiplier) : undefined,
        holidayMultiplier: holidayMultiplier !== undefined ? Number(holidayMultiplier) : undefined,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OVERTIME",
      action: "OVERTIME_POLICY_UPDATED",
      recordId: updatedPolicy.id,
      oldValues: existingPolicy ? { ...existingPolicy } : undefined,
      newValues: { ...updatedPolicy },
    });

    return NextResponse.json({
      success: true,
      message: "Kebijakan lembur berhasil diperbarui.",
      policy: updatedPolicy,
    });
  } catch (err: any) {
    console.error("PUT /api/v1/overtime/policy error:", err);
    return NextResponse.json({ error: "Gagal memperbarui kebijakan lembur: " + err.message }, { status: 500 });
  }
}
