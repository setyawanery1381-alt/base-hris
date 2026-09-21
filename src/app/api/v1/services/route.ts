import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateTicketNumber } from "@/lib/letters-service-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
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
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    const tickets = await db.hrServiceRequest.findMany({
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
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalTickets = tickets.length;
    const submittedCount = tickets.filter((t) => t.status === "SUBMITTED").length;
    const inProgressCount = tickets.filter((t) => t.status === "IN_REVIEW" || t.status === "IN_PROGRESS").length;
    const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

    return NextResponse.json({
      success: true,
      data: tickets,
      summary: {
        totalTickets,
        submittedCount,
        inProgressCount,
        resolvedCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/services error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tickets" }, { status: 500 });
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
      category = "GENERAL",
      priority = "MEDIUM",
      subject,
      description,
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

    if (!subject || !description) {
      return NextResponse.json({ error: "Subjek dan penjelasan permohonan wajib diisi" }, { status: 400 });
    }

    const count = await db.hrServiceRequest.count({
      where: { companyId: session.companyId },
    });
    const ticketNumber = generateTicketNumber(count + 1);

    const newTicket = await db.hrServiceRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        ticketNumber,
        category,
        priority,
        subject,
        description,
        status: "SUBMITTED",
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "HR_SERVICE_DESK",
      action: "CREATE_TICKET",
      recordId: newTicket.id,
      newValues: { ticketNumber, category, priority, subject },
    });

    return NextResponse.json({
      success: true,
      message: `Tiket bantuan ${ticketNumber} berhasil dibuat`,
      data: newTicket,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/services error:", error);
    return NextResponse.json({ error: error.message || "Failed to create ticket" }, { status: 500 });
  }
}
