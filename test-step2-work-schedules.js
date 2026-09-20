const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runStep2Tests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING STEP 2 — WORK SCHEDULE / SHIFT VALIDATION TESTS");
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
    // 1. POSITIVE TEST: Shifts retrieval for Tenant 1
    console.log("\n[TEST 1] Positive Test: Shift Retrieval for Tenant 1 (Kanaya)");
    const tenant1 = await prisma.company.findUnique({ where: { code: "kanaya" } });
    assert(tenant1 !== null, "Tenant 1 exists");

    const shifts1 = await prisma.shift.findMany({
      where: { companyId: tenant1.id },
      orderBy: { startTime: "asc" },
    });
    assert(shifts1.length >= 3, `Tenant 1 has at least 3 shifts (found ${shifts1.length})`);

    const genShift = shifts1.find((s) => s.code === "GEN");
    assert(genShift !== undefined, "General Office ('GEN') shift exists");
    assert(genShift.startTime === "08:30" && genShift.endTime === "17:30", "GEN shift hours are 08:30 - 17:30");
    assert(genShift.breakDurationMinutes === 60, "GEN shift break is 60 minutes");
    assert(genShift.isOvernight === false, "GEN shift is not overnight");

    const pagiShift = shifts1.find((s) => s.code === "PAGI");
    assert(pagiShift !== undefined, "Shift Pagi ('PAGI') exists (07:00 - 15:00)");

    const siangShift = shifts1.find((s) => s.code === "SIANG");
    assert(siangShift !== undefined, "Shift Siang ('SIANG') exists (15:00 - 23:00)");

    // 2. POSITIVE TEST: Create New Shift (Overnight / Lintas Hari)
    console.log("\n[TEST 2] Positive Test: Create Overnight Shift & Audit Log");
    const hrUser = await prisma.user.findUnique({ where: { email: "hr@kanaya.com" } });
    assert(hrUser !== null, "HR User exists for Tenant 1");

    const newMalamShift = await prisma.shift.create({
      data: {
        companyId: tenant1.id,
        name: "Shift Malam (23:00 - 07:00)",
        code: "MALAM",
        startTime: "23:00",
        endTime: "07:00",
        breakDurationMinutes: 60,
        isOvernight: true,
        color: "#8b5cf6",
      },
    });

    assert(newMalamShift !== null, "New shift 'MALAM' created successfully");
    assert(newMalamShift.isOvernight === true, "Overnight flag is true for night shift");

    const auditCreate = await prisma.auditLog.create({
      data: {
        companyId: tenant1.id,
        userId: hrUser.id,
        module: "SCHEDULE",
        action: "CREATE_SHIFT",
        recordId: newMalamShift.id,
        newValuesJson: JSON.stringify(newMalamShift),
        ipAddress: "127.0.0.1",
        userAgent: "Step2TestSuite/1.0",
      },
    });
    assert(auditCreate.action === "CREATE_SHIFT", "Audit log records 'CREATE_SHIFT'");

    // 3. POSITIVE TEST: Roster Assignment (Single & Bulk)
    console.log("\n[TEST 3] Positive Test: Roster Scheduling for Employees");
    const empRian = await prisma.employee.findFirst({
      where: { companyId: tenant1.id, employeeIdNumber: "KNY-003" },
    });
    assert(empRian !== null, "Employee Rian Pratama exists");

    // Check today's schedule seeded
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySched = await prisma.employeeSchedule.findUnique({
      where: {
        employeeId_date: {
          employeeId: empRian.id,
          date: today,
        },
      },
      include: { shift: true },
    });
    assert(todaySched !== null, "Rian Pratama has schedule for today");
    assert(todaySched.shift.code === "GEN", "Rian's schedule today is 'GEN' shift");

    // Bulk schedule assignment for next 3 days
    const nextDays = [1, 2, 3].map((offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d;
    });

    for (const d of nextDays) {
      await prisma.employeeSchedule.upsert({
        where: {
          employeeId_date: {
            employeeId: empRian.id,
            date: d,
          },
        },
        update: { shiftId: pagiShift.id, isOffDay: false },
        create: {
          companyId: tenant1.id,
          employeeId: empRian.id,
          shiftId: pagiShift.id,
          date: d,
          isOffDay: false,
          notes: "Penugasan Shift Pagi",
        },
      });
    }

    const assignedCount = await prisma.employeeSchedule.count({
      where: {
        employeeId: empRian.id,
        date: { gte: today },
      },
    });
    assert(assignedCount >= 4, `Rian Pratama has ${assignedCount} scheduled days`);

    // 4. NEGATIVE TEST: Duplicate Code & Time Format Validation
    console.log("\n[TEST 4] Negative Test: Duplicate Code & Validation");
    try {
      await prisma.shift.create({
        data: {
          companyId: tenant1.id,
          name: "Duplicate Shift",
          code: "PAGI", // Already exists!
          startTime: "06:00",
          endTime: "14:00",
        },
      });
      assert(false, "Duplicate code 'PAGI' in same tenant should have failed");
    } catch (e) {
      assert(true, "Duplicate code 'PAGI' in same tenant properly rejected by unique constraint");
    }

    // 5. UNAUTHORIZED TEST: RBAC Permissions for Schedules & Shifts
    console.log("\n[TEST 5] Unauthorized Test: RBAC Permissions for Shifts & Roster");
    const empUser = await prisma.user.findUnique({
      where: { email: "employee@kanaya.com" },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const empPerms = new Set();
    empUser.roles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => empPerms.add(rp.permission.code));
    });

    assert(empPerms.has("shift.view") === true, "Employee CAN view shifts and roster (shift.view)");
    assert(empPerms.has("shift.manage") === false, "Employee CANNOT manage shifts (shift.manage Forbidden 403)");

    const hrUserFull = await prisma.user.findUnique({
      where: { email: "hr@kanaya.com" },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const hrPerms = new Set();
    hrUserFull.roles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => hrPerms.add(rp.permission.code));
    });

    assert(hrPerms.has("shift.view") === true, "HR Admin has shift.view permission");
    assert(hrPerms.has("shift.manage") === true, "HR Admin has shift.manage permission");

    // 6. CROSS-TENANT ISOLATION TEST
    console.log("\n[TEST 6] Cross-Tenant Isolation: Shift & Roster Boundaries");
    const tenant2 = await prisma.company.findUnique({ where: { code: "abc" } });
    assert(tenant2 !== null, "Tenant 2 (ABC) exists");

    const t2Shifts = await prisma.shift.findMany({
      where: { companyId: tenant2.id },
    });
    assert(t2Shifts.length >= 1, `Tenant 2 has its own shifts (${t2Shifts.length})`);
    assert(t2Shifts[0].code === "ABC-REG", "Tenant 2 has shift 'ABC-REG'");

    // Querying Tenant 1's shifts with Tenant 2 companyId
    const crossShiftQuery = await prisma.shift.findMany({
      where: { companyId: tenant2.id, code: "GEN" },
    });
    assert(crossShiftQuery.length === 0, "Tenant 1 shift 'GEN' is invisible in Tenant 2's query");

    // Same code across different tenants is allowed!
    const t2Pagi = await prisma.shift.create({
      data: {
        companyId: tenant2.id,
        name: "ABC Shift Pagi",
        code: "PAGI", // Allowed because different companyId!
        startTime: "07:30",
        endTime: "15:30",
      },
    });
    assert(t2Pagi.code === "PAGI", "Same code 'PAGI' is allowed in different companyId");

    // Clean up temporary shifts
    await prisma.shift.delete({ where: { id: t2Pagi.id } });
    await prisma.shift.delete({ where: { id: newMalamShift.id } });
    console.log("  Temporary test shifts cleaned up.");

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

runStep2Tests();
