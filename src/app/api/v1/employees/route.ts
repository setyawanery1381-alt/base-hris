import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employee.view")) {
      return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin melihat data karyawan." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || undefined;
    const status = searchParams.get("status") || undefined;

    // Strict Tenant Isolation: Only get employees within user's company
    // If Super Admin has no companyId, they can pass tenantId in query
    const targetCompanyId = session.companyId || searchParams.get("companyId");
    if (!targetCompanyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const employees = await db.employee.findMany({
      where: {
        companyId: targetCompanyId,
        deletedAt: null,
        ...(status ? { employmentStatus: status } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { employeeIdNumber: { contains: search } },
            { user: { email: { contains: search } } },
          ],
        } : {}),
      },
      include: {
        department: true,
        position: true,
        location: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (err: any) {
    console.error("GET Employees Error:", err);
    return NextResponse.json({ error: "Gagal memuat data karyawan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employee.create")) {
      return NextResponse.json({ error: "Akses ditolak. Anda tidak memiliki izin menambah karyawan." }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      employeeIdNumber,
      departmentId,
      positionId,
      locationId,
      joinDate,
      employmentStatus,
      employmentType,
      phone,
      gender,
      bankName,
      bankAccountNumber,
      roleName = "EMPLOYEE",
    } = body;

    const targetCompanyId = session.companyId || body.companyId;
    if (!targetCompanyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    // Check duplicate employee ID in this tenant
    const existingEmp = await db.employee.findUnique({
      where: {
        companyId_employeeIdNumber: {
          companyId: targetCompanyId,
          employeeIdNumber,
        },
      },
    });
    if (existingEmp) {
      return NextResponse.json({ error: `Nomor Induk Karyawan '${employeeIdNumber}' sudah digunakan.` }, { status: 400 });
    }

    // Check duplicate email
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json({ error: `Email '${email}' sudah terdaftar dalam sistem.` }, { status: 400 });
    }

    // Find role
    let role = await db.role.findFirst({
      where: { name: roleName },
    });
    if (!role) {
      role = await db.role.findFirst({ where: { name: "EMPLOYEE" } });
    }

    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    // Create User & Employee in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          companyId: targetCompanyId,
          email: email.toLowerCase().trim(),
          passwordHash: hashedPassword,
          name: `${firstName} ${lastName}`,
          status: "ACTIVE",
          roles: role ? { create: { roleId: role.id } } : undefined,
        },
      });

      // 2. Create Employee
      const employee = await tx.employee.create({
        data: {
          companyId: targetCompanyId,
          userId: user.id,
          employeeIdNumber,
          firstName,
          lastName,
          departmentId: departmentId || null,
          positionId: positionId || null,
          locationId: locationId || null,
          joinDate: new Date(joinDate || Date.now()),
          employmentStatus: employmentStatus || "PROBATION",
          employmentType: employmentType || "FULL_TIME",
          personalData: {
            create: {
              phone,
              gender,
              bankName,
              bankAccountNumber,
            },
          },
        },
        include: {
          personalData: true,
          department: true,
          position: true,
          location: true,
        },
      });

      // 3. Auto-initialize Leave Balances for current year
      const currentYear = new Date().getFullYear();
      const leaveTypes = await tx.leaveType.findMany({
        where: { companyId: targetCompanyId },
      });

      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            companyId: targetCompanyId,
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: currentYear,
            entitlement: lt.defaultEntitlement,
            used: 0,
            remaining: lt.defaultEntitlement,
          },
        });
      }

      // 4. Record Initial Timeline Event: JOIN
      await tx.employeeEmploymentHistory.create({
        data: {
          companyId: targetCompanyId,
          employeeId: employee.id,
          eventType: "JOIN",
          eventDate: new Date(joinDate || Date.now()),
          title: "Bergabung dengan Perusahaan",
          description: `Memulai karir sebagai ${employee.position?.name || "Karyawan"} di Departemen ${employee.department?.name || "-"}`,
        },
      });

      return employee;
    });

    // Audit Log
    await recordAuditLog({
      companyId: targetCompanyId,
      userId: session.userId,
      module: "EMPLOYEE",
      action: "CREATE",
      recordId: result.id,
      newValues: { employeeIdNumber, name: `${firstName} ${lastName}`, email },
    });

    return NextResponse.json({
      success: true,
      message: "Karyawan baru berhasil ditambahkan!",
      data: result,
    });
  } catch (err: any) {
    console.error("POST Employee Error:", err);
    return NextResponse.json({ error: "Gagal menyimpan data karyawan: " + err.message }, { status: 500 });
  }
}