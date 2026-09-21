import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import {
  generateLetterNumber,
  generateQrVerificationToken,
  LETTER_TYPES,
} from "@/lib/letters-service-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    let employeeId = searchParams.get("employeeId");

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    if (!isHr) {
      const emp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });
      if (!emp) {
        return NextResponse.json({ error: "Profil karyawan tidak ditemukan" }, { status: 404 });
      }
      employeeId = emp.id;
    }

    const where: any = { companyId: session.companyId };
    if (employeeId && employeeId !== "ALL") {
      where.employeeId = employeeId;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (status && status !== "ALL") {
      where.status = status;
    } else if (!isHr) {
      // Non-HR can only see published letters
      where.status = "PUBLISHED";
    }

    const letters = await db.employeeLetter.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeIdNumber: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            joinDate: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalLetters = letters.length;
    const publishedCount = letters.filter((l) => l.status === "PUBLISHED").length;

    return NextResponse.json({
      success: true,
      data: letters,
      summary: {
        totalLetters,
        publishedCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/letters error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch letters" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang berwenang menerbitkan surat resmi perusahaan" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId,
      type = "SK_AKTIF_KERJA",
      title,
      purpose,
      effectiveDate,
      validUntil,
      signerName = "Hendra Setiawan, S.H.",
      signerPosition = "Head of Human Capital & Operations",
      signerNik = "NIK-HR-001",
      contentData,
    } = body;

    if (!employeeId || !title) {
      return NextResponse.json({ error: "Pilih karyawan dan judul surat resmi" }, { status: 400 });
    }

    const employee = await db.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId },
      include: { company: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
    }

    // Count letters this year to generate sequential number
    const count = await db.employeeLetter.count({
      where: { companyId: session.companyId },
    });
    const letterNumber = generateLetterNumber(count + 1, type, employee.company.code || "KMS");
    const qrCodeVerification = generateQrVerificationToken(letterNumber, employee.employeeIdNumber);

    const newLetter = await db.employeeLetter.create({
      data: {
        companyId: session.companyId,
        employeeId,
        letterNumber,
        type,
        title,
        purpose: purpose || "Keperluan Administrasi Kepegawaian",
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        signerName,
        signerPosition,
        signerNik,
        contentData: contentData ? JSON.stringify(contentData) : null,
        status: "PUBLISHED",
        qrCodeVerification,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OFFICIAL_LETTERS",
      action: "ISSUE_LETTER",
      recordId: newLetter.id,
      newValues: { letterNumber, type, employeeIdNumber: employee.employeeIdNumber },
    });

    return NextResponse.json({
      success: true,
      message: `Surat resmi ${letterNumber} berhasil diterbitkan`,
      data: newLetter,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/letters error:", error);
    return NextResponse.json({ error: error.message || "Failed to create letter" }, { status: 500 });
  }
}
