import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyCode = searchParams.get("companyCode");
    const jobId = searchParams.get("id");
    const status = searchParams.get("status");

    let companyId: string | null = null;

    // Check if session exists (admin portal)
    const session = await getSession();
    if (session && session.companyId) {
      companyId = session.companyId;
    } else if (companyCode) {
      // Public careers portal
      const comp = await db.company.findUnique({ where: { code: companyCode } });
      if (comp) companyId = comp.id;
    }

    if (!companyId) {
      // If no company specified, fallback to default tenant
      const defaultComp = await db.company.findFirst({ where: { code: "kanaya" } });
      if (defaultComp) companyId = defaultComp.id;
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (jobId) {
      const job = await db.jobPosting.findFirst({
        where: { id: jobId, companyId },
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          candidates: {
            select: {
              id: true,
              fullName: true,
              email: true,
              stage: true,
              rating: true,
              createdAt: true,
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json({ error: "Lowongan tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({ job });
    }

    const where: any = { companyId };
    if (status) {
      where.status = status;
    } else if (!session) {
      // Public visitors only see published jobs
      where.status = "PUBLISHED";
    }

    const jobs = await db.jobPosting.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error("GET /api/v1/recruitment/jobs error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch jobs" }, { status: 500 });
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
      title,
      departmentId,
      positionId,
      employmentType = "FULL_TIME",
      experienceLevel = "MID",
      location = "Jakarta (Hybrid)",
      minSalary,
      maxSalary,
      quota = 1,
      description,
      requirements,
      status = "PUBLISHED",
      deadlineDate,
    } = body;

    if (!title || !description || !requirements) {
      return NextResponse.json({ error: "Judul posisi, deskripsi, dan kualifikasi wajib diisi" }, { status: 400 });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const job = await db.jobPosting.create({
      data: {
        companyId: session.companyId,
        departmentId: departmentId || null,
        positionId: positionId || null,
        title,
        slug,
        employmentType,
        experienceLevel,
        location,
        minSalary: minSalary ? Number(minSalary) : null,
        maxSalary: maxSalary ? Number(maxSalary) : null,
        quota: Number(quota) || 1,
        description,
        requirements,
        status,
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "CREATE_JOB_POSTING",
      recordId: job.id,
      newValues: { title, quota, status },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/recruitment/jobs error:", err);
    return NextResponse.json({ error: err.message || "Failed to create job" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      departmentId,
      positionId,
      employmentType,
      experienceLevel,
      location,
      minSalary,
      maxSalary,
      quota,
      description,
      requirements,
      status,
      deadlineDate,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (positionId !== undefined) updateData.positionId = positionId || null;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (location !== undefined) updateData.location = location;
    if (minSalary !== undefined) updateData.minSalary = minSalary ? Number(minSalary) : null;
    if (maxSalary !== undefined) updateData.maxSalary = maxSalary ? Number(maxSalary) : null;
    if (quota !== undefined) updateData.quota = Number(quota);
    if (description !== undefined) updateData.description = description;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (status !== undefined) updateData.status = status;
    if (deadlineDate !== undefined) updateData.deadlineDate = deadlineDate ? new Date(deadlineDate) : null;

    const job = await db.jobPosting.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "UPDATE_JOB_POSTING",
      recordId: job.id,
      newValues: updateData,
    });

    return NextResponse.json({ job });
  } catch (err: any) {
    console.error("PUT /api/v1/recruitment/jobs error:", err);
    return NextResponse.json({ error: err.message || "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    await db.jobPosting.delete({ where: { id } });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "DELETE_JOB_POSTING",
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/v1/recruitment/jobs error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete job" }, { status: 500 });
  }
}
