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
    const cycleId = searchParams.get("cycleId");
    let employeeId = searchParams.get("employeeId");

    const isHrOrAdmin = session.roles.some((r) => ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"].includes(r));
    if (!isHrOrAdmin && session.employeeId) {
      // Employees can only view their own goals
      employeeId = session.employeeId;
    } else if (!employeeId && session.employeeId) {
      employeeId = session.employeeId;
    }

    const where: any = { companyId: session.companyId };
    if (cycleId) where.cycleId = cycleId;
    if (employeeId) where.employeeId = employeeId;

    const goals = await db.performanceGoal.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeIdNumber: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        cycle: {
          select: { id: true, name: true, status: true },
        },
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ goals });
  } catch (err: any) {
    console.error("GET /api/v1/performance/goals error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let {
      employeeId,
      cycleId,
      title,
      description,
      category = "KPI",
      metricUnit = "PERCENTAGE",
      targetValue = 100,
      currentValue = 0,
      weight = 20,
      dueDate,
    } = body;

    if (!employeeId && session.employeeId) {
      employeeId = session.employeeId;
    }

    if (!employeeId || !cycleId || !title) {
      return NextResponse.json({ error: "Employee, periode penilaian, dan judul target wajib diisi" }, { status: 400 });
    }

    const targetVal = Number(targetValue) || 100;
    const currentVal = Number(currentValue) || 0;
    const initialStatus = currentVal >= targetVal ? "COMPLETED" : currentVal > 0 ? "IN_PROGRESS" : "NOT_STARTED";

    const goal = await db.performanceGoal.create({
      data: {
        companyId: session.companyId,
        employeeId,
        cycleId,
        title,
        description,
        category,
        metricUnit,
        targetValue: targetVal,
        currentValue: currentVal,
        weight: Number(weight) || 20,
        status: initialStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // If initial value > 0, log a checkin
    if (currentVal > 0) {
      await db.goalCheckIn.create({
        data: {
          goalId: goal.id,
          updatedByUserId: session.userId,
          previousValue: 0,
          newValue: currentVal,
          progressPercent: Math.min(100, Math.round((currentVal / targetVal) * 100)),
          notes: "Initial target setup",
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "CREATE_GOAL",
      recordId: goal.id,
      newValues: { title, targetVal, currentVal },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/performance/goals error:", err);
    return NextResponse.json({ error: err.message || "Failed to create performance goal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goalId, newValue, notes } = body;

    if (!goalId || newValue === undefined) {
      return NextResponse.json({ error: "goalId dan newValue wajib diisi" }, { status: 400 });
    }

    const goal = await db.performanceGoal.findFirst({
      where: { id: goalId, companyId: session.companyId },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal tidak ditemukan" }, { status: 404 });
    }

    const prevValue = goal.currentValue;
    const numNewValue = Number(newValue);
    const progressPercent = goal.targetValue > 0 ? Math.min(100, Math.round((numNewValue / goal.targetValue) * 100)) : 100;
    const newStatus = numNewValue >= goal.targetValue ? "COMPLETED" : numNewValue > 0 ? "IN_PROGRESS" : "NOT_STARTED";

    const [updatedGoal, checkIn] = await db.$transaction([
      db.performanceGoal.update({
        where: { id: goalId },
        data: {
          currentValue: numNewValue,
          status: newStatus,
        },
      }),
      db.goalCheckIn.create({
        data: {
          goalId,
          updatedByUserId: session.userId,
          previousValue: prevValue,
          newValue: numNewValue,
          progressPercent,
          notes: notes || `Update progres ke ${numNewValue} ${goal.metricUnit === "PERCENTAGE" ? "%" : ""}`,
        },
      }),
    ]);

    return NextResponse.json({ goal: updatedGoal, checkIn });
  } catch (err: any) {
    console.error("PATCH /api/v1/performance/goals error:", err);
    return NextResponse.json({ error: err.message || "Failed to update goal progress" }, { status: 500 });
  }
}
