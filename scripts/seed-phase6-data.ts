import { prisma } from "../src/lib/db";
import { generateClaimNumber, generateTripNumber, generateAssetCode } from "../src/lib/claims-assets-engine";

async function seedPhase6() {
  console.log("🌱 Seeding Phase 6 Demo Data (Claims, SPPD, Assets)...");

  const company = await prisma.company.findFirst({
    where: { code: "kanaya" },
    include: { employees: true },
  });

  if (!company || company.employees.length === 0) {
    console.error("Company 'kanaya' not found.");
    return;
  }

  const [emp1, emp2, emp3] = company.employees;

  // 1. Seed Assets
  const assetsData = [
    {
      assetCode: generateAssetCode("LAPTOP", 1),
      name: "MacBook Pro 14 M3 Pro (18GB / 512GB)",
      category: "LAPTOP",
      brand: "Apple",
      model: "A2992 Space Black",
      serialNumber: "C02XG810JH82",
      purchaseDate: new Date("2025-01-15"),
      purchasePrice: 28999000,
      warrantyExpiry: new Date("2027-01-15"),
      condition: "EXCELLENT",
      status: "ASSIGNED",
      location: "HQ Puri Indah",
      notes: "Unit workstation utama engineering",
    },
    {
      assetCode: generateAssetCode("LAPTOP", 2),
      name: "Dell XPS 15 9530 (i7 / 32GB / 1TB)",
      category: "LAPTOP",
      brand: "Dell",
      model: "XPS 15 Platinum",
      serialNumber: "DL-XPS-99014",
      purchaseDate: new Date("2025-02-10"),
      purchasePrice: 26500000,
      warrantyExpiry: new Date("2028-02-10"),
      condition: "GOOD",
      status: "ASSIGNED",
      location: "HQ Puri Indah",
      notes: "Unit divisi Product & Desain",
    },
    {
      assetCode: generateAssetCode("LAPTOP", 3),
      name: "Lenovo ThinkPad T14 Gen 4 (i5 / 16GB)",
      category: "LAPTOP",
      brand: "Lenovo",
      model: "ThinkPad T14",
      serialNumber: "LNV-TP-44109",
      purchaseDate: new Date("2025-03-01"),
      purchasePrice: 18500000,
      condition: "GOOD",
      status: "AVAILABLE",
      location: "Gudang IT - HQ",
      notes: "Unit cadangan siap pakai",
    },
    {
      assetCode: generateAssetCode("PHONE", 1),
      name: "iPhone 15 Pro 256GB Natural Titanium",
      category: "PHONE",
      brand: "Apple",
      model: "A3102",
      serialNumber: "F17Z19902KH1",
      purchaseDate: new Date("2025-01-20"),
      purchasePrice: 18999000,
      condition: "EXCELLENT",
      status: "AVAILABLE",
      location: "Gudang IT - HQ",
      notes: "Device testing QA Mobile",
    },
    {
      assetCode: generateAssetCode("VEHICLE", 1),
      name: "Toyota Avanza Veloz 1.5 Q CVT TSS (Hitam)",
      category: "VEHICLE",
      brand: "Toyota",
      model: "Veloz TSS 2024",
      serialNumber: "B 1429 KMS",
      purchaseDate: new Date("2024-06-15"),
      purchasePrice: 315000000,
      condition: "GOOD",
      status: "AVAILABLE",
      location: "Parkiran Khusus Basement",
      notes: "Kendaraan operasional dinas kantor",
    },
  ];

  for (const a of assetsData) {
    const existing = await prisma.companyAsset.findFirst({
      where: { companyId: company.id, assetCode: a.assetCode },
    });
    if (!existing) {
      const createdAsset = await prisma.companyAsset.create({
        data: {
          ...a,
          companyId: company.id,
        },
      });

      // If marked as assigned, create assignment record
      if (a.status === "ASSIGNED") {
        const assignedTo = a.assetCode.includes("0001") ? emp1 : (emp2 || emp1);
        if (assignedTo) {
          await prisma.assetAssignment.create({
            data: {
              companyId: company.id,
              assetId: createdAsset.id,
              employeeId: assignedTo.id,
              assignedDate: new Date("2025-02-01"),
              handoverCondition: "EXCELLENT",
              handoverNotes: "BAST: Penyerahan laptop operasional dinas, charger, dan tas.",
              status: "ACTIVE",
            },
          });
        }
      }
    }
  }

  // 2. Seed Reimbursement Claims
  const claimsData = [
    {
      claimNumber: generateClaimNumber(1),
      employeeId: emp1.id,
      title: "Biaya Transportasi Kunjungan Klien & Tol Jabodetabek",
      category: "TRANSPORT",
      totalAmount: 385000,
      approvedAmount: 385000,
      status: "PAID",
      submissionDate: new Date(Date.now() - 5 * 86400000),
      approvedAt: new Date(Date.now() - 4 * 86400000),
      approvedBy: "HR Admin",
      paidAt: new Date(Date.now() - 3 * 86400000),
      paymentReference: "TRF-BCA-551029",
      bankName: "BCA",
      bankAccountNumber: "0882910291",
      bankAccountHolder: `${emp1.firstName} ${emp1.lastName}`,
      items: [
        {
          date: new Date(Date.now() - 6 * 86400000),
          category: "TRANSPORT",
          amount: 215000,
          merchantName: "Bluebird Taxi",
          receiptNumber: "BB-JKT-8819",
          description: "Taksi PP Puri Indah - SCBD",
        },
        {
          date: new Date(Date.now() - 5 * 86400000),
          category: "TRANSPORT",
          amount: 170000,
          merchantName: "Tol JORR W2N",
          receiptNumber: "E-TOLL-991",
          description: "Top-up e-toll dinas lapangan",
        },
      ],
    },
    {
      claimNumber: generateClaimNumber(2),
      employeeId: emp2 ? emp2.id : emp1.id,
      title: "Kuitansi Penggantian Obat & Resep Rawat Jalan",
      category: "MEDICAL",
      totalAmount: 640000,
      status: "PENDING",
      submissionDate: new Date(Date.now() - 1 * 86400000),
      bankName: "Mandiri",
      bankAccountNumber: "1420019281029",
      bankAccountHolder: emp2 ? `${emp2.firstName} ${emp2.lastName}` : "Employee",
      items: [
        {
          date: new Date(Date.now() - 2 * 86400000),
          category: "MEDICAL",
          amount: 250000,
          merchantName: "Klinik Pratama Puri Medika",
          receiptNumber: "K-09281",
          description: "Biaya konsultasi dokter umum",
        },
        {
          date: new Date(Date.now() - 2 * 86400000),
          category: "MEDICAL",
          amount: 390000,
          merchantName: "Apotek K-24",
          receiptNumber: "APT-29182",
          description: "Penebusan obat resep antibiotik & vitamin",
        },
      ],
    },
  ];

  for (const c of claimsData) {
    const existing = await prisma.reimbursement.findFirst({
      where: { companyId: company.id, claimNumber: c.claimNumber },
    });
    if (!existing) {
      const { items, ...rest } = c;
      await prisma.reimbursement.create({
        data: {
          ...rest,
          companyId: company.id,
          items: {
            create: items,
          },
        },
      });
    }
  }

  // 3. Seed Business Trips (SPPD)
  const tripsData = [
    {
      tripNumber: generateTripNumber(1),
      employeeId: emp1.id,
      purpose: "Kick-Off Meeting & Implementasi On-Site Klien Industri Gresik",
      origin: "Jakarta (CGK)",
      destination: "Surabaya & Gresik, Jawa Timur",
      startDate: new Date("2026-09-15"),
      endDate: new Date("2026-09-17"),
      durationDays: 3,
      transportType: "FLIGHT",
      accommodation: "Hotel Santika Premiere Gubeng Surabaya",
      perDiemRate: 250000,
      totalPerDiem: 750000,
      cashAdvance: 3500000,
      disbursedCashAdvance: 3500000,
      actualExpense: 3150000,
      settlementBalance: 350000, // Refund to company
      settlementStatus: "SETTLED",
      status: "COMPLETED",
      approvedAt: new Date("2026-09-12"),
      approvedBy: "Hendra Setiawan",
    },
    {
      tripNumber: generateTripNumber(2),
      employeeId: emp2 ? emp2.id : emp1.id,
      purpose: "Audit Kepatuhan Operasional & Peninjauan Gudang Bandung",
      origin: "Jakarta",
      destination: "Bandung, Jawa Barat",
      startDate: new Date(Date.now() + 2 * 86400000),
      endDate: new Date(Date.now() + 4 * 86400000),
      durationDays: 3,
      transportType: "TRAIN",
      accommodation: "Hotel Savoy Homann",
      perDiemRate: 200000,
      totalPerDiem: 600000,
      cashAdvance: 2000000,
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: "Hendra Setiawan",
    },
  ];

  for (const t of tripsData) {
    const existing = await prisma.businessTrip.findFirst({
      where: { companyId: company.id, tripNumber: t.tripNumber },
    });
    if (!existing) {
      await prisma.businessTrip.create({
        data: {
          ...t,
          companyId: company.id,
        },
      });
    }
  }

  console.log("✅ Phase 6 Demo data successfully seeded!");
}

seedPhase6();
