import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { calculateSettlementBalance } from "@/lib/claims-assets-engine";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await db.businessTrip.findFirst({
      where: { id: params.id, companyId: session.companyId },
      include: { employee: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "SPPD tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { expenses = [], settlementNotes, markAsSettled = false } = body;

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: "Rincian realisasi pengeluaran dinas minimal 1 item" }, { status: 400 });
    }

    const totalActualExpense = expenses.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const effectiveCashAdvance = trip.disbursedCashAdvance !== null && trip.disbursedCashAdvance !== undefined
      ? trip.disbursedCashAdvance
      : trip.cashAdvance;

    const balanceInfo = calculateSettlementBalance(effectiveCashAdvance, totalActualExpense);

    // Delete any old draft expenses for this trip and recreate
    await db.tripExpense.deleteMany({
      where: { businessTripId: params.id },
    });

    // Create new expenses
    await db.tripExpense.createMany({
      data: expenses.map((item: any) => ({
        businessTripId: params.id,
        date: item.date ? new Date(item.date) : new Date(),
        category: item.category || "OTHER",
        amount: Number(item.amount) || 0,
        merchantName: item.merchantName || null,
        receiptUrl: item.receiptUrl || null,
        notes: item.notes || null,
      })),
    });

    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN") || session.roles.includes("FINANCE");
    const newSettlementStatus = markAsSettled && isHr ? "SETTLED" : "SUBMITTED";

    const updatedTrip = await db.businessTrip.update({
      where: { id: params.id },
      data: {
        actualExpense: totalActualExpense,
        settlementBalance: balanceInfo.balance,
        settlementStatus: newSettlementStatus,
        settlementNotes: settlementNotes || null,
        status: newSettlementStatus === "SETTLED" ? "COMPLETED" : trip.status,
      },
      include: {
        expenses: true,
        employee: true,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "BUSINESS_TRIP",
      action: "SUBMIT_TRIP_SETTLEMENT",
      recordId: params.id,
      newValues: {
        totalActualExpense,
        settlementBalance: balanceInfo.balance,
        balanceType: balanceInfo.type,
        settlementStatus: newSettlementStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Laporan pertanggungjawaban realisasi biaya dinas (settlement) berhasil disimpan",
      data: {
        ...updatedTrip,
        balanceCalculation: balanceInfo,
      },
    });
  } catch (error: any) {
    console.error("POST /api/v1/trips/[id]/settle error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit settlement" }, { status: 500 });
  }
}
