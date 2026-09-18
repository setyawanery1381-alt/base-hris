import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const statusParam = searchParams.get("status");

    let dateFilter: any = {};
    if (dateParam) {
      const d = new Date(dateParam);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    const [records, policy, locations] = await Promise.all([
      db.attendance.findMany({
        where: {
          companyId: session.companyId,
          ...(dateParam ? { date: dateFilter } : {}),
          ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
        },
        include: {
          employee: {
            include: { department: true, position: true, location: true },
          },
        },
        orderBy: { date: "desc" },
      }),
      db.attendancePolicy.findFirst({
        where: { companyId: session.companyId },
      }),
      db.location.findMany({
        where: { companyId: session.companyId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      records,
      policy,
      locations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat rekap absensi." }, { status: 500 });
  }
}