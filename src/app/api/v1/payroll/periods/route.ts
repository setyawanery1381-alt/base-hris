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
    const year = searchParams.get("year");

    const where: any = { companyId: session.companyId };
    if (year) where.year = parseInt(year, 10);

    let periods = await db.payrollPeriod.findMany({
      where,
      include: {
        runs: {
          select: {
            id: true,
            status: true,
            totalEmployees: true,
            totalNetPay: true,
            runDate: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Auto-provision default period if none exists for this tenant
    if (periods.length === 0) {
      const now = new Date();
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      const defaultName = `Gaji ${monthNames[curMonth - 1] || curMonth} ${curYear}`;

      const newPeriod = await db.payrollPeriod.create({
        data: {
          companyId: session.companyId,
          name: defaultName,
          month: curMonth,
          year: curYear,
          startDate: new Date(curYear, curMonth - 1, 1),
          endDate: new Date(curYear, curMonth, 0),
          cutOffStartDate: new Date(curYear, curMonth - 2, 21),
          cutOffEndDate: new Date(curYear, curMonth - 1, 20),
          paymentDate: new Date(curYear, curMonth - 1, 25),
          status: "DRAFT",
        },
        include: {
          runs: {
            select: {
              id: true,
              status: true,
              totalEmployees: true,
              totalNetPay: true,
              runDate: true,
            },
          },
        },
      });
      periods = [newPeriod];
    }

    return NextResponse.json({ periods });
  } catch (error: any) {
    console.error("Failed to fetch payroll periods:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const {
      name,
      month,
      year,
      startDate,
      endDate,
      cutOffStartDate,
      cutOffEndDate,
      paymentDate,
    } = body;

    if (!month || !year || !startDate || !endDate || !cutOffStartDate || !cutOffEndDate || !paymentDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.payrollPeriod.findUnique({
      where: {
        companyId_month_year: {
          companyId: session.companyId,
          month: Number(month),
          year: Number(year),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Periode bulan ${month} tahun ${year} sudah ada.` },
        { status: 400 }
      );
    }

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const defaultName = name || `Gaji ${monthNames[Number(month) - 1] || month} ${year}`;

    const period = await db.payrollPeriod.create({
      data: {
        companyId: session.companyId,
        name: defaultName,
        month: Number(month),
        year: Number(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cutOffStartDate: new Date(cutOffStartDate),
        cutOffEndDate: new Date(cutOffEndDate),
        paymentDate: new Date(paymentDate),
        status: "DRAFT",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "CREATE_PAYROLL_PERIOD",
      recordId: period.id,
      newValues: period,
    });

    return NextResponse.json({ period }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create payroll period:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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

    const body = await req.json();
    const { id, name, status, paymentDate } = body;

    if (!id) {
      return NextResponse.json({ error: "Period ID is required" }, { status: 400 });
    }

    const existing = await db.payrollPeriod.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
    }

    const updated = await db.payrollPeriod.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(paymentDate && { paymentDate: new Date(paymentDate) }),
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "UPDATE_PAYROLL_PERIOD",
      recordId: updated.id,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({ period: updated });
  } catch (error: any) {
    console.error("Failed to update payroll period:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
