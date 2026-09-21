import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { convertCandidateToEmployee } from "@/lib/recruitment-engine";

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
      departmentId,
      positionId,
      managerId,
      locationId,
      joinDate,
      employmentStatus,
      employmentType,
      basicSalary,
    } = body;

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID required" }, { status: 400 });
    }

    const result = await convertCandidateToEmployee({
      companyId: session.companyId,
      candidateId,
      departmentId,
      positionId,
      managerId,
      locationId,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      employmentStatus,
      employmentType,
      basicSalary: basicSalary ? Number(basicSalary) : undefined,
      performedByUserId: session.userId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/recruitment/hire error:", err);
    return NextResponse.json({ error: err.message || "Failed to convert candidate to employee" }, { status: 500 });
  }
}
