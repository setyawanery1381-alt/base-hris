import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: any = { companyId: session.companyId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const tasks = await db.onboardingTask.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeIdNumber: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
            joinDate: true,
          },
        },
      },
      orderBy: [{ employeeId: "asc" }, { createdAt: "asc" }],
    });

    // Also group by employee
    const employeeMap: Record<string, any> = {};
    for (const t of tasks) {
      const empId = t.employeeId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee: t.employee,
          tasks: [],
          total: 0,
          completed: 0,
        };
      }
      employeeMap[empId].tasks.push(t);
      employeeMap[empId].total++;
      if (t.status === "COMPLETED") employeeMap[empId].completed++;
    }

    const groupedEmployees = Object.values(employeeMap).map((e: any) => ({
      ...e,
      progressPercent: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
    }));

    return NextResponse.json({ tasks, groupedEmployees });
  } catch (err: any) {
    console.error("GET /api/v1/recruitment/onboarding error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch onboarding tasks" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Task ID and status required" }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
    if (notes !== undefined) updateData.notes = notes;

    const task = await db.onboardingTask.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "UPDATE_ONBOARDING_TASK",
      recordId: task.id,
      newValues: updateData,
    });

    return NextResponse.json({ task });
  } catch (err: any) {
    console.error("PATCH /api/v1/recruitment/onboarding error:", err);
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}
