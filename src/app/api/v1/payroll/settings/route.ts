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

    let settings = await db.taxBpjsSetting.findUnique({
      where: { companyId: session.companyId },
    });

    if (!settings) {
      settings = await db.taxBpjsSetting.create({
        data: {
          companyId: session.companyId,
          bpjsKesCompanyRate: 4.0,
          bpjsKesEmployeeRate: 1.0,
          bpjsKesMaxCap: 12000000,
          bpjsTkJkkRate: 0.24,
          bpjsTkJkmRate: 0.30,
          bpjsTkJhtCompanyRate: 3.7,
          bpjsTkJhtEmployeeRate: 2.0,
          bpjsTkJpCompanyRate: 2.0,
          bpjsTkJpEmployeeRate: 1.0,
          bpjsTkJpMaxCap: 10042300,
          pph21Method: "TER_2024",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Failed to fetch tax/BPJS settings:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("FINANCE");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      bpjsKesCompanyRate,
      bpjsKesEmployeeRate,
      bpjsKesMaxCap,
      bpjsTkJkkRate,
      bpjsTkJkmRate,
      bpjsTkJhtCompanyRate,
      bpjsTkJhtEmployeeRate,
      bpjsTkJpCompanyRate,
      bpjsTkJpEmployeeRate,
      bpjsTkJpMaxCap,
      pph21Method,
    } = body;

    const existing = await db.taxBpjsSetting.findUnique({
      where: { companyId: session.companyId },
    });

    const updated = await db.taxBpjsSetting.upsert({
      where: { companyId: session.companyId },
      update: {
        ...(bpjsKesCompanyRate !== undefined && { bpjsKesCompanyRate: Number(bpjsKesCompanyRate) }),
        ...(bpjsKesEmployeeRate !== undefined && { bpjsKesEmployeeRate: Number(bpjsKesEmployeeRate) }),
        ...(bpjsKesMaxCap !== undefined && { bpjsKesMaxCap: Number(bpjsKesMaxCap) }),
        ...(bpjsTkJkkRate !== undefined && { bpjsTkJkkRate: Number(bpjsTkJkkRate) }),
        ...(bpjsTkJkmRate !== undefined && { bpjsTkJkmRate: Number(bpjsTkJkmRate) }),
        ...(bpjsTkJhtCompanyRate !== undefined && { bpjsTkJhtCompanyRate: Number(bpjsTkJhtCompanyRate) }),
        ...(bpjsTkJhtEmployeeRate !== undefined && { bpjsTkJhtEmployeeRate: Number(bpjsTkJhtEmployeeRate) }),
        ...(bpjsTkJpCompanyRate !== undefined && { bpjsTkJpCompanyRate: Number(bpjsTkJpCompanyRate) }),
        ...(bpjsTkJpEmployeeRate !== undefined && { bpjsTkJpEmployeeRate: Number(bpjsTkJpEmployeeRate) }),
        ...(bpjsTkJpMaxCap !== undefined && { bpjsTkJpMaxCap: Number(bpjsTkJpMaxCap) }),
        ...(pph21Method && { pph21Method }),
      },
      create: {
        companyId: session.companyId,
        bpjsKesCompanyRate: Number(bpjsKesCompanyRate ?? 4.0),
        bpjsKesEmployeeRate: Number(bpjsKesEmployeeRate ?? 1.0),
        bpjsKesMaxCap: Number(bpjsKesMaxCap ?? 12000000),
        bpjsTkJkkRate: Number(bpjsTkJkkRate ?? 0.24),
        bpjsTkJkmRate: Number(bpjsTkJkmRate ?? 0.30),
        bpjsTkJhtCompanyRate: Number(bpjsTkJhtCompanyRate ?? 3.7),
        bpjsTkJhtEmployeeRate: Number(bpjsTkJhtEmployeeRate ?? 2.0),
        bpjsTkJpCompanyRate: Number(bpjsTkJpCompanyRate ?? 2.0),
        bpjsTkJpEmployeeRate: Number(bpjsTkJpEmployeeRate ?? 1.0),
        bpjsTkJpMaxCap: Number(bpjsTkJpMaxCap ?? 10042300),
        pph21Method: pph21Method || "TER_2024",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "UPDATE_TAX_BPJS_SETTINGS",
      recordId: updated.id,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({ settings: updated, success: true });
  } catch (error: any) {
    console.error("Failed to update tax/BPJS settings:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
