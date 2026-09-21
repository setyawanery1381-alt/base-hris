import { prisma } from "../src/lib/db";
import {
  generateClaimNumber,
  generateTripNumber,
  generateAssetCode,
  formatRupiah,
  calculateTripDuration,
  calculatePerDiemTotal,
  calculateSettlementBalance,
  calculateClaimTotal,
} from "../src/lib/claims-assets-engine";

async function runTests() {
  console.log("🚀 Running BASE HRIS Phase 6 — Claims, SPPD & Asset Management Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // SETUP: Tenant & Employee Discovery
    // -------------------------------------------------------------
    console.log("👉 Test Suite 1: Tenant & Employee Setup");
    const company = await prisma.company.findFirst({
      where: { code: "kanaya" },
      include: { employees: true },
    });

    if (!company || company.employees.length === 0) {
      throw new Error("Seed company 'kanaya' or employees not found!");
    }

    const testEmployee = company.employees[0];
    assert(Boolean(company.id), `Discovered company: ${company.name} (${company.id})`);
    assert(Boolean(testEmployee.id), `Discovered test employee: ${testEmployee.firstName} ${testEmployee.lastName}`);

    // -------------------------------------------------------------
    // TEST SUITE 2: Math & Code Generators
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 2: Math, Formatting & Code Generators");
    const claimNum = generateClaimNumber(1, new Date(2026, 8, 21));
    assert(claimNum === "CLM/2026/09/0001", `Claim number generated correctly: ${claimNum}`);

    const tripNum = generateTripNumber(42, new Date(2026, 8, 21));
    assert(tripNum === "SPPD/2026/09/0042", `Trip number generated correctly: ${tripNum}`);

    const lapAssetCode = generateAssetCode("LAPTOP", 7);
    assert(lapAssetCode === "AST-LAP-0007", `Laptop asset code generated: ${lapAssetCode}`);

    const vhcAssetCode = generateAssetCode("VEHICLE", 12);
    assert(vhcAssetCode === "AST-VHC-0012", `Vehicle asset code generated: ${vhcAssetCode}`);

    const formattedRupiah = formatRupiah(1500000);
    assert(formattedRupiah.includes("1.500.000"), `Currency formatted to IDR: ${formattedRupiah}`);

    const claimSum = calculateClaimTotal([
      { amount: 150000 },
      { amount: 350000 },
      { amount: 500000 },
    ]);
    assert(claimSum === 1000000, `Claim items sum calculated correctly: ${claimSum} == 1000000`);

    const durationDays = calculateTripDuration("2026-09-22", "2026-09-25");
    assert(durationDays === 4, `Trip duration calculated: 4 days (actual: ${durationDays})`);

    const totalPerDiem = calculatePerDiemTotal(durationDays, 250000);
    assert(totalPerDiem === 1000000, `Per-diem total calculated: 4 x 250.000 = ${totalPerDiem}`);

    // -------------------------------------------------------------
    // TEST SUITE 3: Settlement Balance Calculation
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 3: Cash Advance & Settlement Math");
    // Scenario A: Sisa uang (Karyawan lebih bayar)
    const refundCase = calculateSettlementBalance(2000000, 1600000);
    assert(refundCase.type === "REFUND_TO_COMPANY", "Recognized surplus balance as REFUND_TO_COMPANY");
    assert(refundCase.balance === 400000, `Leftover cash balance correct: ${refundCase.balance}`);

    // Scenario B: Nombor (Kurang bayar, kantor reimburse ke karyawan)
    const reimburseCase = calculateSettlementBalance(2000000, 2450000);
    assert(reimburseCase.type === "REIMBURSE_TO_EMPLOYEE", "Recognized deficit balance as REIMBURSE_TO_EMPLOYEE");
    assert(reimburseCase.balance === -450000, `Deficit amount correct: ${reimburseCase.balance}`);

    // Scenario C: Pas
    const balancedCase = calculateSettlementBalance(2000000, 2000000);
    assert(balancedCase.type === "BALANCED", "Recognized exact matching balance as BALANCED");

    // -------------------------------------------------------------
    // TEST SUITE 4: Claim Lifecycle in Database
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 4: Database Claim Workflow");
    const testClaim = await prisma.reimbursement.create({
      data: {
        companyId: company.id,
        employeeId: testEmployee.id,
        claimNumber: generateClaimNumber(999),
        title: "Klaim Uji Coba Medis & Transportasi",
        category: "MEDICAL",
        totalAmount: 750000,
        status: "PENDING",
        items: {
          create: [
            {
              date: new Date(),
              category: "MEDICAL",
              amount: 500000,
              merchantName: "Klinik Pratama",
              receiptNumber: "KLN-001",
              description: "Konsultasi dokter spesialis",
            },
            {
              date: new Date(),
              category: "TRANSPORT",
              amount: 250000,
              merchantName: "Taksi Bluebird",
              receiptNumber: "BB-992",
              description: "Antar jemput klinik",
            },
          ],
        },
      },
      include: { items: true },
    });

    assert(testClaim.items.length === 2, `Claim created with 2 items in DB (ID: ${testClaim.id})`);
    assert(testClaim.status === "PENDING", `Claim initial status is PENDING`);

    // Approve claim with slight adjustment
    const approvedClaim = await prisma.reimbursement.update({
      where: { id: testClaim.id },
      data: {
        status: "APPROVED",
        approvedAmount: 700000,
        approvedAt: new Date(),
        approvedBy: "HR Test Runner",
      },
    });
    assert(approvedClaim.status === "APPROVED", `Claim status transitioned to APPROVED`);
    assert(approvedClaim.approvedAmount === 700000, `Claim approved amount set to 700.000`);

    // Pay claim
    const paidClaim = await prisma.reimbursement.update({
      where: { id: testClaim.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentReference: "TRF-BCA-TEST-001",
      },
    });
    assert(paidClaim.status === "PAID", `Claim status transitioned to PAID with Ref ${paidClaim.paymentReference}`);

    // Clean up test claim
    await prisma.reimbursement.delete({ where: { id: testClaim.id } });
    assert(true, `Test claim cleaned up successfully`);

    // -------------------------------------------------------------
    // TEST SUITE 5: Business Trip (SPPD) & Settlement in DB
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 5: Database Business Trip (SPPD) & Settlement");
    const testTrip = await prisma.businessTrip.create({
      data: {
        companyId: company.id,
        employeeId: testEmployee.id,
        tripNumber: generateTripNumber(999),
        purpose: "Supervisi Implementasi Cloud Server Surabaya",
        origin: "Jakarta",
        destination: "Surabaya, Jawa Timur",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-03"),
        durationDays: 3,
        transportType: "FLIGHT",
        accommodation: "Hotel JW Marriott",
        perDiemRate: 250000,
        totalPerDiem: 750000,
        cashAdvance: 3000000,
        status: "PENDING",
      },
    });

    assert(testTrip.durationDays === 3, `SPPD created with duration 3 days (Trip: ${testTrip.tripNumber})`);
    assert(testTrip.totalPerDiem === 750000, `SPPD total per-diem: 750.000`);

    // Disburse cash advance
    const disbursedTrip = await prisma.businessTrip.update({
      where: { id: testTrip.id },
      data: {
        status: "DISBURSED",
        disbursedCashAdvance: 3000000,
        approvedAt: new Date(),
        approvedBy: "Director of Ops",
      },
    });
    assert(disbursedTrip.status === "DISBURSED", `SPPD cash advance disbursed`);

    // Submit settlement with expenses
    const testExpense = await prisma.tripExpense.create({
      data: {
        businessTripId: testTrip.id,
        date: new Date(),
        category: "TRANSPORT",
        amount: 1800000,
        merchantName: "Garuda Indonesia",
        notes: "Tiket PP CGK-SUB",
      },
    });

    const settledTrip = await prisma.businessTrip.update({
      where: { id: testTrip.id },
      data: {
        actualExpense: 2550000,
        settlementBalance: 450000, // 3.000.000 - 2.550.000 = 450.000 refund to company
        settlementStatus: "SETTLED",
        status: "COMPLETED",
      },
    });

    assert(settledTrip.settlementStatus === "SETTLED", `SPPD settled successfully`);
    assert(settledTrip.status === "COMPLETED", `SPPD status marked as COMPLETED`);
    assert(settledTrip.settlementBalance === 450000, `Settlement refund balance verified: Rp 450.000`);

    // Clean up trip
    await prisma.businessTrip.delete({ where: { id: testTrip.id } });
    assert(true, `Test trip cleaned up successfully`);

    // -------------------------------------------------------------
    // TEST SUITE 6: Company Asset Inventory & BAST Lifecycle
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 6: Company Asset Inventory & BAST Handover");
    const testAsset = await prisma.companyAsset.create({
      data: {
        companyId: company.id,
        assetCode: generateAssetCode("LAPTOP", 888),
        name: "MacBook Pro 16 M3 Max 36GB/1TB",
        category: "LAPTOP",
        brand: "Apple",
        model: "A2991 Space Black",
        serialNumber: "SN-TEST-M3MAX-001",
        purchasePrice: 42000000,
        condition: "EXCELLENT",
        status: "AVAILABLE",
        location: "HQ Safe Storage",
      },
    });

    assert(testAsset.status === "AVAILABLE", `Asset created in stock with status AVAILABLE (${testAsset.assetCode})`);
    assert(testAsset.condition === "EXCELLENT", `Asset condition is EXCELLENT`);

    // Handover BAST to employee
    const assignment = await prisma.assetAssignment.create({
      data: {
        companyId: company.id,
        assetId: testAsset.id,
        employeeId: testEmployee.id,
        assignedDate: new Date(),
        handoverCondition: "EXCELLENT",
        handoverNotes: "BAST Resmi: Unit baru lengkap charger 140W & case",
        status: "ACTIVE",
      },
    });

    const assignedAsset = await prisma.companyAsset.update({
      where: { id: testAsset.id },
      data: { status: "ASSIGNED" },
    });

    assert(assignedAsset.status === "ASSIGNED", `Asset status updated to ASSIGNED`);
    assert(assignment.status === "ACTIVE", `BAST assignment record active for employee ${testEmployee.firstName}`);

    // Return handover
    const returnedAssignment = await prisma.assetAssignment.update({
      where: { id: assignment.id },
      data: {
        returnDate: new Date(),
        returnCondition: "GOOD",
        returnNotes: "Pengembalian normal saat mutasi proyek",
        status: "RETURNED",
      },
    });

    const returnedAsset = await prisma.companyAsset.update({
      where: { id: testAsset.id },
      data: {
        status: "AVAILABLE",
        condition: "GOOD",
      },
    });

    assert(returnedAssignment.status === "RETURNED", `BAST assignment successfully closed as RETURNED`);
    assert(returnedAsset.status === "AVAILABLE", `Asset returned to stock (AVAILABLE)`);
    assert(returnedAsset.condition === "GOOD", `Asset condition updated based on return physical check`);

    // Clean up test asset
    await prisma.companyAsset.delete({ where: { id: testAsset.id } });
    assert(true, `Test asset cleaned up successfully`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(`🎉 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=======================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test suite encountered fatal error:", error);
    process.exit(1);
  }
}

runTests();
