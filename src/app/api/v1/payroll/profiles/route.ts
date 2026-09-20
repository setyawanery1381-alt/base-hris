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

    const isAuthorized =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("FINANCE") ||
      session.roles.includes("MANAGER");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId");
    const employeeId = searchParams.get("employeeId");

    const empWhere: any = {
      companyId: session.companyId,
    };

    if (employeeId) {
      empWhere.id = employeeId;
    }

    if (departmentId && departmentId !== "ALL") {
      empWhere.departmentId = departmentId;
    }

    if (search) {
      empWhere.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeIdNumber: { contains: search } },
      ];
    }

    const employees = await db.employee.findMany({
      where: empWhere,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        personalData: true,
        salaryProfile: {
          include: {
            components: {
              include: {
                component: true,
              },
            },
          },
        },
      },
      orderBy: { employeeIdNumber: "asc" },
    });

    const profiles = employees.map((emp) => {
      const sp = emp.salaryProfile;
      return {
        employeeId: emp.id,
        employeeIdNumber: emp.employeeIdNumber,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        department: emp.department?.name || "-",
        position: emp.position?.name || "-",
        hasProfile: Boolean(sp),
        profileId: sp?.id || null,
        basicSalary: sp?.basicSalary || 0,
        paymentType: sp?.paymentType || "MONTHLY",
        taxStatus: sp?.taxStatus || "TK/0",
        bankName: sp?.bankName || emp.personalData?.bankName || "BCA",
        bankAccountNumber: sp?.bankAccountNumber || emp.personalData?.bankAccountNumber || "-",
        bankAccountHolder: sp?.bankAccountHolder || emp.personalData?.bankAccountHolder || `${emp.firstName} ${emp.lastName}`,
        npwp: sp?.npwp || emp.personalData?.npwp || "-",
        bpjsKesehatanNumber: sp?.bpjsKesehatanNumber || emp.personalData?.bpjsKesehatan || "-",
        bpjsKetenagakerjaanNumber: sp?.bpjsKetenagakerjaanNumber || emp.personalData?.bpjsKetenagakerjaan || "-",
        components: sp?.components || [],
      };
    });

    return NextResponse.json({ profiles });
  } catch (error: any) {
    console.error("Failed to fetch salary profiles:", error);
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
      employeeId,
      basicSalary,
      paymentType = "MONTHLY",
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      taxStatus = "TK/0",
      npwp,
      bpjsKesehatanNumber,
      bpjsKetenagakerjaanNumber,
      components = [], // [{ salaryComponentId: string, amount: number }]
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Verify employee belongs to company
    const employee = await db.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found in company" }, { status: 404 });
    }

    // Upsert salary profile
    const profile = await db.employeeSalaryProfile.upsert({
      where: { employeeId },
      update: {
        basicSalary: Number(basicSalary) || 0,
        paymentType,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        taxStatus,
        npwp,
        bpjsKesehatanNumber,
        bpjsKetenagakerjaanNumber,
      },
      create: {
        companyId: session.companyId,
        employeeId,
        basicSalary: Number(basicSalary) || 0,
        paymentType,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        taxStatus,
        npwp,
        bpjsKesehatanNumber,
        bpjsKetenagakerjaanNumber,
      },
    });

    // Update assigned components if provided
    if (Array.isArray(components)) {
      // Remove previous components and insert new ones
      await db.employeeSalaryComponent.deleteMany({
        where: { employeeSalaryProfileId: profile.id },
      });

      for (const comp of components) {
        if (comp.salaryComponentId && comp.amount > 0) {
          await db.employeeSalaryComponent.create({
            data: {
              companyId: session.companyId,
              employeeSalaryProfileId: profile.id,
              salaryComponentId: comp.salaryComponentId,
              amount: Number(comp.amount),
              isActive: true,
            },
          });
        }
      }
    }

    // Also update EmployeePersonalData for consistency
    await db.employeePersonalData.upsert({
      where: { employeeId },
      update: {
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        npwp,
        bpjsKesehatan: bpjsKesehatanNumber,
        bpjsKetenagakerjaan: bpjsKetenagakerjaanNumber,
      },
      create: {
        employeeId,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        npwp,
        bpjsKesehatan: bpjsKesehatanNumber,
        bpjsKetenagakerjaan: bpjsKetenagakerjaanNumber,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "UPDATE_SALARY_PROFILE",
      recordId: profile.id,
      newValues: { employeeId, basicSalary, taxStatus, bankName, bankAccountNumber, componentsCount: components.length },
    });

    return NextResponse.json({ profile, success: true });
  } catch (error: any) {
    console.error("Failed to save employee salary profile:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
