import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateWlkpDemographics } from "@/lib/compliance-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await db.company.findUnique({
      where: { id: session.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const employees = await db.employee.findMany({
      where: { companyId: session.companyId, deletedAt: null },
      include: {
        personalData: true,
        department: true,
        position: true,
      },
    });

    const demographics = calculateWlkpDemographics(employees);

    return NextResponse.json({
      success: true,
      company: {
        name: company.name,
        code: company.code,
      },
      data: demographics,
    });
  } catch (error: any) {
    console.error("GET /api/v1/compliance/wlkp error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch WLKP data" }, { status: 500 });
  }
}
