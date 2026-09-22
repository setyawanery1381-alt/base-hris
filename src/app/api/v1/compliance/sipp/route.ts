import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateSippCsv } from "@/lib/compliance-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const company = await db.company.findUnique({
      where: { id: session.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const payslips = await db.payslip.findMany({
      where: {
        companyId: session.companyId,
        periodMonth: month,
        periodYear: year,
      },
      include: {
        employee: {
          include: {
            personalData: true,
            salaryProfile: true,
            department: true,
            position: true,
          },
        },
      },
    });

    const csvContent = generateSippCsv(
      payslips,
      {
        name: company.name,
        companyCode: company.code,
      },
      { month, year }
    );

    const filename = `sipp-bpjstk-${company.code}-${year}-${String(month).padStart(2, "0")}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/compliance/sipp error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate SIPP CSV" }, { status: 500 });
  }
}
