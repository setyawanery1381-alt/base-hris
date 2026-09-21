import { prisma } from "./db";

export interface GradeInfo {
  grade: "A" | "B" | "C" | "D" | "E";
  label: string;
  badgeColor: string;
  badgeVariant: string;
  description: string;
}

/**
 * Maps a numerical performance rating (1.0 - 5.0 or 0 - 100) to standard performance grade
 */
export function getGradeFromScore(score: number): GradeInfo {
  // Normalize score to 1-5 scale if passed on 0-100 scale
  const normalizedScore = score > 5 ? score / 20 : score;

  if (normalizedScore >= 4.5) {
    return {
      grade: "A",
      label: "Istimewa (Outstanding)",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      badgeVariant: "success",
      description: "Secara konsisten melampaui seluruh target kinerja dan menunjukkan teladan kepemimpinan.",
    };
  } else if (normalizedScore >= 3.75) {
    return {
      grade: "B",
      label: "Melebihi Target (Exceeds Expectations)",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
      badgeVariant: "primary",
      description: "Memenuhi seluruh ekspektasi utama dan secara proaktif mencapai target di atas rata-rata.",
    };
  } else if (normalizedScore >= 3.0) {
    return {
      grade: "C",
      label: "Memenuhi Target (Meets Expectations)",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
      badgeVariant: "info",
      description: "Memenuhi target dan tanggung jawab pekerjaan sesuai standar yang ditetapkan.",
    };
  } else if (normalizedScore >= 2.0) {
    return {
      grade: "D",
      label: "Perlu Perbaikan (Needs Improvement)",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
      badgeVariant: "warning",
      description: "Beberapa target utama belum tercapai dan membutuhkan rencana pengembangan intensif.",
    };
  } else {
    return {
      grade: "E",
      label: "Kurang Memuaskan (Unsatisfactory)",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      badgeVariant: "danger",
      description: "Kinerja jauh di bawah standar perusahaan. Memerlukan peninjauan tindak lanjut HR (PIP).",
    };
  }
}

/**
 * Calculate weighted scores from review items
 */
export function calculateReviewScores(items: Array<{
  weight: number;
  selfRating?: number | null;
  managerRating?: number | null;
}>) {
  let totalSelfWeighted = 0;
  let totalSelfWeight = 0;

  let totalMgrWeighted = 0;
  let totalMgrWeight = 0;

  for (const item of items) {
    const weight = Number(item.weight) || 1;

    if (item.selfRating != null && !isNaN(Number(item.selfRating))) {
      totalSelfWeighted += Number(item.selfRating) * weight;
      totalSelfWeight += weight;
    }

    if (item.managerRating != null && !isNaN(Number(item.managerRating))) {
      totalMgrWeighted += Number(item.managerRating) * weight;
      totalMgrWeight += weight;
    }
  }

  const selfScore = totalSelfWeight > 0 ? Number((totalSelfWeighted / totalSelfWeight).toFixed(2)) : null;
  const managerScore = totalMgrWeight > 0 ? Number((totalMgrWeighted / totalMgrWeight).toFixed(2)) : null;

  // Final score is primarily driven by manager's weighted score once evaluated
  const finalScore = managerScore !== null ? managerScore : selfScore;
  const gradeInfo = finalScore !== null ? getGradeFromScore(finalScore) : null;

  return {
    selfScore,
    managerScore,
    finalScore,
    finalGrade: gradeInfo?.grade || null,
    gradeInfo,
  };
}

/**
 * Standard corporate competencies for all companies
 */
