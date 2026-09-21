import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await db.hrServiceRequest.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
            user: { select: { email: true, name: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("GET /api/v1/services/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    const existingTicket = await db.hrServiceRequest.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { status, assignedTo, resolutionNotes } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
      if (status === "CLOSED") {
        updateData.closedAt = new Date();
      }
    }
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }
    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }

    const updated = await db.hrServiceRequest.update({
      where: { id: params.id },
      data: updateData,
      include: { employee: true, comments: true },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "HR_SERVICE_DESK",
      action: "UPDATE_TICKET_STATUS",
      recordId: params.id,
      oldValues: { status: existingTicket.status },
      newValues: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Status tiket berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/services/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingTicket = await db.hrServiceRequest.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    await db.hrServiceRequest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Tiket berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/services/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete ticket" }, { status: 500 });
  }
}
