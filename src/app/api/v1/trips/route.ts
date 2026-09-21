import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import {
  generateTripNumber,
  calculateTripDuration,
  calculatePerDiemTotal,
} from "@/lib/claims-assets-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const settlementStatus = searchParams.get("settlementStatus");
    let employeeId = searchParams.get("employeeId");

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    if (!isHr) {
      const emp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });
      if (!emp) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }
      employeeId = emp.id;
    }

    const where: any = { companyId: session.companyId };
    if (employeeId && employeeId !== "ALL") {
      where.employeeId = employeeId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (settlementStatus && settlementStatus !== "ALL") {
      where.settlementStatus = settlementStatus;
    }

    const trips = await db.businessTrip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeIdNumber: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
        expenses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalTrips = trips.length;
    const activeTrips = trips.filter((t) => t.status === "APPROVED" || t.status === "DISBURSED").length;
    const pendingCount = trips.filter((t) => t.status === "PENDING").length;
    const totalCashAdvance = trips.reduce((acc, t) => acc + (t.disbursedCashAdvance || t.cashAdvance || 0), 0);

    return NextResponse.json({
      success: true,
      data: trips,
      summary: {
        totalTrips,
        activeTrips,
        pendingCount,
        totalCashAdvance,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/trips error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      purpose,
      origin,
      destination,
      startDate,
      endDate,
      transportType = "FLIGHT",
      accommodation,
      perDiemRate = 0,
      cashAdvance = 0,
      notes,
    } = body;

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    let targetEmployeeId = body.employeeId;

    if (!isHr || !targetEmployeeId) {
      const selfEmp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });
      if (!selfEmp) {
        return NextResponse.json({ error: "Profil karyawan tidak ditemukan" }, { status: 400 });
      }
      targetEmployeeId = selfEmp.id;
    }

    if (!purpose || !origin || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Tujuan, kota asal, kota destinasi, tanggal berangkat dan kembali wajib diisi" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json({ error: "Tanggal kembali tidak boleh lebih awal dari tanggal berangkat" }, { status: 400 });
    }

    const durationDays = calculateTripDuration(start, end);
    const totalPerDiem = calculatePerDiemTotal(durationDays, Number(perDiemRate) || 0);

    // Count trips for numbering
    const count = await db.businessTrip.count({
      where: { companyId: session.companyId },
    });
    const tripNumber = generateTripNumber(count + 1);

    const newTrip = await db.businessTrip.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        tripNumber,
        purpose,
        origin,
        destination,
        startDate: start,
        endDate: end,
        durationDays,
        transportType,
        accommodation: accommodation || null,
        perDiemRate: Number(perDiemRate) || 0,
        totalPerDiem,
        cashAdvance: Number(cashAdvance) || 0,
        status: isHr && body.autoApprove ? "APPROVED" : "PENDING",
        approvedAt: isHr && body.autoApprove ? new Date() : null,
        approvedBy: isHr && body.autoApprove ? session.name || session.email : null,
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeIdNumber: true,
            department: true,
            position: true,
          },
        },
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "BUSINESS_TRIP",
      action: "CREATE_SPPD",
      recordId: newTrip.id,
      newValues: { tripNumber, destination, durationDays, cashAdvance },
    });

    return NextResponse.json({
      success: true,
      message: "Surat Perintah Perjalanan Dinas (SPPD) berhasil diajukan",
      data: newTrip,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/trips error:", error);
    return NextResponse.json({ error: error.message || "Failed to create trip" }, { status: 500 });
  }
}
