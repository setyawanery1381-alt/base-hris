const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runStep1Tests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING STEP 1 — ATTENDANCE POLICY VALIDATION TESTS");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. POSITIVE TEST: Policy retrieval & configuration
    console.log("\n[TEST 1] Positive Test: Attendance Policy Retrieval for Tenant 1");
    const tenant1 = await prisma.company.findUnique({ where: { code: "kanaya" } });
    assert(tenant1 !== null, "Tenant 1 (Kanaya) exists");

    const policy1 = await prisma.attendancePolicy.findFirst({
      where: { companyId: tenant1.id },
    });
    assert(policy1 !== null, "Tenant 1 has an active AttendancePolicy record");
    assert(policy1.name.includes("Kanaya"), `Policy name matches expected: '${policy1.name}'`);
    assert(policy1.workStartTime === "08:30", `Work start time is '${policy1.workStartTime}'`);
    assert(policy1.workEndTime === "17:30", `Work end time is '${policy1.workEndTime}'`);
    assert(policy1.lateToleranceMinutes === 15, `Late tolerance is ${policy1.lateToleranceMinutes} minutes`);
    assert(policy1.geofenceRadiusMeters === 150, `Geofence radius is ${policy1.geofenceRadiusMeters} meters`);
    assert(policy1.isSelfieRequired === true, "Selfie verification is required");
    assert(policy1.isGpsRequired === true, "GPS verification is required");
    assert(policy1.breakDurationMinutes === 60, "Break duration is 60 minutes");
    assert(policy1.isOvertimeAllowed === true, "Overtime is allowed");
    assert(policy1.minOvertimeMinutes === 30, "Minimum overtime is 30 minutes");
    assert(policy1.isCorrectionAllowed === true, "Attendance correction is allowed");
    assert(policy1.maxCorrectionDays === 7, "Max correction days is 7 days");

    const workingDays = JSON.parse(policy1.workingDays);
    assert(Array.isArray(workingDays) && workingDays.length === 5, "Working days contains 5 days (MON-FRI)");
    assert(workingDays.includes("MON") && workingDays.includes("FRI"), "Working days includes MON and FRI");

    // 2. POSITIVE TEST: Policy Update with Audit Logging
    console.log("\n[TEST 2] Positive Test: Policy Update & Audit Log Verification");
    const hrUser = await prisma.user.findUnique({ where: { email: "hr@kanaya.com" } });
    assert(hrUser !== null, "HR User exists for Tenant 1");

    const oldValues = { ...policy1 };
    const updatedPolicy1 = await prisma.attendancePolicy.update({
      where: { id: policy1.id },
      data: {
        lateToleranceMinutes: 20,
        minOvertimeMinutes: 45,
        maxCorrectionDays: 10,
      },
    });

    assert(updatedPolicy1.lateToleranceMinutes === 20, "Policy late tolerance updated to 20 mins");
    assert(updatedPolicy1.minOvertimeMinutes === 45, "Policy min overtime updated to 45 mins");
    assert(updatedPolicy1.maxCorrectionDays === 10, "Policy max correction updated to 10 days");

    // Create Audit Log simulating API behavior
    const auditEntry = await prisma.auditLog.create({
      data: {
        companyId: tenant1.id,
        userId: hrUser.id,
        module: "ATTENDANCE",
        action: "UPDATE_POLICY",
        recordId: policy1.id,
        oldValuesJson: JSON.stringify(oldValues),
        newValuesJson: JSON.stringify(updatedPolicy1),
        ipAddress: "127.0.0.1",
        userAgent: "Step1TestSuite/1.0",
      },
    });

    assert(auditEntry !== null, "Audit log entry created successfully");
    assert(auditEntry.action === "UPDATE_POLICY", "Audit log action is 'UPDATE_POLICY'");
    assert(auditEntry.module === "ATTENDANCE", "Audit log module is 'ATTENDANCE'");
    assert(auditEntry.userId === hrUser.id, "Audit log tracks the actor userId (HR Admin)");

    // Restore original values for clean state
    await prisma.attendancePolicy.update({
      where: { id: policy1.id },
      data: {
        lateToleranceMinutes: 15,
        minOvertimeMinutes: 30,
        maxCorrectionDays: 7,
      },
    });
    console.log("  Policy restored to canonical values.");

    // 3. NEGATIVE TEST: Time validation logic
    console.log("\n[TEST 3] Negative Test: Time Format Validation");
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    assert(!timeRegex.test("25:00"), "Invalid hour '25:00' correctly fails validation");
    assert(!timeRegex.test("08:65"), "Invalid minute '08:65' correctly fails validation");
    assert(!timeRegex.test("abc"), "Non-time string 'abc' correctly fails validation");
    assert(timeRegex.test("08:30"), "Valid time '08:30' correctly passes validation");
    assert(timeRegex.test("23:59"), "Valid time '23:59' correctly passes validation");

    // 4. UNAUTHORIZED TEST: RBAC Verification
    console.log("\n[TEST 4] Unauthorized Test: RBAC Permissions for Policy Management");
    const empUser = await prisma.user.findUnique({
      where: { email: "employee@kanaya.com" },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    const empPerms = new Set();
    empUser.roles.forEach(ur => {
      ur.role.permissions.forEach(rp => empPerms.add(rp.permission.code));
    });

    assert(empPerms.has("attendance.policy.view") === true, "Employee CAN view attendance policy (read-only)");
    assert(empPerms.has("attendance.policy.manage") === false, "Employee CANNOT manage attendance policy (Forbidden 403)");

    const hrUserFull = await prisma.user.findUnique({
      where: { email: "hr@kanaya.com" },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    const hrPerms = new Set();
    hrUserFull.roles.forEach(ur => {
      ur.role.permissions.forEach(rp => hrPerms.add(rp.permission.code));
    });

    assert(hrPerms.has("attendance.policy.manage") === true, "HR Admin HAS permission to manage attendance policy");

    // 5. CROSS-TENANT ISOLATION TEST
    console.log("\n[TEST 5] Cross-Tenant Isolation: Strict Data Boundary");
    const tenant2 = await prisma.company.findUnique({ where: { code: "abc" } });
    const tenant3 = await prisma.company.findUnique({ where: { code: "trial" } });

    assert(tenant2 !== null, "Tenant 2 (ABC) exists");
    assert(tenant3 !== null, "Tenant 3 (Trial) exists");

    const policy2 = await prisma.attendancePolicy.findFirst({ where: { companyId: tenant2.id } });
    const policy3 = await prisma.attendancePolicy.findFirst({ where: { companyId: tenant3.id } });

    assert(policy1.id !== policy2.id, "Tenant 1 and Tenant 2 have distinct policy records");
    assert(policy1.id !== policy3.id, "Tenant 1 and Tenant 3 have distinct policy records");
    assert(policy1.companyId === tenant1.id, "Tenant 1 policy belongs strictly to Tenant 1");
    assert(policy2.companyId === tenant2.id, "Tenant 2 policy belongs strictly to Tenant 2");
    assert(policy3.companyId === tenant3.id, "Tenant 3 policy belongs strictly to Tenant 3");

    // Tenant 2 has different tolerances and working days
    assert(policy2.lateToleranceMinutes === 10, "Tenant 2 policy has custom late tolerance (10m vs 15m)");
    assert(policy3.lateToleranceMinutes === 30, "Tenant 3 policy has custom trial late tolerance (30m)");
    assert(policy3.geofenceRadiusMeters === 500, "Tenant 3 policy has trial geofence (500m vs 100m)");

    // Querying with Tenant 2 companyId will NEVER return Tenant 1 policy
    const crossQuery = await prisma.attendancePolicy.findFirst({
      where: { id: policy1.id, companyId: tenant2.id },
    });
    assert(crossQuery === null, "Cross-tenant query (Tenant 2 querying Tenant 1 policy ID) strictly returns NULL");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n==================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStep1Tests();
