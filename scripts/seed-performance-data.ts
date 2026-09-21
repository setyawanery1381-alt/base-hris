import { prisma } from "../src/lib/db";
import { autoProvisionCycleReviews, calculateReviewScores } from "../src/lib/performance-engine";

async function main() {
  console.log("🌱 Seeding Performance & KPI data for demo & trial tenants...");

  const companies = await prisma.company.findMany();

  for (const comp of companies) {
    console.log(`Processing company: ${comp.name} (${comp.code})`);

    // Check if active cycle exists
    let cycle = await prisma.performanceCycle.findFirst({
      where: { companyId: comp.id, status: "ACTIVE" },
    });

    if (!cycle) {
      cycle = await prisma.performanceCycle.create({
        data: {
          companyId: comp.id,
          name: "Penilaian Kinerja Semester 1 2026",
          cycleType: "SEMI_ANNUAL",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-06-30"),
          selfReviewDeadline: new Date("2026-06-15"),
          managerReviewDeadline: new Date("2026-06-25"),
          status: "ACTIVE",
          description: "Evaluasi pencapaian OKR/KPI semester pertama dan penilaian kompetensi profesional tahun 2026.",
        },
      });
      console.log(`  Created active cycle: ${cycle.name}`);
    }

    // Auto provision review sheets & starter goals
    const res = await autoProvisionCycleReviews(comp.id, cycle.id);
    console.log(`  Provisioned ${res.createdCount} reviews (${res.totalEmployees} employees)`);

    // Seed realistic sample reviews for employees in this cycle
    const reviews = await prisma.performanceReview.findMany({
      where: { cycleId: cycle.id },
      include: { items: true, employee: true },
    });

    for (let i = 0; i < reviews.length; i++) {
      const rev = reviews[i];
      // If review has no self rating yet, give some realistic evaluation
      if (rev.selfScore === null) {
        // Employee 1: Rian Pratama (Completed with Grade A)
        if (i === 0) {
          for (const item of rev.items) {
            await prisma.reviewItem.update({
              where: { id: item.id },
              data: {
                selfRating: 4.5,
                selfNotes: "Target pencapaian milestone dan kualitas kode tercapai dengan standar tinggi.",
                managerRating: 4.8,
                managerNotes: "Sangat proaktif, kepemimpinan teknis yang luar biasa.",
                finalItemScore: 4.8,
              },
            });
          }
          const updatedItems = await prisma.reviewItem.findMany({ where: { reviewId: rev.id } });
          const sc = calculateReviewScores(updatedItems);
          await prisma.performanceReview.update({
            where: { id: rev.id },
            data: {
              selfScore: sc.selfScore,
              selfSummary: "Berhasil menyelesaikan modernisasi sistem frontend dan meningkatkan keandalan aplikasi.",
              selfSubmittedAt: new Date("2026-06-10"),
              managerScore: sc.managerScore,
              managerSummary: "Kandidat kuat untuk peran Tech Lead di masa depan. Direkomendasikan kenaikan grade.",
              managerSubmittedAt: new Date("2026-06-20"),
              finalScore: sc.finalScore,
              finalGrade: sc.finalGrade,
              promotionRecommended: true,
              salaryIncreaseRecommended: true,
              recommendationNotes: "Promosi jabatan ke Senior Lead Engineer.",
              status: "COMPLETED",
            },
          });
        } else if (i === 1) {
          // Employee 2: In Review (Grade B)
          for (const item of rev.items) {
            await prisma.reviewItem.update({
              where: { id: item.id },
              data: {
                selfRating: 4.0,
                selfNotes: "Target diselesaikan tepat waktu.",
                managerRating: 4.2,
                managerNotes: "Kinerja baik dan konsisten.",
                finalItemScore: 4.2,
              },
            });
          }
          const updatedItems = await prisma.reviewItem.findMany({ where: { reviewId: rev.id } });
          const sc = calculateReviewScores(updatedItems);
          await prisma.performanceReview.update({
            where: { id: rev.id },
            data: {
              selfScore: sc.selfScore,
              selfSummary: "Fokus pada efisiensi operasional dan SLA pelayanan.",
              selfSubmittedAt: new Date("2026-06-12"),
              managerScore: sc.managerScore,
              managerSummary: "Konsistensi yang baik dalam tugas harian.",
              managerSubmittedAt: new Date("2026-06-22"),
              finalScore: sc.finalScore,
              finalGrade: sc.finalGrade,
              promotionRecommended: false,
              salaryIncreaseRecommended: true,
              status: "HR_REVIEW",
            },
          });
        }
      }
    }
  }

  console.log("✅ Finished Performance data seeding!");
}

main().catch(console.error);
