import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateBankDisbursalFile, BankFormat, DisbursalEmployeeItem } from "@/lib/bank-disbursal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("FINANCE");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const periodId = searchParams.get("periodId");
    const format = (searchParams.get("format") || "GENERIC_CSV").toUpperCase() as BankFormat;
    const isDownload = searchParams.get("download") === "true";

    if (!runId && !periodId) {
      return NextResponse.json({ error: "runId or periodId is required" }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: { id: session.companyId },
      select: { name: true },
    });

    const where: any = { companyId: session.companyId };
    if (runId) where.payrollRunId = runId;
    if (periodId) where.payrollPeriodId = periodId;

    const payslips = await db.payslip.findMany({
      where,
      include: {
        period: true,
        employee: {
          include: {
            personalData: true,
            salaryProfile: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (payslips.length === 0) {
      return NextResponse.json({ error: "No payslip records found for the specified run/period" }, { status: 404 });
    }

    const periodName = payslips[0]?.period?.name || "Periode";

    const items: DisbursalEmployeeItem[] = payslips.map((p) => {
      const sp = p.employee.salaryProfile;
      const pd = p.employee.personalData;
      return {
        employeeId: p.employee.id,
        employeeNumber: p.employee.employeeIdNumber,
        employeeName: `${p.employee.firstName} ${p.employee.lastName}`.trim(),
        bankName: sp?.bankName || pd?.bankName || "BCA",
        bankAccountNumber: sp?.bankAccountNumber || pd?.bankAccountNumber || "",
        bankAccountHolder: sp?.bankAccountHolder || pd?.bankAccountHolder || `${p.employee.firstName} ${p.employee.lastName}`,
        netSalary: p.netSalary,
        email: p.employee.user?.email,
      };
    });

    const file = generateBankDisbursalFile(
      format,
      company?.name || "BASE HRIS",
      periodName,
      items
    );

    if (isDownload) {
      return new NextResponse(file.content, {
        headers: {
          "Content-Type": `${file.contentType}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="${file.fileName}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      file,
      totalEmployees: items.length,
      totalAmount: items.reduce((sum, i) => sum + i.netSalary, 0),
    });
  } catch (error: any) {
    console.error("Failed to generate bank disbursal:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
