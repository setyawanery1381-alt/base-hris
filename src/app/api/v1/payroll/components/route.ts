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
    const typeFilter = searchParams.get("type");
    const categoryFilter = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = { companyId: session.companyId };
    if (typeFilter) where.type = typeFilter;
    if (categoryFilter) where.category = categoryFilter;
    if (activeOnly) where.isActive = true;

    const components = await db.salaryComponent.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ components });
  } catch (error: any) {
    console.error("Failed to fetch salary components:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
      return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, type, category, isTaxable, isBpjsSubject, isDefault } = body;

    if (!name || !code || !type || !category) {
      return NextResponse.json({ error: "Missing required fields (name, code, type, category)" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_]/g, "_");

    // Check duplicate code within company
    const existing = await db.salaryComponent.findUnique({
      where: {
        companyId_code: {
          companyId: session.companyId,
          code: cleanCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Component code '${cleanCode}' already exists.` }, { status: 400 });
    }

    const component = await db.salaryComponent.create({
      data: {
        companyId: session.companyId,
        name,
        code: cleanCode,
        type,
        category,
        isTaxable: isTaxable !== undefined ? Boolean(isTaxable) : true,
        isBpjsSubject: isBpjsSubject !== undefined ? Boolean(isBpjsSubject) : true,
        isDefault: Boolean(isDefault),
        isActive: true,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "CREATE_SALARY_COMPONENT",
      recordId: component.id,
      newValues: component,
    });

    return NextResponse.json({ component }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create salary component:", error);
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
    const { id, name, category, type, isTaxable, isBpjsSubject, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Component ID is required" }, { status: 400 });
    }

    const existing = await db.salaryComponent.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Salary component not found" }, { status: 404 });
    }

    const updated = await db.salaryComponent.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(type && { type }),
        ...(isTaxable !== undefined && { isTaxable: Boolean(isTaxable) }),
        ...(isBpjsSubject !== undefined && { isBpjsSubject: Boolean(isBpjsSubject) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "UPDATE_SALARY_COMPONENT",
      recordId: updated.id,
      oldValues: existing,
      newValues: updated,
    });

    return NextResponse.json({ component: updated });
  } catch (error: any) {
    console.error("Failed to update salary component:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Component ID is required" }, { status: 400 });
    }

    const existing = await db.salaryComponent.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    // Soft deactivate or delete
    await db.salaryComponent.delete({ where: { id } });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PAYROLL",
      action: "DELETE_SALARY_COMPONENT",
      recordId: id,
      oldValues: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete salary component:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
