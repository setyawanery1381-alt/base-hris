import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";
import {
  generateSampleCsvString,
  generateSampleExcelBuffer,
  parseRawImportRows,
  ParsedEmployeeRow,
} from "@/lib/employee-import";

// GET: Download sample template (CSV or Excel)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";

    if (format === "xlsx" || format === "excel") {
      const buffer = generateSampleExcelBuffer();
      return new Response(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="Template_Import_Karyawan_BASE_HRIS.xlsx"',
        },
      });
    }

    // Default CSV
    const csvData = generateSampleCsvString();
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="Template_Import_Karyawan_BASE_HRIS.csv"',
      },
    });
  } catch (err: any) {
    console.error("Download Template Error:", err);
    return NextResponse.json(
      { error: "Gagal mengunduh template." },
      { status: 500 }
    );
  }
}

// POST: Bulk import employees
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "employee.create")) {
      return NextResponse.json(
        { error: "Akses ditolak. Anda tidak memiliki izin menambah karyawan." },
        { status: 403 }
      );
    }

    const targetCompanyId = session.companyId;
    if (!targetCompanyId) {
      return NextResponse.json(
        { error: "Company ID tidak ditemukan dalam sesi login." },
        { status: 400 }
      );
    }

    const body = await req.json();
    let rowsToImport: ParsedEmployeeRow[] = [];

    if (Array.isArray(body.employees)) {
      rowsToImport = body.employees;
    } else if (Array.isArray(body.rawRows)) {
      rowsToImport = parseRawImportRows(body.rawRows);
    } else {
      return NextResponse.json(
        { error: "Format request tidak valid. 'employees' array diperlukan." },
        { status: 400 }
      );
    }

    if (rowsToImport.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data karyawan untuk diimpor." },
        { status: 400 }
      );
    }

    // 1. Fetch existing employees & users to detect duplicates
    const [existingEmployees, existingUsers, departments, positions, leaveTypes, defaultRole] =
      await Promise.all([
        db.employee.findMany({
          where: { companyId: targetCompanyId, deletedAt: null },
          select: { employeeIdNumber: true },
        }),
        db.user.findMany({
          select: { email: true },
        }),
        db.department.findMany({
          where: { companyId: targetCompanyId, deletedAt: null },
        }),
        db.position.findMany({
          where: { companyId: targetCompanyId },
        }),
        db.leaveType.findMany({
          where: { companyId: targetCompanyId },
        }),
        db.role.findFirst({
          where: { name: "EMPLOYEE" },
        }),
      ]);

    const existingNikSet = new Set(
      existingEmployees.map((e) => e.employeeIdNumber.toUpperCase())
    );
    const existingEmailSet = new Set(
      existingUsers.map((u) => u.email.toLowerCase().trim())
    );

    // Map departments & positions by normalized name
    const deptMap = new Map<string, any>();
    departments.forEach((d) => {
      deptMap.set(d.name.toLowerCase().trim(), d);
      deptMap.set(d.code.toLowerCase().trim(), d);
    });

    const posMap = new Map<string, any>();
    positions.forEach((p) => {
      posMap.set(p.name.toLowerCase().trim(), p);
    });

    // Validate rows against DB
    const validRows: ParsedEmployeeRow[] = [];
    const rejectedRows: Array<{ rowNumber: number; nik: string; email: string; reason: string }> = [];

    for (const row of rowsToImport) {
      if (!row.employeeIdNumber || !row.firstName || !row.email) {
        rejectedRows.push({
          rowNumber: row.rowNumber || 0,
          nik: row.employeeIdNumber || "-",
          email: row.email || "-",
          reason: "Data wajib belum lengkap (NIK, Nama Depan, atau Email kosong).",
        });
        continue;
      }

      if (existingNikSet.has(row.employeeIdNumber.toUpperCase())) {
        rejectedRows.push({
          rowNumber: row.rowNumber || 0,
          nik: row.employeeIdNumber,
          email: row.email,
          reason: `NIK '${row.employeeIdNumber}' sudah terdaftar dalam sistem perusahaan.`,
        });
        continue;
      }

      if (existingEmailSet.has(row.email.toLowerCase().trim())) {
        rejectedRows.push({
          rowNumber: row.rowNumber || 0,
          nik: row.employeeIdNumber,
          email: row.email,
          reason: `Email '${row.email}' sudah terdaftar dalam sistem pengguna.`,
        });
        continue;
      }

      // Add to sets to avoid intra-batch duplicates
      existingNikSet.add(row.employeeIdNumber.toUpperCase());
      existingEmailSet.add(row.email.toLowerCase().trim());
      validRows.push(row);
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Semua baris data gagal divalidasi.",
          importedCount: 0,
          rejectedCount: rejectedRows.length,
          rejected: rejectedRows,
        },
        { status: 400 }
      );
    }

    const defaultPasswordHash = await bcrypt.hash("password123", 10);
    const currentYear = new Date().getFullYear();

    // 2. Perform transaction to insert all valid records
    const createdEmployees = await db.$transaction(async (tx) => {
      const results = [];

      for (const row of validRows) {
        // Resolve Department
        let deptId: string | null = null;
        if (row.departmentName) {
          const normDept = row.departmentName.toLowerCase().trim();
          let dept = deptMap.get(normDept);
          if (!dept) {
            // Auto create department
            const deptCode = normDept.substring(0, 4).toUpperCase();
            dept = await tx.department.create({
              data: {
                companyId: targetCompanyId,
                name: row.departmentName.trim(),
                code: deptCode,
              },
            });
            deptMap.set(normDept, dept);
          }
          deptId = dept.id;
        }

        // Resolve Position
        let posId: string | null = null;
        if (row.positionName) {
          const normPos = row.positionName.toLowerCase().trim();
          let pos = posMap.get(normPos);
          if (!pos) {
            // Auto create position
            pos = await tx.position.create({
              data: {
                companyId: targetCompanyId,
                departmentId: deptId,
                name: row.positionName.trim(),
                level: 1,
              },
            });
            posMap.set(normPos, pos);
          }
          posId = pos.id;
        }

        const fullName = `${row.firstName} ${row.lastName || ""}`.trim();
        const joinDate = new Date(row.joinDate || Date.now());

        // A. Create User
        const user = await tx.user.create({
          data: {
            companyId: targetCompanyId,
            email: row.email.toLowerCase().trim(),
            passwordHash: defaultPasswordHash,
            name: fullName,
            status: "ACTIVE",
            roles: defaultRole
              ? {
                  create: {
                    roleId: defaultRole.id,
                  },
                }
              : undefined,
          },
        });

        // B. Create Employee
        const employee = await tx.employee.create({
          data: {
            companyId: targetCompanyId,
            userId: user.id,
            employeeIdNumber: row.employeeIdNumber.trim(),
            firstName: row.firstName.trim(),
            lastName: (row.lastName || "").trim(),
            departmentId: deptId,
            positionId: posId,
            joinDate: joinDate,
            employmentStatus: row.employmentStatus || "PROBATION",
            employmentType: row.employmentType || "FULL_TIME",
            personalData: {
              create: {
                phone: row.phone || null,
                gender: row.gender || "MALE",
                idCardNumber: row.idCardNumber || null,
                npwp: row.npwp || null,
                bpjsKesehatan: row.bpjsKesehatan || null,
                bpjsKetenagakerjaan: row.bpjsKetenagakerjaan || null,
                bankName: row.bankName || null,
                bankAccountNumber: row.bankAccountNumber || null,
                bankAccountHolder: fullName,
              },
            },
            salaryProfile: {
              create: {
                companyId: targetCompanyId,
                basicSalary: row.basicSalary || 0,
                taxStatus: row.taxStatus || "TK/0",
                idCardNumber: row.idCardNumber || null,
                npwp: row.npwp || null,
                bpjsKesehatanNumber: row.bpjsKesehatan || null,
                bpjsKetenagakerjaanNumber: row.bpjsKetenagakerjaan || null,
                bankName: row.bankName || null,
                bankAccountNumber: row.bankAccountNumber || null,
                bankAccountHolder: fullName,
              },
            },
          },
          include: {
            department: true,
            position: true,
          },
        });

        // C. Initialize Leave Balances
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

        // D. Create Initial History Event
        await tx.employeeEmploymentHistory.create({
          data: {
            companyId: targetCompanyId,
            employeeId: employee.id,
            eventType: "JOIN",
            eventDate: joinDate,
            title: "Bergabung dengan Perusahaan",
            description: `Diimpor melalui CSV/Excel ke Departemen ${
              employee.department?.name || "-"
            } sebagai ${employee.position?.name || "-"}`,
          },
        });

        results.push({
          id: employee.id,
          employeeIdNumber: employee.employeeIdNumber,
          name: fullName,
          email: user.email,
          department: employee.department?.name || "-",
          position: employee.position?.name || "-",
        });
      }

      return results;
    });

    // 3. Record Audit Log
    await recordAuditLog({
      companyId: targetCompanyId,
      userId: session.userId,
      module: "EMPLOYEE",
      action: "IMPORT_BULK",
      recordId: targetCompanyId,
      newValues: {
        totalImported: createdEmployees.length,
        rejectedCount: rejectedRows.length,
        sampleEmployees: createdEmployees.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${createdEmployees.length} data karyawan!`,
      importedCount: createdEmployees.length,
      rejectedCount: rejectedRows.length,
      imported: createdEmployees,
      rejected: rejectedRows,
    });
  } catch (err: any) {
    console.error("POST Bulk Import Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses impor karyawan: " + err.message },
      { status: 500 }
    );
  }
}
