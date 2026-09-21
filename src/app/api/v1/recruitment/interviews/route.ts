import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      candidateId,
      interviewerId,
      stage = "INTERVIEW_HR",
      scheduledAt,
      locationType = "ONLINE_MEETING",
      meetingLink,
      locationAddress,
      interviewerScore,
      feedbackNotes,
      decision,
    } = body;

    if (!candidateId || !scheduledAt) {
      return NextResponse.json({ error: "Kandidat dan jadwal wawancara wajib diisi" }, { status: 400 });
    }

    const interview = await db.candidateInterview.create({
      data: {
        candidateId,
        interviewerId: interviewerId || null,
        stage,
        scheduledAt: new Date(scheduledAt),
        locationType,
        meetingLink,
        locationAddress,
        status: "SCHEDULED",
        interviewerScore: interviewerScore ? Number(interviewerScore) : null,
        feedbackNotes,
        decision,
      },
    });

    // Automatically update candidate stage if applicable
    const candidate = await db.jobCandidate.findUnique({ where: { id: candidateId } });
    if (candidate && ["APPLIED", "SCREENING"].includes(candidate.stage)) {
      await db.jobCandidate.update({
        where: { id: candidateId },
        data: { stage },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "SCHEDULE_INTERVIEW",
      recordId: interview.id,
      newValues: { candidateId, stage, scheduledAt },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/recruitment/interviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to schedule interview" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, interviewerScore, feedbackNotes, decision } = body;

    if (!id) {
      return NextResponse.json({ error: "Interview ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (interviewerScore !== undefined) updateData.interviewerScore = Number(interviewerScore);
    if (feedbackNotes !== undefined) updateData.feedbackNotes = feedbackNotes;
    if (decision !== undefined) updateData.decision = decision;

    const interview = await db.candidateInterview.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "EVALUATE_INTERVIEW",
      recordId: interview.id,
      newValues: updateData,
    });

    return NextResponse.json({ interview });
  } catch (err: any) {
    console.error("PATCH /api/v1/recruitment/interviews error:", err);
    return NextResponse.json({ error: err.message || "Failed to update interview" }, { status: 500 });
  }
}
