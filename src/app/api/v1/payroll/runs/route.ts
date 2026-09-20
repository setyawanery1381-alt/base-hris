import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { computeEmployeePayroll } from "@/lib/payroll-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("id");
    const periodId = searchParams.get("periodId");

    if (runId) {
      const run = await db.payrollRun.findFirst({
        where: { id: runId, companyId: session.companyId },
        include: {
          period: true,
          payslips: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeIdNumber: true,
                  firstName: true,
                  lastName: true,
                  department: { select: { name: true } },
                  position: { select: { name: true } },
                },
              },
              items: true,
            },
          },
        },
      });

      if (!run) {
        return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
      }

      return NextResponse.json({ run });
    }

    const where: any = { companyId: session.companyId };
    if (periodId) where.periodId = periodId;

    const runs = await db.payrollRun.findMany({
      where,
      include: {
        period: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("Failed to fetch payroll runs:", error);
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
      return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 });
    }

    const body = await req.json();
    const { periodId } = body;

    if (!periodId) {
      return NextResponse.json({ error: "periodId is required" }, { status: 400 });
    }

    // 1. Fetch Payroll Period
    const period = await db.payrollPeriod.findFirst({
      where: { id: periodId, companyId: session.companyId },
    });

    if (!period) {
      return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
    }

    // 2. Fetch Tax & BPJS Settings
    let settings = await db.taxBpjsSetting.findUnique({
      where: { companyId: session.companyId },
    });
    if (!settings) {
      settings = await db.taxBpjsSetting.create({
        data: {
          companyId: session.companyId,
          bpjsKesCompanyRate: 4.0,
          bpjsKesEmployeeRate: 1.0,
          bpjsKesMaxCap: 12000000,
          bpjsTkJkkRate: 0.24,
          bpjsTkJkmRate: 0.30,
          bpjsTkJhtCompanyRate: 3.7,
          bpjsTkJhtEmployeeRate: 2.0,
          bpjsTkJpCompanyRate: 2.0,
          bpjsTkJpEmployeeRate: 1.0,
          bpjsTkJpMaxCap: 10042300,
          pph21Method: "TER_2024",
        },
      });
    }

    // 3. Fetch all active employees with their salary profile & assigned components
    const employees = await db.employee.findMany({
      where: {
        companyId: session.companyId,
        employmentStatus: { not: "RESIGNED" },
      },
      include: {
        salaryProfile: {
          include: {
            components: {
              where: { isActive: true },
              include: { component: true },
            },
          },
        },
        personalData: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: "No active employees found in company" }, { status: 400 });
    }

    // 4. Create or reuse PayrollRun
    let run = await db.payrollRun.findFirst({
      where: { periodId, companyId: session.companyId, status: "DRAFT" },
    });

    if (!run) {
      run = await db.payrollRun.create({
        data: {
          companyId: session.companyId,
          periodId: period.id,
          status: "DRAFT",
          processedBy: session.name || session.email,
        },
      });
    }

    const cutOffStart = new Date(period.cutOffStartDate);
    const cutOffEnd = new Date(period.cutOffEndDate);
    cutOffEnd.setHours(23, 59, 59, 999);

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalCompanyBpjs = 0;
    let totalEmployeeBpjs = 0;
    let totalPph21 = 0;
    let processedEmployees = 0;

    // 5. Process each employee
    for (const emp of employees) {
      const sp = emp.salaryProfile;
      const basicSalary = sp?.basicSalary || 0;
      const taxStatus = sp?.taxStatus || "TK/0";

      // Allowances
      const allowances = (sp?.components || []).map((c) => ({
        componentId: c.component.id,
        name: c.component.name,
        code: c.component.code,
        category: c.component.category,
        amount: c.amount,
      }));

      // Fetch approved payable overtime in cut-off range
      const overtimeRequests = await db.overtimeRequest.findMany({
        where: {
          companyId: session.companyId,
          employeeId: emp.id,
          status: "APPROVED",
          compensationType: "PAYABLE",
          date: {
            gte: cutOffStart,
            lte: cutOffEnd,
          },
        },
      });

      // Fetch absent attendance records
      const absentCount = await db.attendance.count({
        where: {
          companyId: session.companyId,
          employeeId: emp.id,
          status: "ABSENT",
          date: {
            gte: cutOffStart,
            lte: cutOffEnd,
          },
        },
      });

      // Fetch approved unpaid leave
      const unpaidLeaves = await db.leaveRequest.findMany({
        where: {
          companyId: session.companyId,
          employeeId: emp.id,
          status: "APPROVED",
          leaveType: { isPaid: false },
          startDate: { lte: cutOffEnd },
          endDate: { gte: cutOffStart },
        },
      });

      const unpaidDays = unpaidLeaves.reduce((acc, l) => acc + (l.durationDays || 1), 0);
      const totalAbsentDays = absentCount + unpaidDays;

      // Compute payroll
      const calculation = computeEmployeePayroll({
        employeeId: emp.id,
        companyId: session.companyId,
        basicSalary,
        taxStatus,
        allowances,
        overtimeRequests,
        absentDays: totalAbsentDays,
        bpjsSettings: settings,
      });

      // Upsert Payslip
      const payslip = await db.payslip.upsert({
        where: {
          employeeId_periodMonth_periodYear: {
            employeeId: emp.id,
            periodMonth: period.month,
            periodYear: period.year,
          },
        },
        update: {
          companyId: session.companyId,
          payrollPeriodId: period.id,
          payrollRunId: run.id,
          basicSalary: calculation.basicSalary,
          grossSalary: calculation.grossSalary,
          totalAllowances: calculation.totalAllowances,
          totalDeductions: calculation.totalDeductions,
          totalBenefits: calculation.totalBenefits,
          netSalary: calculation.netSalary,
          overtimeHours: calculation.overtimeHours,
          overtimePay: calculation.overtimePay,
          attendanceDeduction: calculation.attendanceDeduction,
          lateDeduction: calculation.lateDeduction,
          bpjsKesCompany: calculation.bpjsKesCompany,
          bpjsKesEmployee: calculation.bpjsKesEmployee,
          bpjsTkJkk: calculation.bpjsTkJkk,
          bpjsTkJkm: calculation.bpjsTkJkm,
          bpjsTkJhtCompany: calculation.bpjsTkJhtCompany,
          bpjsTkJhtEmployee: calculation.bpjsTkJhtEmployee,
          bpjsTkJpCompany: calculation.bpjsTkJpCompany,
          bpjsTkJpEmployee: calculation.bpjsTkJpEmployee,
          pph21: calculation.pph21,
          taxCategory: calculation.taxCategory,
          taxRate: calculation.taxRate,
          status: "DRAFT",
        },
        create: {
          companyId: session.companyId,
          employeeId: emp.id,
          payrollPeriodId: period.id,
          payrollRunId: run.id,
          periodMonth: period.month,
          periodYear: period.year,
          basicSalary: calculation.basicSalary,
          grossSalary: calculation.grossSalary,
          totalAllowances: calculation.totalAllowances,
          totalDeductions: calculation.totalDeductions,
          totalBenefits: calculation.totalBenefits,
          netSalary: calculation.netSalary,
          overtimeHours: calculation.overtimeHours,
          overtimePay: calculation.overtimePay,
          attendanceDeduction: calculation.attendanceDeduction,
          lateDeduction: calculation.lateDeduction,
          bpjsKesCompany: calculation.bpjsKesCompany,
          bpjsKesEmployee: calculation.bpjsKesEmployee,
          bpjsTkJkk: calculation.bpjsTkJkk,
          bpjsTkJkm: calculation.bpjsTkJkm,
          bpjsTkJhtCompany: calculation.bpjsTkJhtCompany,
          bpjsTkJhtEmployee: calculation.bpjsTkJhtEmployee,
          bpjsTkJpCompany: calculation.bpjsTkJpCompany,
          bpjsTkJpEmployee: calculation.bpjsTkJpEmployee,
          pph21: calculation.pph21,
          taxCategory: calculation.taxCategory,
          taxRate: calculation.taxRate,
          status: "DRAFT",
        },
      });

      // Clear existing payslip items and recreate
      await db.payslipItem.deleteMany({ where: { payslipId: payslip.id } });
      for (const item of calculation.items) {
        await db.payslipItem.create({
          data: {
            payslipId: payslip.id,
            componentName: item.componentName,
            componentCode: item.componentCode,
            type: item.type,
            amount: item.amount,
            description: item.description,
          },
        });
      }

      // Aggregate totals
      totalGrossPay += calculation.grossSalary;
      totalDeductions += calculation.totalDeductions;
      totalNetPay += calculation.netSalary;
      totalCompanyBpjs += calculation.totalCompanyBpjs;
      totalEmployeeBpjs += calculation.totalEmployeeBpjs;
      totalPph21 += calculation.pph21;
      processedEmployees++;
    }

    // 6. Update Run summary
    const updatedRun = await db.payrollRun.update({
      where: { id: run.id },
      data: {
        totalEmployees: processedEmployees,
        totalGrossPay: Math.round(totalGrossPay),
        totalDeductions: Math.round(totalDeductions),
        totalNetPay: Math.round(totalNetPay),
        totalCompanyBpjs: Math.round(totalCompanyBpjs),
        totalEmployeeBpjs: Math.round(totalEmployeeBpjs),
        totalPph21: Math.round(totalPph21),
      },
    });

    // Update period status
    await db.payrollPeriod.update({
      where: { id: period.id },
      data: { status: "PROCESSING" },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "PROCESS_PAYROLL_RUN",
      recordId: updatedRun.id,
      newValues: {
        periodId: period.id,
        employeesCount: processedEmployees,
        totalNetPay: updatedRun.totalNetPay,
      },
    });

    return NextResponse.json({
      success: true,
      run: updatedRun,
      message: `Berhasil memproses payroll untuk ${processedEmployees} karyawan.`,
    });
  } catch (error: any) {
    console.error("Failed to process payroll run:", error);
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
    const { runId, action } = body; // action: "CONFIRM" | "PUBLISH" | "PAY"

    if (!runId || !action) {
      return NextResponse.json({ error: "runId and action are required" }, { status: 400 });
    }

    const run = await db.payrollRun.findFirst({
      where: { id: runId, companyId: session.companyId },
      include: { period: true, payslips: { include: { employee: true } } },
    });

    if (!run) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    let newRunStatus = run.status;
    let newPeriodStatus = run.period.status;
    let newPayslipStatus = "DRAFT";

    if (action === "CONFIRM") {
      newRunStatus = "CONFIRMED";
    } else if (action === "PUBLISH") {
      newRunStatus = "CONFIRMED";
      newPeriodStatus = "COMPLETED";
      newPayslipStatus = "PUBLISHED";
    } else if (action === "PAY") {
      newRunStatus = "PAID";
      newPeriodStatus = "LOCKED";
      newPayslipStatus = "PAID";
    }

    // Update run
    const updatedRun = await db.payrollRun.update({
      where: { id: run.id },
      data: { status: newRunStatus },
    });

    // Update period
    await db.payrollPeriod.update({
      where: { id: run.periodId },
      data: { status: newPeriodStatus },
    });

    // Update payslips if publishing or paying
    if (action === "PUBLISH" || action === "PAY") {
      await db.payslip.updateMany({
        where: { payrollRunId: run.id },
        data: {
          status: newPayslipStatus,
          publishedAt: new Date(),
        },
      });

      // Send notifications to employees
      for (const p of run.payslips) {
        if (p.employee?.userId) {
          await db.notification.create({
            data: {
              companyId: session.companyId,
              userId: p.employee.userId,
              category: "PAYROLL",
              title: `Slip Gaji ${run.period.name} Tersedia`,
              message: `Slip gaji Anda untuk periode ${run.period.name} telah diterbitkan dengan take-home pay Rp ${p.netSalary.toLocaleString("id-ID")}.`,
              referenceModule: "PAYSLIP",
              referenceId: p.id,
            },
          });
        }
      }
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: `RUN_${action}`,
      recordId: run.id,
      newValues: { action, runStatus: newRunStatus, periodStatus: newPeriodStatus },
    });

    return NextResponse.json({
      success: true,
      run: updatedRun,
      message: `Status payroll run berhasil diperbarui menjadi ${newRunStatus}.`,
    });
  } catch (error: any) {
    console.error("Failed to update payroll run:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
