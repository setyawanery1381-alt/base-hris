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

    const company = await db.company.findUnique({
      where: { id: session.companyId },
      include: {
        settings: true,
        attendancePolicies: true,
        features: true,
      },
    });

    return NextResponse.json({ success: true, company });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { policy } = body;

    if (policy) {
      await db.attendancePolicy.upsert({
        where: { id: policy.id || "dummy-id" },
        create: {
          companyId: session.companyId,
          name: policy.name || "Kebijakan Kantor Utama",
          workStartTime: policy.workStartTime || "08:30",
          workEndTime: policy.workEndTime || "17:30",
          lateToleranceMinutes: Number(policy.lateToleranceMinutes) || 15,
          geofenceRadiusMeters: Number(policy.geofenceRadiusMeters) || 100,
          isSelfieRequired: Boolean(policy.isSelfieRequired),
          isGpsRequired: Boolean(policy.isGpsRequired),
        },
        update: {
          name: policy.name,
          workStartTime: policy.workStartTime,
          workEndTime: policy.workEndTime,
          lateToleranceMinutes: Number(policy.lateToleranceMinutes),
          geofenceRadiusMeters: Number(policy.geofenceRadiusMeters),
          isSelfieRequired: Boolean(policy.isSelfieRequired),
          isGpsRequired: Boolean(policy.isGpsRequired),
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "SETTINGS",
      action: "UPDATE_POLICY",
      newValues: policy,
    });

    return NextResponse.json({ success: true, message: "Pengaturan berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memperbarui pengaturan: " + err.message }, { status: 500 });
  }
}