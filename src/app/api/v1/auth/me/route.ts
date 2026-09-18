import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTenantBranding } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let branding = null;
    if (session.companyId) {
      branding = await getTenantBranding(session.companyId);
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
      branding,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}