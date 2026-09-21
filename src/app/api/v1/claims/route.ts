import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateClaimNumber, calculateClaimTotal } from "@/lib/claims-assets-engine";

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
    let employeeId = searchParams.get("employeeId");

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    // If regular employee, force employeeId to own employee record
    if (!isHr) {
      const emp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });
      if (!emp) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }
      employeeId = emp.id;
    }

    const where: any = {
      companyId: session.companyId,
    };

    if (employeeId && employeeId !== "ALL") {
      where.employeeId = employeeId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    const claims = await db.reimbursement.findMany({
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
        items: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAmount = claims.reduce((acc, c) => acc + c.totalAmount, 0);
    const approvedAmount = claims.filter((c) => c.status === "APPROVED" || c.status === "PAID").reduce((acc, c) => acc + (c.approvedAmount || c.totalAmount), 0);
    const pendingCount = claims.filter((c) => c.status === "PENDING").length;

    return NextResponse.json({
      success: true,
      data: claims,
      summary: {
        totalClaims: claims.length,
        pendingCount,
        totalAmount,
        approvedAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/claims error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch claims" }, { status: 500 });
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
      title,
      category = "GENERAL",
      description,
      receiptUrl,
      items = [],
      bankName,
      bankAccountNumber,
      bankAccountHolder,
    } = body;

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    let targetEmployeeId = body.employeeId;

    if (!isHr || !targetEmployeeId) {
      const selfEmp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });
      if (!selfEmp) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 400 });
      }
      targetEmployeeId = selfEmp.id;
    }

    if (!title) {
      return NextResponse.json({ error: "Judul pengajuan klaim wajib diisi" }, { status: 400 });
    }

    // Determine total amount
    let computedTotal = 0;
    if (items && Array.isArray(items) && items.length > 0) {
      computedTotal = calculateClaimTotal(items);
    } else if (body.totalAmount || body.amount) {
      computedTotal = Number(body.totalAmount || body.amount);
    }

    if (computedTotal <= 0) {
      return NextResponse.json({ error: "Total klaim harus lebih besar dari 0" }, { status: 400 });
    }

    // Generate claim number
    const count = await db.reimbursement.count({
      where: { companyId: session.companyId },
    });
    const claimNumber = generateClaimNumber(count + 1);

    const newClaim = await db.reimbursement.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        claimNumber,
        title,
        category,
        totalAmount: computedTotal,
        description,
        receiptUrl: receiptUrl || (items.length > 0 ? items[0].receiptUrl : null),
        status: "PENDING",
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        items: {
          create: items && items.length > 0
            ? items.map((item: any) => ({
                date: item.date ? new Date(item.date) : new Date(),
                category: item.category || category,
                amount: Number(item.amount) || 0,
                merchantName: item.merchantName || null,
                receiptNumber: item.receiptNumber || null,
                receiptUrl: item.receiptUrl || null,
                description: item.description || null,
              }))
            : [
                {
                  date: new Date(),
                  category: category,
                  amount: computedTotal,
                  receiptUrl: receiptUrl || null,
                  description: description || title,
                },
              ],
        },
      },
      include: {
        items: true,
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "REIMBURSEMENT",
      action: "SUBMIT_CLAIM",
      recordId: newClaim.id,
      newValues: { claimNumber, title, totalAmount: computedTotal },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan reimbursement berhasil dikirim",
      data: newClaim,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/claims error:", error);
    return NextResponse.json({ error: error.message || "Failed to create claim" }, { status: 500 });
  }
}
