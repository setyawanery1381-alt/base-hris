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

    const item = await db.announcement.findFirst({
      where: { id: params.id, companyId: session.companyId },
    });

    if (!item) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error("GET /api/v1/announcements/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch announcement" }, { status: 500 });
  }
}

export async function PUT(
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
      return NextResponse.json({ error: "Hanya HR yang berwenang mengubah pengumuman" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, category, priority, target, isPinned } = body;

    const updated = await db.announcement.update({
      where: { id: params.id },
      data: {
        title,
        content,
        category,
        priority,
        target,
        isPinned: isPinned !== undefined ? Boolean(isPinned) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil diperbarui",
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/v1/announcements/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update announcement" }, { status: 500 });
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
      return NextResponse.json({ error: "Hanya HR yang berwenang menghapus pengumuman" }, { status: 403 });
    }

    await db.announcement.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/announcements/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete announcement" }, { status: 500 });
  }
}
