import { prisma } from "../src/lib/db";
import { convertCandidateToEmployee } from "../src/lib/recruitment-engine";

async function main() {
  console.log("🌱 Seeding Recruitment & Onboarding (ATS) demo data...");

  const companies = await prisma.company.findMany({
    include: { departments: true },
  });

  for (const comp of companies) {
    console.log(`Processing company: ${comp.name} (${comp.code})`);

    const existingJobs = await prisma.jobPosting.count({ where: { companyId: comp.id } });
    if (existingJobs === 0) {
      const itDept = comp.departments.find((d) => d.name.toLowerCase().includes("tech") || d.name.toLowerCase().includes("it")) || comp.departments[0];
      const hrDept = comp.departments.find((d) => d.name.toLowerCase().includes("hr")) || comp.departments[0];

      // 1. Job Postings
      const job1 = await prisma.jobPosting.create({
        data: {
          companyId: comp.id,
          departmentId: itDept?.id || null,
          title: "Senior Frontend Engineer (React / Next.js)",
          slug: "senior-frontend-engineer",
          employmentType: "FULL_TIME",
          experienceLevel: "SENIOR",
          location: "Jakarta (Hybrid)",
          minSalary: 16000000,
          maxSalary: 24000000,
          quota: 2,
          description: "Bertanggung jawab memimpin arsitektur antarmuka aplikasi HRIS, performa web, dan integrasi design system.",
          requirements: "• Minimal 3-5 tahun pengalaman React/Next.js dan TypeScript.\n• Memahami state management, SSR, TailwindCSS, dan testing.\n• Memiliki portofolio aplikasi web skala produksi.",
          status: "PUBLISHED",
        },
      });

      const job2 = await prisma.jobPosting.create({
        data: {
          companyId: comp.id,
          departmentId: hrDept?.id || null,
          title: "HR Talent Acquisition & People Ops",
          slug: "hr-talent-acquisition",
          employmentType: "FULL_TIME",
          experienceLevel: "MID",
          location: "Jakarta (On-site)",
          minSalary: 8000000,
          maxSalary: 12000000,
          quota: 1,
          description: "Mengelola end-to-end recruitment lifecycle, sourcing kandidat potensial, dan proses onboarding karyawan baru.",
          requirements: "• Minimal 2 tahun pengalaman di bidang talent acquisition / recruitment.\n• Terbiasa mengoperasikan sistem ATS dan job portal.\n• Kemampuan interpersonal dan negosiasi yang baik.",
          status: "PUBLISHED",
        },
      });

      const job3 = await prisma.jobPosting.create({
        data: {
          companyId: comp.id,
          departmentId: itDept?.id || null,
          title: "Backend Engineer (Node.js / PostgreSQL)",
          slug: "backend-engineer",
          employmentType: "FULL_TIME",
          experienceLevel: "MID",
          location: "Bandung / Remote",
          minSalary: 12000000,
          maxSalary: 18000000,
          quota: 1,
          description: "Merancang API RESTful berkecepatan tinggi, database schema, dan optimasi query PostgreSQL.",
          requirements: "• Minimal 2-4 tahun pengalaman Node.js, Prisma, dan PostgreSQL.\n• Berpengalaman dengan sistem autentikasi JWT dan multi-tenant.",
          status: "PUBLISHED",
        },
      });

      console.log(`  Created 3 job postings for ${comp.name}`);

      // 2. Candidates in various stages
      // Candidate 1: APPLIED
      await prisma.jobCandidate.create({
        data: {
          companyId: comp.id,
          jobPostingId: job1.id,
          fullName: "Bagus Setiawan",
          email: `bagus.setiawan.${comp.code}@gmail.com`,
          phone: "081211223344",
          currentCompany: "PT FinTek Solusi",
          currentSalary: 15000000,
          expectedSalary: 18000000,
          noticePeriodDays: 30,
          stage: "APPLIED",
          rating: 4.0,
          source: "CAREER_PORTAL",
          notes: "Portofolio GitHub menarik dengan pengalaman Next.js.",
          resumeUrl: "https://drive.google.com/file/d/sample-resume",
        },
      });

      // Candidate 2: SCREENING
      await prisma.jobCandidate.create({
        data: {
          companyId: comp.id,
          jobPostingId: job1.id,
          fullName: "Annisa Permata Putri",
          email: `annisa.putri.${comp.code}@gmail.com`,
          phone: "081399887766",
          currentCompany: "PT Ecommerce Jaya",
          currentSalary: 17000000,
          expectedSalary: 21000000,
          noticePeriodDays: 30,
          stage: "SCREENING",
          rating: 4.5,
          source: "LINKEDIN",
          notes: "Cocok untuk posisi Senior Frontend. Akan dijadwalkan wawancara HR.",
          resumeUrl: "https://drive.google.com/file/d/sample-resume-2",
        },
      });

      // Candidate 3: INTERVIEW_HR
      const cand3 = await prisma.jobCandidate.create({
        data: {
          companyId: comp.id,
          jobPostingId: job2.id,
          fullName: "Farhan Maulana",
          email: `farhan.maulana.${comp.code}@gmail.com`,
          phone: "081755443322",
          currentCompany: "PT Logistik Prima",
          currentSalary: 8500000,
          expectedSalary: 10500000,
          noticePeriodDays: 14,
          stage: "INTERVIEW_HR",
          rating: 4.2,
          source: "JOB_FAIR",
          resumeUrl: "https://drive.google.com/file/d/sample-resume-3",
        },
      });
      await prisma.candidateInterview.create({
        data: {
          candidateId: cand3.id,
          stage: "INTERVIEW_HR",
          scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          locationType: "ONLINE_MEETING",
          meetingLink: "https://meet.google.com/kny-hr-interview",
          status: "SCHEDULED",
        },
      });

      // Candidate 4: OFFERING
      const cand4 = await prisma.jobCandidate.create({
        data: {
          companyId: comp.id,
          jobPostingId: job3.id,
          fullName: "Reza Rahardian Pratama",
          email: `reza.pratama.${comp.code}@gmail.com`,
          phone: "081988776655",
          currentCompany: "PT Cloud Cipta",
          currentSalary: 13000000,
          expectedSalary: 16000000,
          noticePeriodDays: 30,
          stage: "OFFERING",
          rating: 4.8,
          source: "REFERRAL",
          notes: "Hasil tes teknis memuaskan. Telah diterbitkan offering letter.",
          resumeUrl: "https://drive.google.com/file/d/sample-resume-4",
        },
      });
      await prisma.jobOffer.create({
        data: {
          candidateId: cand4.id,
          offeredPosition: "Backend Engineer",
          offeredSalary: 16500000,
          allowanceDetails: "Tunjangan Internet & Remote Working Rp 1.000.000 / bln",
          startDate: new Date("2026-10-15"),
          expiryDate: new Date("2026-10-22"),
          status: "SENT",
        },
      });

      // Candidate 5: HIRED (Converted to Employee)
      const cand5 = await prisma.jobCandidate.create({
        data: {
          companyId: comp.id,
          jobPostingId: job1.id,
          fullName: "Indah Wahyuni",
          email: `indah.wahyuni.${comp.code}@gmail.com`,
          phone: "081122334455",
          currentCompany: "PT Software Mandiri",
          currentSalary: 16000000,
          expectedSalary: 19000000,
          noticePeriodDays: 14,
          stage: "OFFERING",
          rating: 4.9,
          source: "CAREER_PORTAL",
          resumeUrl: "https://drive.google.com/file/d/sample-resume-5",
        },
      });

      // 1-Click Convert Indah Wahyuni to Employee
      const hireRes = await convertCandidateToEmployee({
        companyId: comp.id,
        candidateId: cand5.id,
        departmentId: itDept?.id,
        joinDate: new Date("2026-09-15"),
        employmentStatus: "PROBATION",
        employmentType: "FULL_TIME",
        basicSalary: 19000000,
      });

      console.log(`  Converted candidate ${cand5.fullName} -> Employee ID: ${hireRes.employeeNumber}`);
    }
  }

  console.log("✅ Finished Recruitment & Onboarding seeding!");
}

main().catch(console.error);
