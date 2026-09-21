import { prisma } from "../src/lib/db";
import {
  getGradeFromScore,
  calculateReviewScores,
  autoProvisionCycleReviews,
  DEFAULT_CORPORATE_COMPETENCIES,
} from "../src/lib/performance-engine";

async function runTests() {
  console.log("🚀 Running BASE HRIS Phase 4 — Performance & KPI Test Suite...\n");

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
    // TEST 1: Grade Conversion Matrix
    // -------------------------------------------------------------
    console.log("👉 Test Suite 1: Grade Conversion Matrix");
    const gradeA = getGradeFromScore(4.8);
    const gradeB = getGradeFromScore(4.0);
    const gradeC = getGradeFromScore(3.2);
    const gradeD = getGradeFromScore(2.4);
    const gradeE = getGradeFromScore(1.6);

    assert(gradeA.grade === "A", "Score 4.8 correctly maps to Grade A");
    assert(gradeB.grade === "B", "Score 4.0 correctly maps to Grade B");
    assert(gradeC.grade === "C", "Score 3.2 correctly maps to Grade C");
    assert(gradeD.grade === "D", "Score 2.4 correctly maps to Grade D");
    assert(gradeE.grade === "E", "Score 1.6 correctly maps to Grade E");

    // Also test 0-100 scale normalization
    const gradeA100 = getGradeFromScore(95);
    assert(gradeA100.grade === "A", "Score 95 on 100-scale maps to Grade A");

    // -------------------------------------------------------------
    // TEST 2: Weighted Score Calculation Engine
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 2: Weighted Score Calculation Engine");
    const sampleItems = [
      { weight: 20, selfRating: 4.0, managerRating: 5.0 },
      { weight: 30, selfRating: 3.0, managerRating: 4.0 },
      { weight: 50, selfRating: 5.0, managerRating: 4.0 },
    ];

    const scoreResults = calculateReviewScores(sampleItems);
    // Self: (20*4 + 30*3 + 50*5) / 100 = (80 + 90 + 250) / 100 = 420 / 100 = 4.2
    assert(scoreResults.selfScore === 4.2, `Self weighted score matches 4.2 (got ${scoreResults.selfScore})`);

    // Manager: (20*5 + 30*4 + 50*4) / 100 = (100 + 120 + 200) / 100 = 420 / 100 = 4.2
    assert(scoreResults.managerScore === 4.2, `Manager weighted score matches 4.2 (got ${scoreResults.managerScore})`);
    assert(scoreResults.finalGrade === "B", `Grade for 4.2 is Grade B (got ${scoreResults.finalGrade})`);

    // -------------------------------------------------------------
    // TEST 3: Tenant Discovery & Cycle Creation
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 3: Performance Cycle & Auto-Provisioning");
    const company = await prisma.company.findFirst({
      where: { code: "kanaya" },
      include: { employees: true },
    });

    if (!company) {
      throw new Error("Seed company 'kanaya' not found! Ensure database is seeded.");
    }

    const testCycle = await prisma.performanceCycle.create({
      data: {
        companyId: company.id,
        name: "Test Periode Kinerja S1 2026",
        cycleType: "SEMI_ANNUAL",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        selfReviewDeadline: new Date("2026-05-15"),
        managerReviewDeadline: new Date("2026-06-15"),
        status: "ACTIVE",
        description: "Periode pengujian otomatis integrasi Kinerja & KPI",
      },
    });

    assert(Boolean(testCycle.id), `Cycle created successfully: ${testCycle.name}`);

    // Run auto-provisioning
    const provResult = await autoProvisionCycleReviews(company.id, testCycle.id);
    assert(provResult.success, "autoProvisionCycleReviews executed successfully");
    assert(provResult.totalEmployees > 0, `Provisioned reviews for ${provResult.totalEmployees} employees`);

    // -------------------------------------------------------------
    // TEST 4: KPI Templates & Review Items Verification
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 4: KPI Templates and Review Items Verification");
    const kpiTemplates = await prisma.kpiTemplate.findMany({
      where: { companyId: company.id },
    });
    assert(kpiTemplates.length >= DEFAULT_CORPORATE_COMPETENCIES.length, `At least ${DEFAULT_CORPORATE_COMPETENCIES.length} KPI templates exist`);

    const reviews = await prisma.performanceReview.findMany({
      where: { cycleId: testCycle.id },
      include: { items: true, employee: true },
    });
    assert(reviews.length > 0, `Created ${reviews.length} reviews for the cycle`);
    assert(reviews[0].items.length > 0, `Review has ${reviews[0].items.length} evaluation items`);

    // -------------------------------------------------------------
    // TEST 5: Goal Creation & Check-in Flow
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 5: Goal Check-in Progress Flow");
    const sampleEmp = reviews[0].employee;
    const testGoal = await prisma.performanceGoal.create({
      data: {
        companyId: company.id,
        employeeId: sampleEmp.id,
        cycleId: testCycle.id,
        title: "Pencapaian SLA Uptime 99.9%",
        category: "KPI",
        metricUnit: "PERCENTAGE",
        targetValue: 100,
        currentValue: 50,
        weight: 30,
        status: "IN_PROGRESS",
      },
    });

    // Add Check-In
    const checkIn = await prisma.goalCheckIn.create({
      data: {
        goalId: testGoal.id,
        updatedByUserId: sampleEmp.userId,
        previousValue: 50,
        newValue: 90,
        progressPercent: 90,
        notes: "Uptime sistem tercapai 99.9% tanpa downtime.",
      },
    });

    const updatedGoal = await prisma.performanceGoal.update({
      where: { id: testGoal.id },
      data: { currentValue: 90, status: "IN_PROGRESS" },
    });

    assert(updatedGoal.currentValue === 90, "Goal currentValue updated to 90");
    assert(checkIn.progressPercent === 90, "GoalCheckIn progress percent recorded accurately");

    // -------------------------------------------------------------
    // TEST 6: Complete Appraisal Flow (Self -> Manager -> Final)
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 6: Complete Appraisal Flow & Scoring");
    const targetReview = reviews[0];

    // Step A: Self Assessment
    for (const item of targetReview.items) {
      await prisma.reviewItem.update({
        where: { id: item.id },
        data: {
          selfRating: 4.5,
          selfNotes: "Target diselesaikan dengan baik sesuai standar.",
        },
      });
    }

    const afterSelfItems = await prisma.reviewItem.findMany({
      where: { reviewId: targetReview.id },
    });
    const selfScores = calculateReviewScores(afterSelfItems);

    await prisma.performanceReview.update({
      where: { id: targetReview.id },
      data: {
        selfScore: selfScores.selfScore,
        selfSummary: "Pencapaian semester ini sangat solid dengan implementasi fitur tepat waktu.",
        selfSubmittedAt: new Date(),
        status: "MANAGER_ASSESSMENT",
      },
    });

    assert(selfScores.selfScore === 4.5, `Self review score is 4.5 (got ${selfScores.selfScore})`);

    // Step B: Manager Assessment
    for (const item of afterSelfItems) {
      await prisma.reviewItem.update({
        where: { id: item.id },
        data: {
          managerRating: 5.0,
          managerNotes: "Kinerja luar biasa, melebihi ekspektasi manajemen.",
          finalItemScore: 5.0,
        },
      });
    }

    const afterMgrItems = await prisma.reviewItem.findMany({
      where: { reviewId: targetReview.id },
    });
    const finalScores = calculateReviewScores(afterMgrItems);

    const completedReview = await prisma.performanceReview.update({
      where: { id: targetReview.id },
      data: {
        managerScore: finalScores.managerScore,
        managerSummary: "Karyawan teladan dengan dedikasi tinggi. Sangat direkomendasikan untuk promosi.",
        managerSubmittedAt: new Date(),
        finalScore: finalScores.finalScore,
        finalGrade: finalScores.finalGrade,
        promotionRecommended: true,
        salaryIncreaseRecommended: true,
        status: "COMPLETED",
      },
    });

    assert(completedReview.finalScore === 5.0, `Final score is 5.0 (got ${completedReview.finalScore})`);
    assert(completedReview.finalGrade === "A", `Final grade is Grade A (got ${completedReview.finalGrade})`);
    assert(completedReview.promotionRecommended === true, "Promotion recommendation flagged");
    assert(completedReview.status === "COMPLETED", "Review status reached COMPLETED");

    // Clean up test cycle
    await prisma.reviewItem.deleteMany({ where: { reviewId: targetReview.id } });
    await prisma.goalCheckIn.deleteMany({ where: { goalId: testGoal.id } });
    await prisma.performanceGoal.deleteMany({ where: { cycleId: testCycle.id } });
    await prisma.performanceReview.deleteMany({ where: { cycleId: testCycle.id } });
    await prisma.performanceCycle.delete({ where: { id: testCycle.id } });

    console.log("\n========================================================");
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("========================================================\n");

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error("❌ Test suite encountered fatal error:", err);
    process.exit(1);
  }
}

runTests().catch(console.error);
