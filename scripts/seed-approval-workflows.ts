import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const DEFAULT_WORKFLOWS = [
  {
    module: "LEAVE",
    name: "Alur Persetujuan Cuti",
    description: "Persetujuan berjenjang: Atasan Langsung -> HR Admin",
    steps: [
      { stepOrder: 1, approverType: "DIRECT_MANAGER" },
      { stepOrder: 2, approverType: "ROLE", roleName: "HR_ADMIN" },
    ],
  },
  {
    module: "PERMISSION",
    name: "Alur Persetujuan Izin",
    description: "Persetujuan berjenjang: Atasan Langsung -> HR Admin",
    steps: [
      { stepOrder: 1, approverType: "DIRECT_MANAGER" },
      { stepOrder: 2, approverType: "ROLE", roleName: "HR_ADMIN" },
    ],
  },
  {
    module: "OVERTIME",
    name: "Alur Persetujuan Lembur",
    description: "Persetujuan berjenjang: Atasan Langsung -> HR Admin",
    steps: [
      { stepOrder: 1, approverType: "DIRECT_MANAGER" },
      { stepOrder: 2, approverType: "ROLE", roleName: "HR_ADMIN" },
    ],
  },
  {
    module: "REIMBURSEMENT",
    name: "Alur Persetujuan Reimbursement",
    description: "Persetujuan klaim pengeluaran: Atasan Langsung -> Finance / HR Admin",
    steps: [
      { stepOrder: 1, approverType: "DIRECT_MANAGER" },
      { stepOrder: 2, approverType: "ROLE", roleName: "HR_ADMIN" },
    ],
  },
];

export async function seedApprovalWorkflowsForCompany(companyId: string) {
  const hrRole = await prisma.role.findFirst({
    where: {
      OR: [
        { companyId, name: "HR_ADMIN" },
        { companyId: null, name: "HR_ADMIN" },
      ],
    },
  });

  const createdWorkflows = [];

  for (const wf of DEFAULT_WORKFLOWS) {
    let workflow = await prisma.approvalWorkflow.findFirst({
      where: { companyId, module: wf.module },
      include: { steps: true },
    });

    if (!workflow) {
      workflow = await prisma.approvalWorkflow.create({
        data: {
          companyId,
          module: wf.module,
          name: wf.name,
          description: wf.description,
          isActive: true,
        },
        include: { steps: true },
      });
    }

    // Ensure steps exist
    for (const st of wf.steps) {
      const stepExists = workflow.steps.find((s) => s.stepOrder === st.stepOrder);
      if (!stepExists) {
        await prisma.approvalWorkflowStep.create({
          data: {
            workflowId: workflow.id,
            stepOrder: st.stepOrder,
            approverType: st.approverType,
            approverRoleId: st.approverType === "ROLE" ? hrRole?.id || null : null,
          },
        });
      }
    }

    createdWorkflows.push(workflow);
  }

  return createdWorkflows;
}

async function main() {
  console.log("⚡ Seeding Multi-Level Approval Workflows for all companies...");
  const companies = await prisma.company.findMany();
  for (const comp of companies) {
    console.log(`- Seeding workflows for company: ${comp.name} (${comp.code})`);
    await seedApprovalWorkflowsForCompany(comp.id);
  }
  console.log("✅ Approval workflows successfully seeded!");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
