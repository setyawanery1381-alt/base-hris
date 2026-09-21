import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      candidateId,
      offeredPosition,
      offeredSalary,
      allowanceDetails,
      startDate,
      expiryDate,
      notes,
    } = body;

    if (!candidateId || !offeredPosition || !offeredSalary || !startDate) {
      return NextResponse.json({ error: "Data penawaran kerja wajib diisi lengkap" }, { status: 400 });
    }

    const offer = await db.jobOffer.create({
      data: {
        candidateId,
        offeredPosition,
        offeredSalary: Number(offeredSalary),
        allowanceDetails,
        startDate: new Date(startDate),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "SENT",
        notes,
      },
    });

    // Update candidate stage to OFFERING
    await db.jobCandidate.update({
      where: { id: candidateId },
      data: { stage: "OFFERING" },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "CREATE_JOB_OFFER",
      recordId: offer.id,
      newValues: { candidateId, offeredPosition, offeredSalary },
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/recruitment/offers error:", err);
    return NextResponse.json({ error: err.message || "Failed to create offer" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Offer ID and status required" }, { status: 400 });
    }

    const offer = await db.jobOffer.update({
      where: { id },
      data: { status },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "RECRUITMENT",
      action: "UPDATE_JOB_OFFER_STATUS",
      recordId: offer.id,
      newValues: { status },
    });

    return NextResponse.json({ offer });
  } catch (err: any) {
    console.error("PATCH /api/v1/recruitment/offers error:", err);
    return NextResponse.json({ error: err.message || "Failed to update offer" }, { status: 500 });
  }
}
