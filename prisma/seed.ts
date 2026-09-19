import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting BASE HRIS Database Seeding...");

  // 1. CLEAR EXISTING DATA (Respect foreign keys)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approvalHistory.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.approvalWorkflowStep.deleteMany();
  await prisma.approvalWorkflow.deleteMany();
  await prisma.hrServiceRequest.deleteMany();
  await prisma.reimbursement.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.permissionRequest.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.attendancePolicy.deleteMany();
  await prisma.employeeEmploymentHistory.deleteMany();
  await prisma.employeePersonalData.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.position.deleteMany();
  await prisma.team.deleteMany();
  await prisma.department.deleteMany();
  await prisma.division.deleteMany();
  await prisma.location.deleteMany();
  await prisma.companyFeature.deleteMany();
  await prisma.companySetting.deleteMany();
  await prisma.companyBranding.deleteMany();
  await prisma.company.deleteMany();

  // 2. CREATE SYSTEM ROLES
  const rolesData = [
    { name: "SUPER_ADMIN", description: "Platform Owner & Super Administrator", isSystem: true },
    { name: "HR_ADMIN", description: "Company HR Administrator", isSystem: true },
    { name: "MANAGER", description: "Department / Team Line Manager", isSystem: true },
    { name: "FINANCE", description: "Finance & Payroll Officer", isSystem: true },
    { name: "EMPLOYEE", description: "Regular Employee Self-Service", isSystem: true },
  ];

  const roles: Record<string, any> = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.create({ data: r });
  }

  // 3. CREATE PERMISSIONS
  const permissionsList = [
    // Platform
    { code: "tenant.manage", module: "tenant", description: "Manage companies & subscriptions" },
    { code: "feature.manage", module: "tenant", description: "Toggle company feature flags" },
    // Employee
    { code: "employee.view", module: "employee", description: "View employee profiles" },
    { code: "employee.create", module: "employee", description: "Create employee profiles" },
    { code: "employee.edit", module: "employee", description: "Edit employee profiles" },
    { code: "employee.delete", module: "employee", description: "Deactivate employee" },
    // Attendance
    { code: "attendance.view", module: "attendance", description: "View company attendance" },
    { code: "attendance.checkin", module: "attendance", description: "Perform check-in" },
    { code: "attendance.checkout", module: "attendance", description: "Perform check-out" },
    { code: "attendance.manage", module: "attendance", description: "Manage attendance policies & records" },
    // Leave & Permission
    { code: "leave.view", module: "leave", description: "View leave requests" },
    { code: "leave.create", module: "leave", description: "Submit leave request" },
    { code: "leave.approve", module: "leave", description: "Approve or reject leave request" },
    { code: "permission.view", module: "permission", description: "View permissions" },
    { code: "permission.create", module: "permission", description: "Submit permission" },
    { code: "permission.approve", module: "permission", description: "Approve permission" },
    // Overtime
    { code: "overtime.view", module: "overtime", description: "View overtime" },
    { code: "overtime.create", module: "overtime", description: "Submit overtime" },
    { code: "overtime.approve", module: "overtime", description: "Approve overtime" },
    // Payroll & Claims
    { code: "payroll.view", module: "payroll", description: "View payroll & payslips" },
    { code: "payroll.manage", module: "payroll", description: "Process payroll" },
    { code: "reimbursement.view", module: "reimbursement", description: "View reimbursements" },
    { code: "reimbursement.create", module: "reimbursement", description: "Submit reimbursement" },
    { code: "reimbursement.approve", module: "reimbursement", description: "Approve reimbursement" },
    { code: "reimbursement.pay", module: "reimbursement", description: "Disburse payment" },
    // Settings & Branding
    { code: "settings.manage", module: "settings", description: "Manage company settings" },
    { code: "branding.manage", module: "settings", description: "Manage white-label branding" },
    { code: "workflow.manage", module: "settings", description: "Manage approval workflows" },
    { code: "audit.view", module: "audit", description: "View audit logs" },
  ];

  const permissions: Record<string, any> = {};
  for (const p of permissionsList) {
    permissions[p.code] = await prisma.permission.create({ data: p });
  }

  // MAP ROLE PERMISSIONS
  // Super Admin: all
  for (const p of Object.values(permissions)) {
    await prisma.rolePermission.create({
      data: { roleId: roles["SUPER_ADMIN"].id, permissionId: p.id },
    });
  }

  // HR Admin: all except platform tenant.manage
  for (const p of Object.values(permissions)) {
    if (p.code !== "tenant.manage" && p.code !== "feature.manage") {
      await prisma.rolePermission.create({
        data: { roleId: roles["HR_ADMIN"].id, permissionId: p.id },
      });
    }
  }

  // Manager
  const managerPerms = [
    "employee.view", "attendance.view", "leave.view", "leave.create", "leave.approve",
    "permission.view", "permission.create", "permission.approve",
    "overtime.view", "overtime.create", "overtime.approve",
    "reimbursement.view", "reimbursement.create", "reimbursement.approve",
    "attendance.checkin", "attendance.checkout"
  ];
  for (const code of managerPerms) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: roles["MANAGER"].id, permissionId: permissions[code].id },
      });
    }
  }

  // Employee
  const employeePerms = [
    "attendance.checkin", "attendance.checkout", "attendance.view",
    "leave.create", "leave.view",
    "permission.create", "permission.view",
    "overtime.create", "overtime.view",
    "reimbursement.create", "reimbursement.view",
    "payroll.view"
  ];
  for (const code of employeePerms) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: roles["EMPLOYEE"].id, permissionId: permissions[code].id },
      });
    }
  }

  // Finance
  const financePerms = [
    "payroll.view", "payroll.manage", "reimbursement.view", "reimbursement.approve",
    "reimbursement.pay", "attendance.checkin", "attendance.checkout"
  ];
  for (const code of financePerms) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: roles["FINANCE"].id, permissionId: permissions[code].id },
      });
    }
  }

  const hrPassKanaya = await bcrypt.hash("KanayaHR#2026", 10);
  const mgrPassKanaya = await bcrypt.hash("KanayaMgr#2026", 10);
  const empPassKanaya = await bcrypt.hash("KanayaEmp#2026", 10);
  const hrPassAbc = await bcrypt.hash("AbcPerkasa#2026", 10);
  const trialPass = await bcrypt.hash("TrialClient#2026", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  // 4. SUPER ADMIN USER
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@basehris.com",
      passwordHash: adminPassword,
      name: "Global Platform Administrator",
      status: "ACTIVE",
      roles: {
        create: { roleId: roles["SUPER_ADMIN"].id },
      },
    },
  });

  // 5. SEED TENANT 1: "Kanaya Multi Solusindo"
  const company1 = await prisma.company.create({
    data: {
      name: "Kanaya Multi Solusindo",
      code: "kanaya",
      domain: "kanaya.hris.local",
      subscriptionPlan: "ENTERPRISE",
      status: "ACTIVE",
      branding: {
        create: {
          appName: "Kanaya HR Mobile",
          logoUrl: "/branding/kanaya-logo.svg",
          primaryColor: "#0d9488", // Teal 600
          secondaryColor: "#14b8a6", // Teal 500
          footerText: "© 2026 PT Kanaya Multi Solusindo",
        },
      },
      settings: {
        create: {
          timezone: "Asia/Jakarta",
          currency: "IDR",
          dateFormat: "YYYY-MM-DD",
          locale: "id",
        },
      },
    },
  });

  // Feature Flags for Tenant 1
  const features = ["employee", "attendance", "leave", "permission", "overtime", "payroll", "reimbursement"];
  for (const f of features) {
    await prisma.companyFeature.create({
      data: { companyId: company1.id, featureId: f, isEnabled: true },
    });
  }

  // Attendance Policy Tenant 1
  await prisma.attendancePolicy.create({
    data: {
      companyId: company1.id,
      name: "Kebijakan Kantor Utama (Kanaya)",
      workStartTime: "08:30",
      workEndTime: "17:30",
      lateToleranceMinutes: 15,
      geofenceRadiusMeters: 150,
      isSelfieRequired: true,
      isGpsRequired: true,
      breakDurationMinutes: 60,
    },
  });

  // Leave Types Tenant 1
  const leaveAnnual1 = await prisma.leaveType.create({
    data: { companyId: company1.id, name: "Cuti Tahunan", defaultEntitlement: 12, isPaid: true },
  });
  const leaveSick1 = await prisma.leaveType.create({
    data: { companyId: company1.id, name: "Cuti Sakit", defaultEntitlement: 14, isPaid: true, requiresAttachment: true },
  });
  const leaveSpecial1 = await prisma.leaveType.create({
    data: { companyId: company1.id, name: "Cuti Menikah/Khusus", defaultEntitlement: 3, isPaid: true },
  });

  // Organization Structure Tenant 1
  const divTech1 = await prisma.division.create({
    data: { companyId: company1.id, name: "Technology & Product", code: "TECH" },
  });
  const deptEng1 = await prisma.department.create({
    data: { companyId: company1.id, divisionId: divTech1.id, name: "Software Engineering", code: "ENG" },
  });
  const deptHr1 = await prisma.department.create({
    data: { companyId: company1.id, divisionId: divTech1.id, name: "Human Resources", code: "HRD" },
  });
  const deptFin1 = await prisma.department.create({
    data: { companyId: company1.id, divisionId: divTech1.id, name: "Finance & Accounting", code: "FIN" },
  });

  const posDev1 = await prisma.position.create({
    data: { companyId: company1.id, departmentId: deptEng1.id, name: "Senior Frontend Engineer", level: 3 },
  });
  const posLead1 = await prisma.position.create({
    data: { companyId: company1.id, departmentId: deptEng1.id, name: "Engineering Manager", level: 4 },
  });
  const posHr1 = await prisma.position.create({
    data: { companyId: company1.id, departmentId: deptHr1.id, name: "HR Manager", level: 4 },
  });
  const posFin1 = await prisma.position.create({
    data: { companyId: company1.id, departmentId: deptFin1.id, name: "Finance Specialist", level: 2 },
  });

  // Location: Jakarta Thamrin (Lat: -6.189099, Long: 106.738826 as seen in Pro-Int screenshot!)
  const locJkt1 = await prisma.location.create({
    data: {
      companyId: company1.id,
      name: "Head Office Jakarta (Puri Indah / Kembangan)",
      address: "Jl. Puri Indah Raya Blok U1, Jakarta Barat",
      latitude: -6.189099,
      longitude: 106.738826,
      radiusMeters: 150,
    },
  });

  // Create Users & Employees for Tenant 1
  // HR Admin
  const hrUser1 = await prisma.user.create({
    data: {
      companyId: company1.id,
      email: "hr@kanaya.com",
      passwordHash: hrPassKanaya,
      name: "Budi Santoso",
      roles: { create: { roleId: roles["HR_ADMIN"].id } },
    },
  });
  const hrEmp1 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      userId: hrUser1.id,
      employeeIdNumber: "KNY-001",
      firstName: "Budi",
      lastName: "Santoso",
      departmentId: deptHr1.id,
      positionId: posHr1.id,
      locationId: locJkt1.id,
      joinDate: new Date("2023-01-10"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
      personalData: {
        create: {
          gender: "MALE",
          phone: "081234567890",
          birthPlace: "Jakarta",
          birthDate: new Date("1988-04-12"),
          address: "Jl. Merdeka Barat No. 10, Jakarta",
          bankName: "BCA",
          bankAccountNumber: "8830129481",
          bankAccountHolder: "Budi Santoso",
          npwp: "09.123.456.7-012.000",
          bpjsKesehatan: "000123984712",
          bpjsKetenagakerjaan: "998127391823",
        },
      },
    },
  });

  // Manager
  const mgrUser1 = await prisma.user.create({
    data: {
      companyId: company1.id,
      email: "manager@kanaya.com",
      passwordHash: mgrPassKanaya,
      name: "Dewi Sartika",
      roles: { create: { roleId: roles["MANAGER"].id } },
    },
  });
  const mgrEmp1 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      userId: mgrUser1.id,
      employeeIdNumber: "KNY-002",
      firstName: "Dewi",
      lastName: "Sartika",
      departmentId: deptEng1.id,
      positionId: posLead1.id,
      locationId: locJkt1.id,
      joinDate: new Date("2023-03-01"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
      personalData: {
        create: {
          gender: "FEMALE",
          phone: "081298765432",
          birthPlace: "Bandung",
          birthDate: new Date("1990-08-20"),
          address: "Jl. Dago No. 14, Bandung",
          bankName: "Mandiri",
          bankAccountNumber: "132001928374",
          bankAccountHolder: "Dewi Sartika",
        },
      },
    },
  });

  // Employee (Reports to Dewi Sartika)
  const empUser1 = await prisma.user.create({
    data: {
      companyId: company1.id,
      email: "employee@kanaya.com",
      passwordHash: empPassKanaya,
      name: "Rian Pratama",
      roles: { create: { roleId: roles["EMPLOYEE"].id } },
    },
  });
  const empEmp1 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      userId: empUser1.id,
      employeeIdNumber: "KNY-003",
      firstName: "Rian",
      lastName: "Pratama",
      departmentId: deptEng1.id,
      positionId: posDev1.id,
      managerId: mgrEmp1.id,
      locationId: locJkt1.id,
      joinDate: new Date("2024-02-15"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
      personalData: {
        create: {
          gender: "MALE",
          phone: "081377889900",
          birthPlace: "Surabaya",
          birthDate: new Date("1995-11-05"),
          address: "Jl. Kebon Jeruk No. 5, Jakarta Barat",
          bankName: "BCA",
          bankAccountNumber: "5270918273",
          bankAccountHolder: "Rian Pratama",
          npwp: "12.345.678.9-012.000",
        },
      },
    },
  });

  // Employee Timeline for Rian Pratama
  await prisma.employeeEmploymentHistory.createMany({
    data: [
      {
        companyId: company1.id,
        employeeId: empEmp1.id,
        eventType: "JOIN",
        eventDate: new Date("2024-02-15"),
        title: "Joined PT Kanaya Multi Solusindo",
        description: "Hired as Frontend Engineer in Software Engineering Department",
      },
      {
        companyId: company1.id,
        employeeId: empEmp1.id,
        eventType: "PROMOTION",
        eventDate: new Date("2025-02-15"),
        title: "Promoted to Senior Frontend Engineer",
        description: "Outstanding performance in delivery of Mobile HRIS projects",
      },
    ],
  });

  // Initial Leave Balances for Rian Pratama
  await prisma.leaveBalance.create({
    data: {
      companyId: company1.id,
      employeeId: empEmp1.id,
      leaveTypeId: leaveAnnual1.id,
      year: 2026,
      entitlement: 12,
      used: 4,
      remaining: 8,
    },
  });
  await prisma.leaveBalance.create({
    data: {
      companyId: company1.id,
      employeeId: empEmp1.id,
      leaveTypeId: leaveSick1.id,
      year: 2026,
      entitlement: 14,
      used: 1,
      remaining: 13,
    },
  });

  // Approval Workflow Tenant 1 (Leave Request: Manager -> HR)
  const wfLeave1 = await prisma.approvalWorkflow.create({
    data: {
      companyId: company1.id,
      module: "LEAVE",
      name: "Standard Leave Approval Flow",
      description: "Direct Manager (Step 1) followed by HR Administrator (Step 2)",
      isActive: true,
      steps: {
        create: [
          { stepOrder: 1, approverType: "DIRECT_MANAGER" },
          { stepOrder: 2, approverType: "ROLE", approverRoleId: roles["HR_ADMIN"].id },
        ],
      },
    },
  });

  // Sample Pending Leave Request for Rian
  const leaveReq1 = await prisma.leaveRequest.create({
    data: {
      companyId: company1.id,
      employeeId: empEmp1.id,
      leaveTypeId: leaveAnnual1.id,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-02"),
      durationDays: 2,
      dayType: "FULL_DAY",
      reason: "Acara keluarga tahunan",
      status: "PENDING",
    },
  });

  const appReq1 = await prisma.approvalRequest.create({
    data: {
      companyId: company1.id,
      workflowId: wfLeave1.id,
      referenceModule: "LEAVE",
      referenceId: leaveReq1.id,
      requesterId: empUser1.id,
      currentStepOrder: 1,
      status: "PENDING",
      history: {
        create: {
          stepOrder: 0,
          actorId: empUser1.id,
          action: "SUBMITTED",
          comments: "Pengajuan Cuti Tahunan 2 hari",
        },
      },
    },
  });

  // Notification to Manager
  await prisma.notification.create({
    data: {
      companyId: company1.id,
      userId: mgrUser1.id,
      category: "APPROVAL",
      title: "Pengajuan Cuti Baru",
      message: "Rian Pratama mengajukan cuti tahunan (2 hari) untuk tanggal 01-02 Okt 2026.",
      referenceModule: "LEAVE",
      referenceId: leaveReq1.id,
    },
  });

  // 6. SEED TENANT 2: "PT ABC Perkasa"
  const company2 = await prisma.company.create({
    data: {
      name: "PT ABC Perkasa",
      code: "abc",
      domain: "abc.hris.local",
      subscriptionPlan: "PROFESSIONAL",
      status: "ACTIVE",
      branding: {
        create: {
          appName: "ABC Employee Hub",
          logoUrl: "/branding/abc-logo.svg",
          primaryColor: "#1e40af", // Classic Navy Blue
          secondaryColor: "#3b82f6", // Blue 500
          footerText: "© 2026 PT ABC Perkasa Indonesia",
        },
      },
      settings: {
        create: {
          timezone: "Asia/Jakarta",
          currency: "IDR",
          dateFormat: "YYYY-MM-DD",
          locale: "id",
        },
      },
    },
  });

  for (const f of features) {
    await prisma.companyFeature.create({
      data: { companyId: company2.id, featureId: f, isEnabled: true },
    });
  }

  const locSby2 = await prisma.location.create({
    data: {
      companyId: company2.id,
      name: "Kantor Cabang Surabaya",
      address: "Jl. Basuki Rahmat No. 45, Surabaya",
      latitude: -7.2575,
      longitude: 112.7521,
      radiusMeters: 100,
    },
  });

  await prisma.attendancePolicy.create({
    data: {
      companyId: company2.id,
      name: "Kebijakan Standard ABC",
      workStartTime: "08:00",
      workEndTime: "17:00",
      lateToleranceMinutes: 10,
      geofenceRadiusMeters: 100,
      isSelfieRequired: true,
      isGpsRequired: true,
      breakDurationMinutes: 60,
    },
  });

  // User for Tenant 2 (Strict Isolation verification!)
  const hrUser2 = await prisma.user.create({
    data: {
      companyId: company2.id,
      email: "hr@abc.com",
      passwordHash: hrPassAbc,
      name: "Ahmad Yani",
      roles: { create: { roleId: roles["HR_ADMIN"].id } },
    },
  });
  await prisma.employee.create({
    data: {
      companyId: company2.id,
      userId: hrUser2.id,
      employeeIdNumber: "ABC-001",
      firstName: "Ahmad",
      lastName: "Yani",
      locationId: locSby2.id,
      joinDate: new Date("2022-05-01"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
    },
  });

  // 7. SEED TENANT 3: "PT Demo Solusi Pratama" (Client Trial Sandbox)
  const company3 = await prisma.company.create({
    data: {
      name: "PT Demo Solusi Pratama (Client Trial)",
      code: "trial",
      domain: "trial.hris.local",
      subscriptionPlan: "ENTERPRISE",
      status: "ACTIVE",
      branding: {
        create: {
          appName: "Demo Solusi HR",
          logoUrl: "/branding/demo-logo.svg",
          primaryColor: "#0284c7", // Sky 600
          secondaryColor: "#38bdf8", // Sky 400
          footerText: "© 2026 PT Demo Solusi Pratama (Trial Sandbox)",
        },
      },
      settings: {
        create: {
          timezone: "Asia/Jakarta",
          currency: "IDR",
          dateFormat: "YYYY-MM-DD",
          locale: "id",
        },
      },
    },
  });

  for (const f of features) {
    await prisma.companyFeature.create({
      data: { companyId: company3.id, featureId: f, isEnabled: true },
    });
  }

  const locDemo3 = await prisma.location.create({
    data: {
      companyId: company3.id,
      name: "Kantor Pusat Demo (Thamrin)",
      address: "Jl. M.H. Thamrin No. 1, Jakarta Pusat",
      latitude: -6.1944,
      longitude: 106.8229,
      radiusMeters: 500,
    },
  });

  await prisma.attendancePolicy.create({
    data: {
      companyId: company3.id,
      name: "Kebijakan Kantor Demo",
      workStartTime: "08:00",
      workEndTime: "17:00",
      lateToleranceMinutes: 30,
      geofenceRadiusMeters: 500,
      isSelfieRequired: true,
      isGpsRequired: true,
      breakDurationMinutes: 60,
    },
  });

  // Client Trial Admin (HR Admin role)
  const trialAdminUser = await prisma.user.create({
    data: {
      companyId: company3.id,
      email: "klien@demohris.com",
      passwordHash: trialPass,
      name: "Klien Trial Admin",
      roles: { create: { roleId: roles["HR_ADMIN"].id } },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: company3.id,
      userId: trialAdminUser.id,
      employeeIdNumber: "TRL-001",
      firstName: "Klien",
      lastName: "Trial Admin",
      locationId: locDemo3.id,
      joinDate: new Date("2026-01-01"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
    },
  });

  // Client Trial Employee (Employee role)
  const trialEmpUser = await prisma.user.create({
    data: {
      companyId: company3.id,
      email: "karyawan@demohris.com",
      passwordHash: trialPass,
      name: "Budi Karyawan Demo",
      roles: { create: { roleId: roles["EMPLOYEE"].id } },
    },
  });

  await prisma.employee.create({
    data: {
      companyId: company3.id,
      userId: trialEmpUser.id,
      employeeIdNumber: "TRL-002",
      firstName: "Budi",
      lastName: "Karyawan Demo",
      locationId: locDemo3.id,
      joinDate: new Date("2026-01-01"),
      employmentStatus: "PERMANENT",
      employmentType: "FULL_TIME",
    },
  });

  console.log("✅ BASE HRIS Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
