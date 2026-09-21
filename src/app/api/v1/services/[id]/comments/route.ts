import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

    const comments = await db.hrServiceComment.findMany({
      where: { serviceRequestId: params.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (error: any) {
    console.error("GET /api/v1/services/[id]/comments error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
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
    });

    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { message, attachmentUrl } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Pesan komentar tidak boleh kosong" }, { status: 400 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    const authorRole = isHr ? "HR" : "EMPLOYEE";
    const authorName = session.name || session.email || (isHr ? "Tim HR Admin" : "Karyawan");

    const newComment = await db.hrServiceComment.create({
      data: {
        serviceRequestId: params.id,
        authorId: session.userId,
        authorRole,
        authorName,
        message: message.trim(),
        attachmentUrl: attachmentUrl || null,
      },
    });

    // If ticket was SUBMITTED and HR replied, automatically advance to IN_PROGRESS
    if (ticket.status === "SUBMITTED" && isHr) {
      await db.hrServiceRequest.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tanggapan berhasil dikirim",
      data: newComment,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/services/[id]/comments error:", error);
    return NextResponse.json({ error: error.message || "Failed to add comment" }, { status: 500 });
  }
}
