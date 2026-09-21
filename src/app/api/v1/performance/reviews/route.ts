import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { calculateReviewScores } from "@/lib/performance-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");
    const cycleId = searchParams.get("cycleId");
    const scope = searchParams.get("scope"); // "mine" | "subordinates" | null
    const status = searchParams.get("status");

    // Single review detail
    if (reviewId) {
      const review = await db.performanceReview.findFirst({
        where: { id: reviewId, companyId: session.companyId },
        include: {
          cycle: true,
          employee: {
            include: {
              department: { select: { id: true, name: true } },
              position: { select: { id: true, name: true } },
              manager: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: true,
        },
      });

      if (!review) {
        return NextResponse.json({ error: "Penilaian kinerja tidak ditemukan" }, { status: 404 });
      }

      // Also get goals for this employee in this cycle
      const goals = await db.performanceGoal.findMany({
        where: {
          companyId: session.companyId,
          employeeId: review.employeeId,
          cycleId: review.cycleId,
        },
        include: {
          checkIns: { orderBy: { createdAt: "desc" }, take: 3 },
        },
      });

      return NextResponse.json({ review, goals });
    }

    // List reviews
    const where: any = { companyId: session.companyId };
    if (cycleId) where.cycleId = cycleId;
    if (status) where.status = status;

    const isHrOrAdmin = session.roles.some((r) => ["SUPER_ADMIN", "HR_ADMIN"].includes(r));
    const isManager = session.roles.includes("MANAGER");

    if (scope === "mine" || (!isHrOrAdmin && !isManager)) {
      if (!session.employeeId) {
        return NextResponse.json({ reviews: [] });
      }
      where.employeeId = session.employeeId;
    } else if (scope === "subordinates" || (isManager && !isHrOrAdmin)) {
      if (!session.employeeId) {
        return NextResponse.json({ reviews: [] });
      }
      // Reviewer is current employee or employee's manager is current employee
      where.OR = [
        { reviewerId: session.employeeId },
        { employee: { managerId: session.employeeId } },
      ];
    }

    const reviews = await db.performanceReview.findMany({
      where,
      include: {
        cycle: {
          select: { id: true, name: true, status: true, endDate: true },
        },
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
          select: { id: true, firstName: true, lastName: true },
        },
        items: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error("GET /api/v1/performance/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch reviews" }, { status: 500 });
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
      action, // "SUBMIT_SELF" | "SUBMIT_MANAGER"
      reviewId,
      selfSummary,
      managerSummary,
      items = [], // [{ id, selfRating?, selfNotes?, managerRating?, managerNotes? }]
      promotionRecommended = false,
      salaryIncreaseRecommended = false,
      recommendationNotes = "",
    } = body;

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID required" }, { status: 400 });
    }

    const currentReview = await db.performanceReview.findFirst({
      where: { id: reviewId, companyId: session.companyId },
      include: { items: true },
    });

    if (!currentReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Update each item in the review
    for (const item of items) {
      if (!item.id) continue;
      const updateItemData: any = {};

      if (action === "SUBMIT_SELF") {
        if (item.selfRating !== undefined) updateItemData.selfRating = Number(item.selfRating);
        if (item.selfNotes !== undefined) updateItemData.selfNotes = item.selfNotes;
      } else if (action === "SUBMIT_MANAGER") {
        if (item.managerRating !== undefined) updateItemData.managerRating = Number(item.managerRating);
        if (item.managerNotes !== undefined) updateItemData.managerNotes = item.managerNotes;
        if (item.managerRating !== undefined) updateItemData.finalItemScore = Number(item.managerRating);
      }

      await db.reviewItem.update({
        where: { id: item.id },
        data: updateItemData,
      });
    }

    // Reload items to calculate new totals
    const updatedItems = await db.reviewItem.findMany({
      where: { reviewId },
    });

    const scoreResults = calculateReviewScores(updatedItems);

    const updateReviewData: any = {
      selfScore: scoreResults.selfScore,
      managerScore: scoreResults.managerScore,
    };

    if (action === "SUBMIT_SELF") {
      updateReviewData.selfSummary = selfSummary || currentReview.selfSummary;
      updateReviewData.selfSubmittedAt = new Date();
      updateReviewData.status = "MANAGER_ASSESSMENT";
    } else if (action === "SUBMIT_MANAGER") {
      updateReviewData.managerSummary = managerSummary || currentReview.managerSummary;
      updateReviewData.managerSubmittedAt = new Date();
      updateReviewData.finalScore = scoreResults.finalScore;
      updateReviewData.finalGrade = scoreResults.finalGrade;
      updateReviewData.promotionRecommended = Boolean(promotionRecommended);
      updateReviewData.salaryIncreaseRecommended = Boolean(salaryIncreaseRecommended);
      updateReviewData.recommendationNotes = recommendationNotes;
      updateReviewData.status = "HR_REVIEW";
    }

    const updatedReview = await db.performanceReview.update({
      where: { id: reviewId },
      data: updateReviewData,
      include: {
        items: true,
        employee: true,
        reviewer: true,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: action === "SUBMIT_SELF" ? "SUBMIT_SELF_REVIEW" : "SUBMIT_MANAGER_REVIEW",
      recordId: reviewId,
      newValues: { action, scores: scoreResults },
    });

    return NextResponse.json({ review: updatedReview, scoreResults });
  } catch (err: any) {
    console.error("POST /api/v1/performance/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit review" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reviewId, status = "COMPLETED", recommendationNotes, promotionRecommended, salaryIncreaseRecommended } = body;

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID required" }, { status: 400 });
    }

    const updateData: any = { status };
    if (recommendationNotes !== undefined) updateData.recommendationNotes = recommendationNotes;
    if (promotionRecommended !== undefined) updateData.promotionRecommended = Boolean(promotionRecommended);
    if (salaryIncreaseRecommended !== undefined) updateData.salaryIncreaseRecommended = Boolean(salaryIncreaseRecommended);

    const review = await db.performanceReview.update({
      where: { id: reviewId },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "FINALIZE_REVIEW",
      recordId: reviewId,
      newValues: { finalization: true, status },
    });

    return NextResponse.json({ review });
  } catch (err: any) {
    console.error("PUT /api/v1/performance/reviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to finalize review" }, { status: 500 });
  }
}
