import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Retrieve employee with complete relation
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        department: true,
        division: true,
        position: true,
        location: true,
        manager: { select: { id: true, firstName: true, lastName: true, employeeIdNumber: true } },
        personalData: true,
        timeline: { orderBy: { eventDate: "desc" } },
        leaveBalances: { include: { leaveType: true } },
        documents: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    // STRICT TENANT ISOLATION CHECK
    if (session.companyId && employee.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden. Data berada di luar tenant Anda." }, { status: 403 });
    }

    // Check permission or self-service
    const isSelf = session.employeeId === employee.id;
    if (!isSelf && !hasPermission(session, "employee.view")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat detail karyawan." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    // Strict Tenant Isolation
    if (session.companyId && employee.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!hasPermission(session, "employee.edit")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    const updated = await db.employee.update({
      where: { id },
      data: {
        firstName: body.firstName ?? employee.firstName,
        lastName: body.lastName ?? employee.lastName,
        departmentId: body.departmentId ?? employee.departmentId,
        positionId: body.positionId ?? employee.positionId,
        locationId: body.locationId ?? employee.locationId,
        employmentStatus: body.employmentStatus ?? employee.employmentStatus,
        employmentType: body.employmentType ?? employee.employmentType,
        personalData: {
          upsert: {
            create: {
              phone: body.phone,
              gender: body.gender,
              address: body.address,
              bankName: body.bankName,
              bankAccountNumber: body.bankAccountNumber,
              bankAccountHolder: body.bankAccountHolder,
              npwp: body.npwp,
              bpjsKesehatan: body.bpjsKesehatan,
              bpjsKetenagakerjaan: body.bpjsKetenagakerjaan,
            },
            update: {
              phone: body.phone,
              gender: body.gender,
              address: body.address,
              bankName: body.bankName,
              bankAccountNumber: body.bankAccountNumber,
              bankAccountHolder: body.bankAccountHolder,
              npwp: body.npwp,
              bpjsKesehatan: body.bpjsKesehatan,
              bpjsKetenagakerjaan: body.bpjsKetenagakerjaan,
            },
          },
        },
      },
      include: {
        personalData: true,
        department: true,
        position: true,
      },
    });

    await recordAuditLog({
      companyId: employee.companyId,
      userId: session.userId,
      module: "EMPLOYEE",
      action: "UPDATE",
      recordId: employee.id,
      newValues: body,
    });

    return NextResponse.json({ success: true, message: "Data karyawan diperbarui.", data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memperbarui karyawan." }, { status: 500 });
  }
}