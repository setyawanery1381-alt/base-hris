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
    const candidateId = searchParams.get("id");
    const jobPostingId = searchParams.get("jobPostingId");
    const stage = searchParams.get("stage");

    if (candidateId) {
      const candidate = await db.jobCandidate.findFirst({
        where: { id: candidateId, companyId: session.companyId },
        include: {
          jobPosting: {
            include: {
              department: { select: { id: true, name: true } },
              position: { select: { id: true, name: true } },
            },
          },
          interviews: {
            include: {
              interviewer: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { scheduledAt: "desc" },
          },
          offers: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Kandidat tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ candidate });
    }

    const where: any = { companyId: session.companyId };
    if (jobPostingId) where.jobPostingId = jobPostingId;
    if (stage && stage !== "ALL") where.stage = stage;

    const candidates = await db.jobCandidate.findMany({
      where,
      include: {
        jobPosting: {
          select: { id: true, title: true, department: { select: { name: true } } },
        },
        interviews: {
          select: { id: true, stage: true, status: true, scheduledAt: true, interviewerScore: true },
          orderBy: { scheduledAt: "desc" },
          take: 1,
        },
        offers: {
          select: { id: true, status: true, offeredSalary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ candidates });
  } catch (err: any) {
    console.error("GET /api/v1/recruitment/candidates error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch candidates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyId: explicitCompanyId,
      jobPostingId,
      fullName,
      email,
      phone,
      resumeUrl,
      portfolioUrl,
      linkedinUrl,
      currentCompany,
      currentSalary,
      expectedSalary,
      noticePeriodDays = 30,
      source = "CAREER_PORTAL",
      notes,
    } = body;

    let targetCompanyId = explicitCompanyId;

    if (!targetCompanyId) {
      const session = await getSession();
      if (session && session.companyId) {
        targetCompanyId = session.companyId;
      }
    }

    // Lookup company from jobPosting if needed
    if (!targetCompanyId && jobPostingId) {
      const job = await db.jobPosting.findUnique({ where: { id: jobPostingId } });
      if (job) targetCompanyId = job.companyId;
    }

    if (!targetCompanyId || !jobPostingId || !fullName || !email || !phone) {
      return NextResponse.json({ error: "Data diri pelamar dan lowongan wajib diisi lengkap" }, { status: 400 });
    }

    const candidate = await db.jobCandidate.create({
      data: {
        companyId: targetCompanyId,
        jobPostingId,
        fullName,
        email,
        phone,
        resumeUrl,
        portfolioUrl,
        linkedinUrl,
        currentCompany,
        currentSalary: currentSalary ? Number(currentSalary) : null,
        expectedSalary: expectedSalary ? Number(expectedSalary) : null,
        noticePeriodDays: Number(noticePeriodDays) || 30,
        stage: "APPLIED",
        source,
        notes,
      },
    });

    await recordAuditLog({
      companyId: targetCompanyId,
      module: "RECRUITMENT",
      action: "CANDIDATE_APPLIED",
      recordId: candidate.id,
      newValues: { fullName, email, jobPostingId },
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/recruitment/candidates error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit application" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, stage, rating, notes, rejectionReason } = body;

    if (!id) {
      return NextResponse.json({ error: "Candidate ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (rating !== undefined) updateData.rating = Number(rating);
    if (notes !== undefined) updateData.notes = notes;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

    const candidate = await db.jobCandidate.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "UPDATE_CANDIDATE_STAGE",
      recordId: candidate.id,
      newValues: updateData,
    });

    return NextResponse.json({ candidate });
  } catch (err: any) {
    console.error("PATCH /api/v1/recruitment/candidates error:", err);
    return NextResponse.json({ error: err.message || "Failed to update candidate" }, { status: 500 });
  }
}
