import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { DEFAULT_CORPORATE_COMPETENCIES } from "@/lib/performance-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const category = searchParams.get("category");

    const where: any = { companyId: session.companyId };
    if (departmentId) where.departmentId = departmentId;
    if (category) where.category = category;

    let templates = await db.kpiTemplate.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ category: "asc" }, { weight: "desc" }],
    });

    // Auto seed default corporate competencies if tenant has no KPI templates at all
    if (templates.length === 0 && !departmentId && !category) {
      for (const comp of DEFAULT_CORPORATE_COMPETENCIES) {
        await db.kpiTemplate.create({
          data: {
            companyId: session.companyId,
            name: comp.name,
            description: comp.description,
            category: comp.category,
            measurementUnit: comp.measurementUnit,
            targetValue: comp.targetValue,
            weight: comp.weight,
            isActive: true,
          },
        });
      }

      templates = await db.kpiTemplate.findMany({
        where: { companyId: session.companyId },
        include: {
          department: { select: { id: true, name: true } },
        },
        orderBy: [{ category: "asc" }, { weight: "desc" }],
      });
    }

    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error("GET /api/v1/performance/kpis error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch KPI templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      departmentId,
      description,
      category = "KPI",
      measurementUnit = "PERCENTAGE",
      targetValue = 100,
      weight = 20,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama KPI / Kompetensi wajib diisi" }, { status: 400 });
    }

    const template = await db.kpiTemplate.create({
      data: {
        companyId: session.companyId,
        departmentId: departmentId || null,
        name,
        description,
        category,
        measurementUnit,
        targetValue: Number(targetValue) || 100,
        weight: Number(weight) || 20,
        isActive: true,
      },
      include: {
        department: true,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "CREATE_KPI_TEMPLATE",
      recordId: template.id,
      newValues: { name, category, weight },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/v1/performance/kpis error:", err);
    return NextResponse.json({ error: err.message || "Failed to create KPI template" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, departmentId, description, category, measurementUnit, targetValue, weight, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (measurementUnit !== undefined) updateData.measurementUnit = measurementUnit;
    if (targetValue !== undefined) updateData.targetValue = Number(targetValue);
    if (weight !== undefined) updateData.weight = Number(weight);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const template = await db.kpiTemplate.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "UPDATE_KPI_TEMPLATE",
      recordId: template.id,
      newValues: updateData,
    });

    return NextResponse.json({ template });
  } catch (err: any) {
    console.error("PUT /api/v1/performance/kpis error:", err);
    return NextResponse.json({ error: err.message || "Failed to update KPI template" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    await db.kpiTemplate.delete({
      where: { id },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERFORMANCE",
      action: "DELETE_KPI_TEMPLATE",
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/v1/performance/kpis error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete KPI template" }, { status: 500 });
  }
}
