import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getTenantBranding } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get("tenantCode");
    const session = await getSession();

    let companyId = session?.companyId;

    if (tenantCode) {
      const comp = await db.company.findUnique({ where: { code: tenantCode } });
      if (comp) companyId = comp.id;
    }

    if (!companyId) {
      // Default branding
      return NextResponse.json({
        appName: "BASE HRIS",
        companyName: "BASE HRIS Platform",
        primaryColor: "#1E40AF",
        secondaryColor: "#3B82F6",
        footerText: "Powered by BASE HRIS Multi-Tenant SaaS",
      });
    }

    const branding = await getTenantBranding(companyId);
    return NextResponse.json(branding);
  } catch (err) {
    return NextResponse.json({ error: "Error fetching branding" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "branding.manage")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    const updated = await db.companyBranding.upsert({
      where: { companyId: session.companyId },
      create: {
        companyId: session.companyId,
        appName: body.appName || "BASE HRIS",
        primaryColor: body.primaryColor || "#1E40AF",
        secondaryColor: body.secondaryColor || "#3B82F6",
        logoUrl: body.logoUrl,
        footerText: body.footerText || `© ${session.companyName}`,
      },
      update: {
        appName: body.appName,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        logoUrl: body.logoUrl,
        footerText: body.footerText,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menyimpan branding: " + err.message }, { status: 500 });
  }
}