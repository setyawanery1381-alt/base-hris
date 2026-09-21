import { prisma } from "../src/lib/db";
import {
  convertCandidateToEmployee,
  generateNextEmployeeId,
  PIPELINE_STAGES,
  DEFAULT_ONBOARDING_TASKS,
} from "../src/lib/recruitment-engine";

async function runTests() {
  console.log("🚀 Running BASE HRIS Phase 5 — Recruitment & Onboarding (ATS) Test Suite...\n");

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
    // TEST 1: Tenant Discovery
    // -------------------------------------------------------------
    console.log("👉 Test Suite 1: Company Discovery & Next Employee ID");
    const company = await prisma.company.findFirst({
      where: { code: "kanaya" },
      include: { departments: true, employees: true },
    });

    if (!company) {
      throw new Error("Seed company 'kanaya' not found! Ensure database is seeded.");
    }

    const nextId = await generateNextEmployeeId(company.id, company.code);
    assert(nextId.startsWith("KAN-") || nextId.startsWith("KNY-"), `Next employee ID generated: ${nextId}`);

    // -------------------------------------------------------------
    // TEST 2: Job Vacancy Posting
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 2: Job Vacancy Management");
    const testJob = await prisma.jobPosting.create({
      data: {
        companyId: company.id,
        departmentId: company.departments[0]?.id || null,
        title: "Senior Fullstack Engineer (Next.js)",
        slug: "senior-fullstack-engineer-nextjs",
        employmentType: "FULL_TIME",
        experienceLevel: "SENIOR",
        location: "Jakarta (Hybrid)",
        minSalary: 15000000,
        maxSalary: 22000000,
        quota: 2,
        description: "Mengembangkan arsitektur aplikasi SaaS HRIS multi-tenant.",
        requirements: "• Minimal 4 tahun pengalaman TypeScript, Next.js, dan Prisma.\n• Berpengalaman dengan sistem payroll dan absensi.",
        status: "PUBLISHED",
      },
    });

    assert(Boolean(testJob.id), `Job vacancy created: ${testJob.title}`);
    assert(testJob.quota === 2, "Job quota is 2");
    assert(testJob.status === "PUBLISHED", "Job status is PUBLISHED");

    // -------------------------------------------------------------
    // TEST 3: Candidate Application Submission
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 3: Candidate Application Submission");
    const candidateEmail = `kandidat.ats.${Date.now()}@gmail.com`;
    const testCandidate = await prisma.jobCandidate.create({
      data: {
        companyId: company.id,
        jobPostingId: testJob.id,
        fullName: "Dimas Aditya Ramadhan",
        email: candidateEmail,
        phone: "081299887766",
        currentCompany: "PT FinTech Nusantara",
        currentSalary: 14000000,
        expectedSalary: 18000000,
        noticePeriodDays: 30,
        stage: "APPLIED",
        source: "CAREER_PORTAL",
        notes: "Portofolio GitHub sangat aktif dan berpengalaman di startup unicorn.",
        resumeUrl: "https://drive.google.com/file/d/sample-resume",
      },
    });

    assert(Boolean(testCandidate.id), `Candidate application registered: ${testCandidate.fullName}`);
    assert(testCandidate.stage === "APPLIED", "Candidate initial stage is APPLIED");

    // -------------------------------------------------------------
    // TEST 4: Pipeline Stage Advancement & Screening
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 4: ATS Pipeline Stage Advancements");
    const screenedCandidate = await prisma.jobCandidate.update({
      where: { id: testCandidate.id },
      data: { stage: "SCREENING", rating: 4.5 },
    });
    assert(screenedCandidate.stage === "SCREENING", "Candidate moved to SCREENING");
    assert(screenedCandidate.rating === 4.5, "Candidate rating set to 4.5");

    // -------------------------------------------------------------
    // TEST 5: Interview Scheduling & Scorecard Evaluation
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 5: Interview Scheduling & Scorecard");
    const interview = await prisma.candidateInterview.create({
      data: {
        candidateId: testCandidate.id,
        stage: "INTERVIEW_USER",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        locationType: "ONLINE_MEETING",
        meetingLink: "https://meet.google.com/abc-test-call",
        status: "COMPLETED",
        interviewerScore: 4.8,
        feedbackNotes: "Pemahaman algoritma dan arsitektur database sangat mumpuni. Sangat direkomendasikan.",
        decision: "RECOMMEND_HIRE",
      },
    });

    assert(Boolean(interview.id), `Interview session completed: ${interview.stage}`);
    assert(interview.decision === "RECOMMEND_HIRE", "Interviewer decision is RECOMMEND_HIRE");

    // -------------------------------------------------------------
    // TEST 6: Job Offer Issuance
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 6: Job Offer Letter Issuance");
    const offer = await prisma.jobOffer.create({
      data: {
        candidateId: testCandidate.id,
        offeredPosition: "Senior Fullstack Engineer",
        offeredSalary: 18500000,
        allowanceDetails: "Tunjangan Transportasi & Komunikasi Rp 1.500.000 / bln",
        startDate: new Date("2026-10-01"),
        expiryDate: new Date("2026-10-08"),
        status: "ACCEPTED",
        notes: "Kandidat menyetujui offering letter.",
      },
    });

    assert(offer.offeredSalary === 18500000, `Job offer issued with salary Rp ${offer.offeredSalary}`);
    assert(offer.status === "ACCEPTED", "Offer status marked as ACCEPTED");

    // -------------------------------------------------------------
    // TEST 7: 1-Click Candidate-to-Employee Conversion
    // -------------------------------------------------------------
    console.log("\n👉 Test Suite 7: 1-Click Candidate-to-Employee Conversion");
    const conversionResult = await convertCandidateToEmployee({
      companyId: company.id,
      candidateId: testCandidate.id,
      departmentId: testJob.departmentId,
      joinDate: new Date("2026-10-01"),
      employmentStatus: "PROBATION",
      employmentType: "FULL_TIME",
      basicSalary: offer.offeredSalary,
    });

    assert(conversionResult.success === true, "1-Click conversion completed successfully");
    assert(Boolean(conversionResult.employee?.id), `New Employee created: ID ${conversionResult.employeeNumber}`);
    assert(conversionResult.user?.email === candidateEmail, `User account provisioned: ${conversionResult.user?.email}`);

    // Verify Personal Data
    const personalData = await prisma.employeePersonalData.findUnique({
      where: { employeeId: conversionResult.employee.id },
    });
    assert(personalData?.phone === testCandidate.phone, "EmployeePersonalData matches candidate phone");

    // Verify Salary Profile
    const salaryProfile = await prisma.employeeSalaryProfile.findUnique({
      where: { employeeId: conversionResult.employee.id },
    });
    assert(salaryProfile?.basicSalary === 18500000, `Salary profile created with offered salary: Rp ${salaryProfile?.basicSalary}`);

    // Verify Onboarding Tasks
    const onboardingTasks = await prisma.onboardingTask.findMany({
      where: { employeeId: conversionResult.employee.id },
    });
    assert(onboardingTasks.length === DEFAULT_ONBOARDING_TASKS.length, `Standard ${DEFAULT_ONBOARDING_TASKS.length} onboarding tasks seeded`);

    // Verify Candidate updated to HIRED
    const hiredCandidate = await prisma.jobCandidate.findUnique({
      where: { id: testCandidate.id },
    });
    assert(hiredCandidate?.stage === "HIRED", "Candidate stage updated to HIRED");
    assert(hiredCandidate?.hiredEmployeeId === conversionResult.employee.id, "Candidate hiredEmployeeId linked to new Employee");

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    await prisma.onboardingTask.deleteMany({ where: { employeeId: conversionResult.employee.id } });
    await prisma.employeeSalaryProfile.deleteMany({ where: { employeeId: conversionResult.employee.id } });
    await prisma.employeePersonalData.deleteMany({ where: { employeeId: conversionResult.employee.id } });
    await prisma.employee.delete({ where: { id: conversionResult.employee.id } });
    await prisma.user.delete({ where: { id: conversionResult.user.id } });
    await prisma.jobOffer.deleteMany({ where: { candidateId: testCandidate.id } });
    await prisma.candidateInterview.deleteMany({ where: { candidateId: testCandidate.id } });
    await prisma.jobCandidate.delete({ where: { id: testCandidate.id } });
    await prisma.jobPosting.delete({ where: { id: testJob.id } });

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
