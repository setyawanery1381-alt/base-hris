import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const whereClause: any = { userId: session.userId };
    if (session.companyId) {
      whereClause.companyId = session.companyId;
    }
    if (category && category !== "ALL") {
      whereClause.category = category;
    }
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, unreadCount, allCategories] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.notification.count({
        where: {
          userId: session.userId,
          isRead: false,
          ...(session.companyId ? { companyId: session.companyId } : {}),
        },
      }),
      db.notification.groupBy({
        by: ["category"],
        where: {
          userId: session.userId,
          isRead: false,
          ...(session.companyId ? { companyId: session.companyId } : {}),
        },
        _count: true,
      }),
    ]);

    const countsByCategory: Record<string, number> = {};
    for (const c of allCategories) {
      countsByCategory[c.category] = c._count;
    }

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      countsByCategory,
    });
  } catch (err: any) {
    console.error("GET /api/v1/notifications error:", err);
    return NextResponse.json({ error: "Gagal memuat notifikasi: " + err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, markAll } = body;

    if (id) {
      await db.notification.updateMany({
        where: { id, userId: session.userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Notifikasi ditandai dibaca." });
    }

    // Default: Mark all as read
    await db.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
        ...(session.companyId ? { companyId: session.companyId } : {}),
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "Semua notifikasi ditandai dibaca." });
  } catch (err: any) {
    console.error("PUT /api/v1/notifications error:", err);
    return NextResponse.json({ error: "Gagal memperbarui notifikasi: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAllRead = searchParams.get("clearAllRead") === "true";

    if (id) {
      await db.notification.deleteMany({
        where: { id, userId: session.userId },
      });
      return NextResponse.json({ success: true, message: "Notifikasi dihapus." });
    }

    if (clearAllRead) {
      await db.notification.deleteMany({
        where: {
          userId: session.userId,
          isRead: true,
          ...(session.companyId ? { companyId: session.companyId } : {}),
        },
      });
      return NextResponse.json({ success: true, message: "Semua notifikasi yang sudah dibaca dibersihkan." });
    }

    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /api/v1/notifications error:", err);
    return NextResponse.json({ error: "Gagal menghapus notifikasi: " + err.message }, { status: 500 });
  }
}