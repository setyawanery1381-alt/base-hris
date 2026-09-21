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

    const letter = await db.employeeLetter.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
            personalData: true,
            user: { select: { email: true } },
          },
        },
        company: {
          include: {
            branding: true,
          },
        },
      },
    });

    if (!letter) {
      return NextResponse.json({ error: "Surat resmi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: letter });
  } catch (error: any) {
    console.error("GET /api/v1/letters/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch letter" }, { status: 500 });
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
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang berwenang mengubah status surat" }, { status: 403 });
    }

    const existingLetter = await db.employeeLetter.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingLetter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { status, purpose, contentData } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (purpose) updateData.purpose = purpose;
    if (contentData) updateData.contentData = JSON.stringify(contentData);

    const updated = await db.employeeLetter.update({
      where: { id: params.id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OFFICIAL_LETTERS",
      action: "UPDATE_LETTER",
      recordId: params.id,
      oldValues: { status: existingLetter.status },
      newValues: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Data surat resmi berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/letters/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update letter" }, { status: 500 });
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

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang berwenang menghapus dokumen surat" }, { status: 403 });
    }

    const existingLetter = await db.employeeLetter.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!existingLetter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    await db.employeeLetter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Surat resmi berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/letters/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete letter" }, { status: 500 });
  }
}
