import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { autoProvisionCycleReviews } from "@/lib/performance-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("id");

    if (cycleId) {
      const cycle = await db.performanceCycle.findFirst({
        where: { id: cycleId, companyId: session.companyId },
        include: {
          reviews: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeIdNumber: true,
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } },
                  position: { select: { name: true } },
                },
              },
              reviewer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          goals: true,
        },
      });

      if (!cycle) {
        return NextResponse.json({ error: "Performance cycle not found" }, { status: 404 });
      }

      return NextResponse.json({ cycle });
    }

    const cycles = await db.performanceCycle.findMany({
      where: { companyId: session.companyId },
      include: {
        reviews: {
          select: {
            id: true,
            status: true,
            selfScore: true,
            managerScore: true,
            finalScore: true,
            finalGrade: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            goals: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Compute stats for each cycle
    const enrichedCycles = cycles.map((c) => {
      const total = c.reviews.length;
      const selfSubmitted = c.reviews.filter((r) => r.selfScore !== null).length;
      const managerSubmitted = c.reviews.filter((r) => r.managerScore !== null).length;
      const completed = c.reviews.filter((r) => r.status === "COMPLETED").length;

      // Bell curve distribution
      const gradeCounts = {
        A: c.reviews.filter((r) => r.finalGrade === "A").length,
        B: c.reviews.filter((r) => r.finalGrade === "B").length,
        C: c.reviews.filter((r) => r.finalGrade === "C").length,
        D: c.reviews.filter((r) => r.finalGrade === "D").length,
        E: c.reviews.filter((r) => r.finalGrade === "E").length,
      };

      const averageScore =
        total > 0
          ? Number(
              (
                c.reviews.reduce((acc, r) => acc + (r.finalScore || r.managerScore || r.selfScore || 0), 0) /
                (c.reviews.filter((r) => r.finalScore || r.managerScore || r.selfScore).length || 1)
              ).toFixed(2)
            )
          : 0;

      return {
        ...c,
        stats: {
          totalReviews: total,
          selfSubmitted,
          managerSubmitted,
          completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          averageScore,
          gradeCounts,
        },
      };
    });

    return NextResponse.json({ cycles: enrichedCycles });
  } catch (err: any) {
    console.error("GET /api/v1/performance/cycles error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch performance cycles" }, { status: 500 });
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
      name,
      cycleType = "SEMI_ANNUAL",
      startDate,
      endDate,
      selfReviewDeadline,
      managerReviewDeadline,
      description,
      autoProvision = true,
    } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Nama periode, tanggal mulai, dan selesai wajib diisi" }, { status: 400 });
    }

    const cycle = await db.performanceCycle.create({
      data: {
        companyId: session.companyId,
        name,
        cycleType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        selfReviewDeadline: selfReviewDeadline ? new Date(selfReviewDeadline) : new Date(endDate),
        managerReviewDeadline: managerReviewDeadline ? new Date(managerReviewDeadline) : new Date(endDate),
        status: "ACTIVE",
        description,
      },
    });

    let provisionResult = null;
    if (autoProvision) {
      provisionResult = await autoProvisionCycleReviews(session.companyId, cycle.id);
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "CREATE_CYCLE",
      recordId: cycle.id,
      newValues: { name, cycleType, provisionResult },
    });

    return NextResponse.json({ cycle, provisionResult }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/performance/cycles error:", err);
    return NextResponse.json({ error: err.message || "Failed to create performance cycle" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, status, startDate, endDate, selfReviewDeadline, managerReviewDeadline, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Cycle ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (selfReviewDeadline) updateData.selfReviewDeadline = new Date(selfReviewDeadline);
    if (managerReviewDeadline) updateData.managerReviewDeadline = new Date(managerReviewDeadline);
    if (description !== undefined) updateData.description = description;

    const cycle = await db.performanceCycle.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "UPDATE_CYCLE",
      recordId: cycle.id,
      newValues: updateData,
    });

    return NextResponse.json({ cycle });
  } catch (err: any) {
    console.error("PUT /api/v1/performance/cycles error:", err);
    return NextResponse.json({ error: err.message || "Failed to update performance cycle" }, { status: 500 });
  }
}
