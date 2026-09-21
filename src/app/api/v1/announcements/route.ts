import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    let where: any = { companyId: session.companyId };

    if (category && category !== "ALL") {
      where.category = category;
    }

    // If regular employee, filter by target audience
    if (!isHr) {
      const emp = await db.employee.findFirst({
        where: { companyId: session.companyId, userId: session.userId },
      });

      if (emp) {
        where.OR = [
          { target: "ALL" },
          { targetDepartmentId: emp.departmentId },
          { targetLocationId: emp.locationId },
        ];
      } else {
        where.target = "ALL";
      }
    }

    const announcements = await db.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { date: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: announcements,
      count: announcements.length,
    });
  } catch (error: any) {
    console.error("GET /api/v1/announcements error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");
    if (!isHr) {
      return NextResponse.json({ error: "Hanya HR yang berwenang mempublikasikan pengumuman" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      content,
      category = "GENERAL",
      priority = "NORMAL",
      target = "ALL",
      targetDepartmentId,
      targetLocationId,
      imageUrl,
      isPinned = false,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Judul dan isi pengumuman wajib diisi" }, { status: 400 });
    }

    const newAnnouncement = await db.announcement.create({
      data: {
        companyId: session.companyId,
        title,
        content,
        category,
        priority,
        target,
        targetDepartmentId: targetDepartmentId || null,
        targetLocationId: targetLocationId || null,
        imageUrl: imageUrl || null,
        authorName: session.name || session.email || "HR Department",
        isPinned: Boolean(isPinned),
      },
    });

    // Notify employees
    try {
      const companyId = session.companyId;
      const empWhere: any = { companyId };
      if (target === "DEPARTMENT" && targetDepartmentId) empWhere.departmentId = targetDepartmentId;
      if (target === "LOCATION" && targetLocationId) empWhere.locationId = targetLocationId;

      const targetEmps = await db.employee.findMany({
        where: empWhere,
        select: { userId: true },
      });

      const validTargetEmps = targetEmps.filter((e) => Boolean(e.userId));

      if (validTargetEmps.length > 0) {
        await db.notification.createMany({
          data: validTargetEmps.map((e) => ({
            companyId,
            userId: e.userId as string,
            category: "ANNOUNCEMENT",
            title: `Pengumuman: ${title}`,
            message: content.slice(0, 120) + (content.length > 120 ? "..." : ""),
            referenceModule: "ANNOUNCEMENT",
            referenceId: newAnnouncement.id,
          })),
        });
      }
    } catch (notifErr) {
      console.error("Failed to broadcast notifications:", notifErr);
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ANNOUNCEMENT",
      action: "PUBLISH_ANNOUNCEMENT",
      recordId: newAnnouncement.id,
      newValues: { title, category, priority, target },
    });

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dipublikasikan dan disebarkan ke karyawan",
      data: newAnnouncement,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/v1/announcements error:", error);
    return NextResponse.json({ error: error.message || "Failed to create announcement" }, { status: 500 });
  }
}
