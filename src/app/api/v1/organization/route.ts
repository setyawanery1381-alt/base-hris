import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [divisions, departments, positions, locations] = await Promise.all([
      db.division.findMany({ where: { companyId: session.companyId } }),
      db.department.findMany({
        where: { companyId: session.companyId },
        include: { division: true, employees: true },
      }),
      db.position.findMany({
        where: { companyId: session.companyId },
        include: { department: true, employees: true },
      }),
      db.location.findMany({
        where: { companyId: session.companyId },
        include: { employees: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      divisions,
      departments,
      positions,
      locations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat struktur organisasi." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, data } = body; // type: "department" | "position" | "location"

    let result = null;

    if (type === "department") {
      result = await db.department.create({
        data: {
          companyId: session.companyId,
          name: data.name,
          code: data.code || data.name.substring(0, 3).toUpperCase(),
          divisionId: data.divisionId || null,
        },
      });
    } else if (type === "position") {
      result = await db.position.create({
        data: {
          companyId: session.companyId,
          name: data.name,
          level: Number(data.level) || 1,
          departmentId: data.departmentId || null,
        },
      });
    } else if (type === "location") {
      result = await db.location.create({
        data: {
          companyId: session.companyId,
          name: data.name,
          address: data.address,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          radiusMeters: Number(data.radiusMeters) || 100,
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ORGANIZATION",
      action: `CREATE_${type.toUpperCase()}`,
      recordId: result?.id,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menyimpan data organisasi: " + err.message }, { status: 500 });
  }
}