export const DEFAULT_CORPORATE_COMPETENCIES = [
  {
    name: "Integritas & Etika Kerja",
    description: "Kepatuhan terhadap kode etik perusahaan, kejujuran, dan transparansi dalam bertugas.",
    category: "BEHAVIOR",
    measurementUnit: "RATING_5",
    targetValue: 5.0,
    weight: 15,
  },
  {
    name: "Kerja Sama Tim & Komunikasi",
    description: "Kemampuan berkolaborasi lintas tim, komunikasi konstruktif, dan saling mendukung.",
    category: "BEHAVIOR",
    measurementUnit: "RATING_5",
    targetValue: 5.0,
    weight: 15,
  },
  {
    name: "Orientasi Kualitas & Target Kerja",
    description: "Kualitas hasil kerja, akurasi, kedisiplinan waktu, dan pencapaian KPI individu.",
    category: "KPI",
    measurementUnit: "RATING_5",
    targetValue: 5.0,
    weight: 40,
  },
  {
    name: "Inisiatif & Pemecahan Masalah",
    description: "Proaktif mencari solusi terhadap kendala kerja, efisiensi proses, dan inovasi.",
    category: "COMPETENCY",
    measurementUnit: "RATING_5",
    targetValue: 5.0,
    weight: 15,
  },
  {
    name: "Kedisiplinan & Kehadiran",
    description: "Ketaatan terhadap jam kerja, kepatuhan absensi, dan tanggung jawab terhadap tenggat waktu.",
    category: "BEHAVIOR",
    measurementUnit: "RATING_5",
    targetValue: 5.0,
    weight: 15,
  },
];

/**
 * Auto-provision review forms and sample goals for active employees in a cycle
 */
export async function autoProvisionCycleReviews(companyId: string, cycleId: string) {
  // Ensure default KPI templates exist for company
  const existingTemplates = await prisma.kpiTemplate.findMany({
    where: { companyId },
  });

  if (existingTemplates.length === 0) {
    for (const comp of DEFAULT_CORPORATE_COMPETENCIES) {
      await prisma.kpiTemplate.create({
        data: {
          companyId,
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
  }

  const templates = await prisma.kpiTemplate.findMany({
    where: { companyId, isActive: true },
  });

  // Get all active employees in this company
  const employees = await prisma.employee.findMany({
    where: { companyId, deletedAt: null },
    include: {
      user: true,
      manager: true,
    },
  });

  let createdCount = 0;

  for (const emp of employees) {
    // Check if review already exists
    const existingReview = await prisma.performanceReview.findUnique({
      where: {
        cycleId_employeeId: {
          cycleId,
          employeeId: emp.id,
        },
      },
      include: { items: true },
    });

    if (!existingReview) {
      // Create new review
      await prisma.performanceReview.create({
        data: {
          companyId,
          cycleId,
          employeeId: emp.id,
          reviewerId: emp.managerId || null,
          status: "SELF_ASSESSMENT",
          items: {
            create: templates.map((tpl) => ({
              title: tpl.name,
              category: tpl.category,
              weight: tpl.weight,
              targetValue: tpl.targetValue,
              selfRating: null,
              managerRating: null,
            })),
          },
        },
      });
      createdCount++;
    }

    // Check if employee has goals in this cycle
    const existingGoals = await prisma.performanceGoal.findMany({
      where: { companyId, employeeId: emp.id, cycleId },
    });

    if (existingGoals.length === 0) {
      // Create starter goals
      await prisma.performanceGoal.createMany({
        data: [
          {
            companyId,
            employeeId: emp.id,
            cycleId,
            title: "Pencapaian Target Utama Semester Ini",
            description: "Menyelesaikan milestone proyek dan tugas utama tepat waktu.",
            category: "KPI",
            metricUnit: "PERCENTAGE",
            targetValue: 100,
            currentValue: 75,
            weight: 50,
            status: "IN_PROGRESS",
          },
          {
            companyId,
            employeeId: emp.id,
            cycleId,
            title: "Pengembangan Keahlian & Sertifikasi / Pelatihan",
            description: "Menyelesaikan modul pembelajaran dan upskilling internal.",
            category: "PERSONAL_DEVELOPMENT",
            metricUnit: "PERCENTAGE",
            targetValue: 100,
            currentValue: 50,
            weight: 25,
            status: "IN_PROGRESS",
          },
          {
            companyId,
            employeeId: emp.id,
            cycleId,
            title: "Disiplin Kehadiran & SLA Penugasan",
            description: "Mempertahankan tingkat kehadiran di atas 95% tanpa keterlambatan.",
            category: "KPI",
            metricUnit: "PERCENTAGE",
            targetValue: 100,
            currentValue: 95,
            weight: 25,
            status: "COMPLETED",
          },
        ],
      });
    }
  }

  return { success: true, createdCount, totalEmployees: employees.length };
}
