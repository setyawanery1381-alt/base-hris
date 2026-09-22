import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateEbupotCsv } from "@/lib/compliance-engine";

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

    // Fetch payslips for the given period
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

    const csvContent = generateEbupotCsv(
      payslips,
      {
        name: company.name,
        npwp: "01.234.567.8-012.000",
        companyCode: company.code,
      },
      { month, year }
    );

    const filename = `ebupot-21-${company.code}-${year}-${String(month).padStart(2, "0")}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/compliance/ebupot error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate e-Bupot CSV" }, { status: 500 });
  }
}
