/**
 * Comprehensive Automated Test Suite: STEP 3 — Attendance Engine
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.statusText}`);
  }
  const cookies = res.headers.get("set-cookie");
  const data = await res.json();
  return { cookies, user: data.user };
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("==========================================================");
  console.log("🚀 STARTING AUTOMATED TESTS: STEP 3 — ATTENDANCE ENGINE");
  console.log("==========================================================\n");

  try {
    // 1. Authenticate Actors
    console.log("--- 1. Authenticating Actors ---");
    const hr = await login("hr@kanaya.com", "KanayaHR#2026");
    assert(hr.user.roles && hr.user.roles.includes("HR_ADMIN"), "HR Admin logged in successfully");

    const emp = await login("employee@kanaya.com", "KanayaEmp#2026");
    assert(emp.user.roles && emp.user.roles.includes("EMPLOYEE"), "Employee (Rian Pratama) logged in successfully");

    const hrTenant2 = await login("hr@abc.com", "AbcPerkasa#2026");
    assert(hrTenant2.user.companyId !== hr.user.companyId, "Tenant 2 HR is isolated in separate company");

    // Clean up test data for idempotency
    const cleanNow = new Date();
    const cleanStart = new Date(Date.UTC(cleanNow.getFullYear(), cleanNow.getMonth(), cleanNow.getDate()));
    const cleanEnd = new Date(Date.UTC(cleanNow.getFullYear(), cleanNow.getMonth(), cleanNow.getDate(), 23, 59, 59, 999));

    await prisma.attendance.deleteMany({
      where: {
        employeeId: emp.user.employeeId,
        date: { gte: cleanStart, lte: cleanEnd },
      },
    });

    await prisma.attendanceCorrection.deleteMany({
      where: {
        employeeId: emp.user.employeeId,
      },
    });

    // Helper fetchers
    const empFetch = (url, options = {}) =>
      fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: emp.cookies,
        },
      });

    const hrFetch = (url, options = {}) =>
      fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: hr.cookies,
        },
      });

    const t2Fetch = (url, options = {}) =>
      fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: hrTenant2.cookies,
        },
      });

    // 2. Prepare dynamic shift matching current time window
    console.log("\n--- 2. Setting up dynamic active Shift for today ---");
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Create a shift whose start time includes now (e.g. starts 15 mins ago)
    const shiftStartH = curH;
    const shiftStartM = Math.max(0, curM - 10);
    const shiftEndH = (curH + 8) % 24;
    const shiftStartTime = `${String(shiftStartH).padStart(2, "0")}:${String(shiftStartM).padStart(2, "0")}`;
    const shiftEndTime = `${String(shiftEndH).padStart(2, "0")}:00`;

    // Create or get shift
    const createShiftRes = await hrFetch("/api/v1/schedules/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Shift Uji ${shiftStartTime}`,
        code: `TEST_${Date.now().toString().slice(-4)}`,
        startTime: shiftStartTime,
        endTime: shiftEndTime,
        breakDurationMinutes: 60,
      }),
    });
    const createShiftData = await createShiftRes.json();
    assert(createShiftRes.ok, `Created dynamic test shift (${shiftStartTime} - ${shiftEndTime})`);
    const testShiftId = createShiftData.shift?.id;

    // Assign shift to employee for today
    const assignRes = await hrFetch("/api/v1/schedules/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeIds: [emp.user.employeeId],
        startDate: todayStr,
        endDate: todayStr,
        shiftId: testShiftId,
        isOffDay: false,
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.ok, "Assigned dynamic shift to employee for today");

    // 3. Test GET /api/v1/attendance/today
    console.log("\n--- 3. GET /api/v1/attendance/today ---");
    const todayRes = await empFetch("/api/v1/attendance/today");
    assert(todayRes.ok, "GET /api/v1/attendance/today returned 200 OK");
    const todayData = await todayRes.json();
    assert(todayData.serverTime !== undefined, "Server time returned");
    assert(todayData.officeLocation !== undefined, "Office location returned");
    assert(todayData.shift !== undefined, "Shift info returned");
    assert(todayData.checkInWindow !== undefined, "Check-in window returned");
    assert(todayData.isOffDay === false, "isOffDay is false for assigned working shift");
    console.log(`  ℹ️ Effective Shift: ${todayData.shift?.name} (${todayData.shift?.startTime} - ${todayData.shift?.endTime})`);
    console.log(`  ℹ️ Office: ${todayData.officeLocation?.name} (lat: ${todayData.officeLocation?.latitude}, lon: ${todayData.officeLocation?.longitude})`);

    const officeLat = todayData.officeLocation?.latitude || -6.189099;
    const officeLng = todayData.officeLocation?.longitude || 106.738826;

    // 4. Test Check-In: Geofence Rejection
    console.log("\n--- 4. Check-In: Geofence Distance Rejection ---");
    const farLat = officeLat + 0.1; // ~11 km away
    const farLng = officeLng + 0.1;
    const geoFailRes = await empFetch("/api/v1/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: farLat,
        longitude: farLng,
        photoUrl: "data:image/jpeg;base64,mockphoto",
        workType: "WFO",
      }),
    });
    const geoFailData = await geoFailRes.json();
    assert(
      geoFailRes.status === 400 && geoFailData.error.includes("radius"),
      `Rejected check-in outside geofence (status: ${geoFailRes.status}, msg: "${geoFailData.error}")`
    );

    // 5. Test Check-In: Missing Selfie Rejection
    console.log("\n--- 5. Check-In: Missing Selfie Rejection ---");
    const noSelfieRes = await empFetch("/api/v1/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
        workType: "WFO",
      }),
    });
    const noSelfieData = await noSelfieRes.json();
    assert(
      noSelfieRes.status === 400 && noSelfieData.error.includes("selfie"),
      `Rejected check-in without selfie when required (status: ${noSelfieRes.status}, msg: "${noSelfieData.error}")`
    );

    // 6. Test Check-In: Off-Day Rejection
    console.log("\n--- 6. Check-In: Off-Day Validation ---");
    // Temporarily set today as off-day
    await hrFetch("/api/v1/schedules/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeIds: [emp.user.employeeId],
        startDate: todayStr,
        endDate: todayStr,
        shiftId: testShiftId,
        isOffDay: true,
      }),
    });

    const offDayCheckinRes = await empFetch("/api/v1/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
        photoUrl: "data:image/jpeg;base64,mockphoto",
        workType: "WFO",
      }),
    });
    const offDayCheckinData = await offDayCheckinRes.json();
    assert(
      offDayCheckinRes.status === 400 && offDayCheckinData.error.includes("Off-Day"),
      `Rejected check-in on Off-Day schedule (status: ${offDayCheckinRes.status}, msg: "${offDayCheckinData.error}")`
    );

    // Revert off-day back to working day with test shift
    await hrFetch("/api/v1/schedules/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeIds: [emp.user.employeeId],
        startDate: todayStr,
        endDate: todayStr,
        shiftId: testShiftId,
        isOffDay: false,
      }),
    });

    // 7. Test Check-In: Successful Valid Check-In
    console.log("\n--- 7. Check-In: Valid Check-In ---");
    const validCheckinRes = await empFetch("/api/v1/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
        photoUrl: "data:image/jpeg;base64,mockphoto-valid-selfie",
        workType: "WFO",
        notes: "Automated test check-in",
      }),
    });
    const validCheckinData = await validCheckinRes.json();
    assert(
      validCheckinRes.ok && validCheckinData.success,
      `Check-in succeeded (message: "${validCheckinData.message}")`
    );
    assert(
      validCheckinData.data && validCheckinData.data.checkInTime !== null,
      "checkInTime recorded with server timestamp"
    );
    assert(
      validCheckinData.data.checkInDistanceMeters !== null && validCheckinData.data.checkInDistanceMeters <= 100,
      `checkInDistanceMeters valid (${validCheckinData.data.checkInDistanceMeters}m)`
    );

    // 8. Test Check-In: Duplicate Check-In Rejection
    console.log("\n--- 8. Check-In: Duplicate Check-In Rejection ---");
    const dupCheckinRes = await empFetch("/api/v1/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
        photoUrl: "data:image/jpeg;base64,mockphoto-valid-selfie",
        workType: "WFO",
      }),
    });
    const dupCheckinData = await dupCheckinRes.json();
    assert(
      dupCheckinRes.status === 400 && dupCheckinData.error.includes("sudah"),
      `Rejected duplicate check-in (status: ${dupCheckinRes.status}, msg: "${dupCheckinData.error}")`
    );

    // 9. Test Check-Out: Successful Check-Out
    console.log("\n--- 9. Check-Out: Successful Check-Out with Duration & Early/OT ---");
    const validCheckoutRes = await empFetch("/api/v1/attendance/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
        photoUrl: "data:image/jpeg;base64,mockphoto-checkout",
        notes: "Automated test checkout",
      }),
    });
    const validCheckoutData = await validCheckoutRes.json();
    assert(
      validCheckoutRes.ok && validCheckoutData.success,
      `Check-out succeeded (message: "${validCheckoutData.message}")`
    );
    assert(
      validCheckoutData.data.checkOutTime !== null,
      "checkOutTime recorded with server timestamp"
    );
    assert(
      validCheckoutData.data.workDurationMinutes !== undefined,
      `workDurationMinutes computed (${validCheckoutData.data.workDurationMinutes} mins)`
    );
    assert(
      ["PRESENT", "EARLY_LEAVE", "LATE"].includes(validCheckoutData.data.status),
      `Status is valid: ${validCheckoutData.data.status}`
    );

    // 10. Test Check-Out: Duplicate Check-Out Rejection
    console.log("\n--- 10. Check-Out: Duplicate Check-Out Rejection ---");
    const dupCheckoutRes = await empFetch("/api/v1/attendance/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: officeLat,
        longitude: officeLng,
      }),
    });
    const dupCheckoutData = await dupCheckoutRes.json();
    assert(
      dupCheckoutRes.status === 400 && dupCheckoutData.error.includes("sudah"),
      `Rejected duplicate check-out (status: ${dupCheckoutRes.status}, msg: "${dupCheckoutData.error}")`
    );

    // 11. Test GET /api/v1/attendance/history
    console.log("\n--- 11. GET /api/v1/attendance/history ---");
    const curMonth = todayStr.substring(0, 7);
    const histRes = await empFetch(`/api/v1/attendance/history?month=${curMonth}`);
    assert(histRes.ok, "GET /api/v1/attendance/history returned 200 OK");
    const histData = await histRes.json();
    assert(histData.records && histData.records.length > 0, "History returns attendance records");
    assert(histData.summary.totalDays >= 1, `Summary totalDays computed (${histData.summary.totalDays})`);
    assert(histData.summary.totalWorkHours !== undefined, `Summary totalWorkHours computed (${histData.summary.totalWorkHours}h)`);

    // 12. Test GET /api/v1/attendance/records (Admin Portal)
    console.log("\n--- 12. GET /api/v1/attendance/records (Admin with Filters & Summary) ---");
    const adminRecRes = await hrFetch(`/api/v1/attendance/records?date=${todayStr}`);
    assert(adminRecRes.ok, "GET /api/v1/attendance/records returned 200 OK");
    const adminRecData = await adminRecRes.json();
    assert(adminRecData.records && adminRecData.records.length > 0, "Admin receives company records");
    assert(adminRecData.summary && adminRecData.summary.total >= 1, "Admin summary metrics computed");
    assert(adminRecData.departments && adminRecData.departments.length > 0, "Departments list returned for filtering");
    assert(adminRecData.employees && adminRecData.employees.length > 0, "Employees list returned for filtering");

    // Filter by employee
    const filteredEmpRes = await hrFetch(
      `/api/v1/attendance/records?date=${todayStr}&employeeId=${emp.user.employeeId}`
    );
    const filteredEmpData = await filteredEmpRes.json();
    assert(
      filteredEmpData.records.every((r) => r.employeeId === emp.user.employeeId),
      "Filtered correctly by employeeId"
    );

    // 13. Test Attendance Correction: Max Days Rejection
    console.log("\n--- 13. Attendance Correction: Max Days Rejection ---");
    const tooOldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oldCorrectionRes = await empFetch("/api/v1/attendance/correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: tooOldDate,
        requestedCheckIn: "08:00",
        requestedCheckOut: "17:00",
        reason: "Lupa absen bulan lalu",
      }),
    });
    const oldCorrectionData = await oldCorrectionRes.json();
    assert(
      oldCorrectionRes.status === 400 && oldCorrectionData.error.includes("maksimal"),
      `Rejected correction exceeding maxCorrectionDays (status: ${oldCorrectionRes.status}, msg: "${oldCorrectionData.error}")`
    );

    // 14. Test Attendance Correction: Employee Submits Valid Request
    console.log("\n--- 14. Attendance Correction: Employee Submits Request ---");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const submitCorrectionRes = await empFetch("/api/v1/attendance/correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: yesterday,
        requestedCheckIn: "08:30",
        requestedCheckOut: "17:30",
        reason: "Lupa absen karena ada perbaikan jaringan internet di kantor",
      }),
    });
    const submitCorrectionData = await submitCorrectionRes.json();
    assert(
      submitCorrectionRes.ok && submitCorrectionData.success,
      `Correction request submitted successfully (status: ${submitCorrectionData.data?.status})`
    );
    const correctionId = submitCorrectionData.data?.id;
    assert(submitCorrectionData.data?.status === "PENDING", "Correction status is PENDING");

    // 15. Test Attendance Correction: HR Admin Approves
    console.log("\n--- 15. Attendance Correction: HR Admin Approves Request ---");
    const approveRes = await hrFetch("/api/v1/attendance/correction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correctionId,
        action: "APPROVE",
        adminNotes: "Disetujui berdasarkan konfirmasi atasan",
      }),
    });
    const approveData = await approveRes.json();
    assert(
      approveRes.ok && approveData.success,
      `Correction approved by HR Admin (message: "${approveData.message}")`
    );
    assert(approveData.data.status === "APPROVED", "Correction status updated to APPROVED");

    // Verify Attendance record updated for yesterday
    const checkYesterdayRes = await hrFetch(
      `/api/v1/attendance/records?date=${yesterday}&employeeId=${emp.user.employeeId}`
    );
    const checkYesterdayData = await checkYesterdayRes.json();
    assert(
      checkYesterdayData.records.length > 0 && checkYesterdayData.records[0].status === "PRESENT",
      "Attendance record for yesterday successfully created/updated as PRESENT"
    );

    // 16. Test Attendance Correction: HR Admin Direct Apply
    console.log("\n--- 16. Attendance Correction: HR Admin Direct Apply ---");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const directApplyRes = await hrFetch("/api/v1/attendance/correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: emp.user.employeeId,
        date: twoDaysAgo,
        requestedCheckIn: "08:00",
        requestedCheckOut: "17:00",
        reason: "Koreksi langsung oleh HR",
        action: "APPLY_DIRECT",
      }),
    });
    const directApplyData = await directApplyRes.json();
    assert(
      directApplyRes.ok && directApplyData.success,
      `HR Admin direct apply succeeded (status: ${directApplyData.data?.status})`
    );

    // 17. Test Multi-Tenant Isolation
    console.log("\n--- 17. Multi-Tenant Isolation Verification ---");
    // Tenant 2 HR queries records for today
    const t2RecordsRes = await t2Fetch(`/api/v1/attendance/records?date=${todayStr}`);
    const t2RecordsData = await t2RecordsRes.json();
    const hasTenant1Employee = t2RecordsData.records.some(
      (r) => r.employeeId === emp.user.employeeId
    );
    assert(
      !hasTenant1Employee,
      "Tenant 2 CANNOT see Tenant 1 employee attendance records"
    );

    // Tenant 2 HR attempts to approve Tenant 1's correction
    const t2ApproveRes = await t2Fetch("/api/v1/attendance/correction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correctionId,
        action: "APPROVE",
      }),
    });
    assert(
      t2ApproveRes.status === 404,
      `Tenant 2 CANNOT approve Tenant 1 correction (status: ${t2ApproveRes.status} Not Found)`
    );

    // Summary
    console.log("\n==========================================================");
    console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==========================================================");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  }
}

main();
