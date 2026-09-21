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

    const claim = await db.reimbursement.findFirst({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
            user: { select: { email: true, name: true } },
          },
        },
        items: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Klaim reimbursement tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error: any) {
    console.error("GET /api/v1/claims/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch claim" }, { status: 500 });
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

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN") || session.roles.includes("FINANCE");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR atau Keuangan yang dapat mengubah status klaim" }, { status: 403 });
    }

    const existingClaim = await db.reimbursement.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingClaim) {
      return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { action, approvedAmount, rejectionReason, paymentMethod, paymentReference } = body;

    const updateData: any = {};

    if (action === "APPROVE") {
      updateData.status = "APPROVED";
      updateData.approvedAmount = approvedAmount !== undefined ? Number(approvedAmount) : existingClaim.totalAmount;
      updateData.approvedAt = new Date();
      updateData.approvedBy = session.name || session.email;
      updateData.rejectionReason = null;
    } else if (action === "REJECT") {
      updateData.status = "REJECTED";
      updateData.rejectionReason = rejectionReason || "Klaim tidak memenuhi kebijakan perusahaan";
      updateData.approvedAt = null;
      updateData.approvedBy = session.name || session.email;
    } else if (action === "PAY" || action === "DISBURSE") {
      updateData.status = "PAID";
      updateData.paidAt = new Date();
      updateData.paymentMethod = paymentMethod || "BANK_TRANSFER";
      updateData.paymentReference = paymentReference || `TRF-${Date.now().toString().slice(-6)}`;
      if (!existingClaim.approvedAmount) {
        updateData.approvedAmount = existingClaim.totalAmount;
      }
    } else {
      return NextResponse.json({ error: "Aksi tidak valid (gunakan APPROVE, REJECT, atau PAY)" }, { status: 400 });
    }

    const updated = await db.reimbursement.update({
      where: { id: params.id },
      data: updateData,
      include: { items: true, employee: true },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "REIMBURSEMENT",
      action: `CLAIM_${action}`,
      recordId: params.id,
      oldValues: { status: existingClaim.status },
      newValues: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Status klaim berhasil diperbarui menjadi ${updateData.status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/claims/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update claim" }, { status: 500 });
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

    const existingClaim = await db.reimbursement.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingClaim) {
      return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
    }

    if (existingClaim.status !== "PENDING") {
      return NextResponse.json({ error: "Hanya klaim berstatus PENDING yang dapat dibatalkan" }, { status: 400 });
    }

    await db.reimbursement.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "REIMBURSEMENT",
      action: "DELETE_CLAIM",
      recordId: params.id,
      oldValues: { claimNumber: existingClaim.claimNumber },
    });

    return NextResponse.json({
      success: true,
      message: "Klaim berhasil dihapus / dibatalkan",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/claims/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete claim" }, { status: 500 });
  }
}
