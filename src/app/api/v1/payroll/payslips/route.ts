import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const payslipId = searchParams.get("id");
    const scope = searchParams.get("scope");
    const periodId = searchParams.get("periodId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const search = searchParams.get("search");

    const isHrOrFinance =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("FINANCE");

    // 1. Single Payslip Detail
    if (payslipId) {
      const payslip = await db.payslip.findFirst({
        where: { id: payslipId, companyId: session.companyId },
        include: {
          company: {
            include: { branding: true },
          },
          period: true,
          employee: {
            include: {
              department: true,
              position: true,
              personalData: true,
              salaryProfile: true,
            },
          },
          items: true,
        },
      });

      if (!payslip) {
        return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
      }

      // Security check: Employee can only see their own published payslips
      if (!isHrOrFinance) {
        if (payslip.employeeId !== session.employeeId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (payslip.status === "DRAFT") {
          return NextResponse.json({ error: "Payslip is not yet published" }, { status: 403 });
        }
      }

      return NextResponse.json({ payslip });
    }

    // 2. Employee Self-Service Scope ("mine")
    if (scope === "mine" || !isHrOrFinance) {
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile found for user" }, { status: 400 });
      }

      const payslips = await db.payslip.findMany({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          status: { in: ["PUBLISHED", "PAID"] },
        },
        include: {
          period: true,
        },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      });

      return NextResponse.json({ payslips });
    }

    // 3. Admin / Finance List View
    const where: any = { companyId: session.companyId };
    if (periodId) where.payrollPeriodId = periodId;
    if (month) where.periodMonth = parseInt(month, 10);
    if (year) where.periodYear = parseInt(year, 10);

    if (search) {
      where.employee = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { employeeIdNumber: { contains: search } },
        ],
      };
    }

    const payslips = await db.payslip.findMany({
      where,
      include: {
        period: true,
        employee: {
          select: {
            id: true,
            employeeIdNumber: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
            salaryProfile: {
              select: {
                bankName: true,
                bankAccountNumber: true,
                taxStatus: true,
              },
            },
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return NextResponse.json({ payslips });
  } catch (error: any) {
    console.error("Failed to fetch payslips:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
