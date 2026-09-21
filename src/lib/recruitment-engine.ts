import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "./audit";
import { PIPELINE_STAGES, DEFAULT_ONBOARDING_TASKS } from "./recruitment-constants";

export { PIPELINE_STAGES, DEFAULT_ONBOARDING_TASKS };

/**
 * Generates the next sequential employee ID for a company (e.g. KNY-004)
 */
export async function generateNextEmployeeId(companyId: string, companyCode: string = "EMP"): Promise<string> {
  const prefix = companyCode.toUpperCase().slice(0, 3);
  const count = await prisma.employee.count({ where: { companyId } });
  const nextNum = (count + 1).toString().padStart(3, "0");
  return `${prefix}-${nextNum}`;
}

/**
 * 1-Click Candidate to Employee Conversion Engine
 */
export async function convertCandidateToEmployee(params: {
  companyId: string;
  candidateId: string;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  locationId?: string | null;
  joinDate?: Date;
  employmentStatus?: string;
  employmentType?: string;
  basicSalary?: number;
  performedByUserId?: string;
}) {
  const {
    companyId,
    candidateId,
    departmentId,
    positionId,
    managerId,
    locationId,
    joinDate = new Date(),
    employmentStatus = "PROBATION",
    employmentType = "FULL_TIME",
    basicSalary,
    performedByUserId,
  } = params;

  const candidate = await prisma.jobCandidate.findFirst({
    where: { id: candidateId, companyId },
    include: { jobPosting: true, offers: true },
  });

  if (!candidate) {
    throw new Error("Kandidat tidak ditemukan");
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new Error("Perusahaan tidak ditemukan");
  }

  // Check if User account already exists with candidate email
  let user = await prisma.user.findUnique({ where: { email: candidate.email } });
  const initialPasswordHash = await bcrypt.hash("Welcome#2026", 10);

  if (!user) {
    // Get EMPLOYEE role
    const empRole = await prisma.role.findFirst({ where: { name: "EMPLOYEE" } });

    user = await prisma.user.create({
      data: {
        companyId,
        email: candidate.email,
        name: candidate.fullName,
        passwordHash: initialPasswordHash,
        status: "ACTIVE",
        roles: empRole
          ? {
              create: { roleId: empRole.id },
            }
          : undefined,
      },
    });
  }

  // Name splitting
  const nameParts = candidate.fullName.trim().split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || nameParts[0];

  const empIdNumber = await generateNextEmployeeId(companyId, company.code);

  // Check location fallback if none provided
  let locId = locationId;
  if (!locId) {
    const defaultLoc = await prisma.location.findFirst({ where: { companyId } });
    if (defaultLoc) locId = defaultLoc.id;
  }

  // Create Employee
  const employee = await prisma.employee.create({
    data: {
      companyId,
      userId: user.id,
      employeeIdNumber: empIdNumber,
      firstName,
      lastName,
      departmentId: departmentId || candidate.jobPosting?.departmentId || null,
      positionId: positionId || candidate.jobPosting?.positionId || null,
      managerId: managerId || null,
      locationId: locId || null,
      joinDate: new Date(joinDate),
      employmentStatus,
      employmentType,
      personalData: {
        create: {
          phone: candidate.phone,
          address: "Alamat belum dilengkapi karyawan",
        },
      },
    },
  });

  // Calculate salary: either explicitly passed or from accepted offer
  const salaryToUse =
    basicSalary ||
    candidate.offers.find((o) => o.status === "ACCEPTED")?.offeredSalary ||
    candidate.expectedSalary ||
    5000000;

  // Initialize Salary Profile
  await prisma.employeeSalaryProfile.create({
    data: {
      companyId,
      employeeId: employee.id,
      basicSalary: Number(salaryToUse),
      paymentType: "MONTHLY",
      bankName: "BCA",
      bankAccountNumber: "0000000000",
      bankAccountHolder: candidate.fullName,
      taxStatus: "TK/0",
    },
  });

  // Provision Standard Onboarding Tasks
  const onboardingTaskData = DEFAULT_ONBOARDING_TASKS.map((t) => {
    const dueDate = new Date(joinDate);
    dueDate.setDate(dueDate.getDate() + t.daysFromJoin);

    return {
      companyId,
      employeeId: employee.id,
      title: t.title,
      category: t.category,
      status: "PENDING",
      dueDate,
    };
  });

  await prisma.onboardingTask.createMany({
    data: onboardingTaskData,
  });

  // Update candidate status to HIRED
  const updatedCandidate = await prisma.jobCandidate.update({
    where: { id: candidateId },
    data: {
      stage: "HIRED",
      hiredEmployeeId: employee.id,
      notes: `Berhasil dikonversi menjadi karyawan aktif (${empIdNumber}) pada ${new Date().toLocaleDateString("id-ID")}.`,
    },
  });

  // Record audit log
  await recordAuditLog({
    companyId,
    userId: performedByUserId || user.id,
    module: "RECRUITMENT",
    action: "HIRE_CANDIDATE",
    recordId: candidateId,
    newValues: {
      candidateName: candidate.fullName,
      employeeId: employee.id,
      employeeNumber: empIdNumber,
      salary: salaryToUse,
    },
  });

  return {
    success: true,
    employee,
    user,
    candidate: updatedCandidate,
    employeeNumber: empIdNumber,
  };
}
