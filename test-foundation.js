const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING BASE HRIS PHASE 1 FOUNDATION TESTS");
  console.log("==================================================");

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
    // TEST 1: Multi-Tenant Setup Verification
    console.log("\n[TEST 1] Multi-Tenant Separation & Branding Verification");
    const tenant1 = await prisma.company.findUnique({
      where: { code: "kanaya" },
      include: { branding: true, employees: true },
    });
    const tenant2 = await prisma.company.findUnique({
      where: { code: "abc" },
      include: { branding: true, employees: true },
    });

    assert(tenant1 !== null, "Tenant 1 (Kanaya) exists in database");
    assert(tenant2 !== null, "Tenant 2 (ABC) exists in database");
    assert(tenant1.branding.primaryColor === "#0d9488", "Tenant 1 has custom branding color (#0d9488 Teal)");
    assert(tenant2.branding.primaryColor === "#1e40af", "Tenant 2 has custom branding color (#1e40af Classic Blue)");
    assert(tenant1.branding.appName === "Kanaya HR Mobile", "Tenant 1 has custom app name 'Kanaya HR Mobile'");
    assert(tenant2.branding.appName === "ABC Employee Hub", "Tenant 2 has custom app name 'ABC Employee Hub'");

    // TEST 2: Tenant Isolation Check
    console.log("\n[TEST 2] Tenant Isolation (PRD Section 5)");
    const tenant1EmpIds = tenant1.employees.map(e => e.id);
    const tenant2EmpIds = tenant2.employees.map(e => e.id);

    const overlap = tenant1EmpIds.filter(id => tenant2EmpIds.includes(id));
    assert(overlap.length === 0, "Zero employee overlap between Tenant 1 and Tenant 2");

    const t2EmpsInT1Scope = await prisma.employee.findMany({
      where: { companyId: tenant1.id, employeeIdNumber: "ABC-001" },
    });
    assert(t2EmpsInT1Scope.length === 0, "Tenant 2 employee (ABC-001) is strictly invisible inside Tenant 1 query");

    // TEST 3: User Authentication & Passwords
    console.log("\n[TEST 3] Authentication Verification");
    const userKanaya = await prisma.user.findUnique({
      where: { email: "employee@kanaya.com" },
      include: { roles: { include: { role: true } }, employee: true },
    });
    assert(userKanaya !== null, "Employee user 'employee@kanaya.com' exists");
    const isPassValid = await bcrypt.compare("password123", userKanaya.passwordHash);
    assert(isPassValid, "Password hash matches 'password123'");
    assert(userKanaya.roles[0].role.name === "EMPLOYEE", "User role mapped correctly to 'EMPLOYEE'");

    // TEST 4: Initial Leave Balances & Entitlement
    console.log("\n[TEST 4] Leave Balances & Entitlements (PRD Section 16)");
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: userKanaya.employee.id },
      include: { leaveType: true },
    });
    assert(balances.length >= 2, "Employee has at least 2 active leave balances");
    const annualLeave = balances.find(b => b.leaveType.name === "Cuti Tahunan");
    assert(annualLeave !== undefined, "Cuti Tahunan balance initialized");
    assert(annualLeave.remaining === 8, "Cuti Tahunan remaining balance is 8 days (12 entitlement - 4 used)");

    // TEST 5: Employee Timeline History
    console.log("\n[TEST 5] Employee Career Timeline (PRD Section 13)");
    const timeline = await prisma.employeeEmploymentHistory.findMany({
      where: { employeeId: userKanaya.employee.id },
      orderBy: { eventDate: "asc" },
    });
    assert(timeline.length >= 2, "Employee has career timeline events");
    assert(timeline[0].eventType === "JOIN", "First event is 'JOIN' (Bergabung dengan Perusahaan)");
    assert(timeline[1].eventType === "PROMOTION", "Second event is 'PROMOTION' (Promosi ke Senior)");

    // TEST 6: Attendance Geofence Calculation Logic
    console.log("\n[TEST 6] Attendance Geofencing Math Verification");
    const officeLoc = await prisma.location.findFirst({
      where: { companyId: tenant1.id },
    });
    assert(officeLoc !== null, "Office location exists");

    function getDistanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Exact office coordinate
    const distZero = getDistanceMeters(officeLoc.latitude, officeLoc.longitude, officeLoc.latitude, officeLoc.longitude);
    assert(distZero === 0, "Distance at exact office coordinate is 0 meters");

    // Coordinate ~5km away
    const distFar = getDistanceMeters(officeLoc.latitude, officeLoc.longitude, officeLoc.latitude + 0.05, officeLoc.longitude + 0.05);
    assert(distFar > 5000, `Distance at outside coordinates is ${Math.round(distFar)}m (> 5000m)`);

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();