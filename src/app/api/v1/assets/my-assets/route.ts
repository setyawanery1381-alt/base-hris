import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await db.employee.findFirst({
      where: { companyId: session.companyId, userId: session.userId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Profil karyawan tidak ditemukan" }, { status: 404 });
    }

    const assignments = await db.assetAssignment.findMany({
      where: {
        companyId: session.companyId,
        employeeId: employee.id,
        status: "ACTIVE",
      },
      include: {
        asset: true,
      },
      orderBy: { assignedDate: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: assignments.map((a) => ({
        assignmentId: a.id,
        assignedDate: a.assignedDate,
        expectedReturnDate: a.expectedReturnDate,
        handoverCondition: a.handoverCondition,
        handoverNotes: a.handoverNotes,
        asset: a.asset,
      })),
      count: assignments.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/assets/my-assets error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch my assets" }, { status: 500 });
  }
}
