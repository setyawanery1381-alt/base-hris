import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat notifikasi." }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, message: "Semua notifikasi ditandai dibaca." });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menandai notifikasi." }, { status: 500 });
  }
}