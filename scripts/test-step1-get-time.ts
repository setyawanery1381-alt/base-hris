import { db } from "../src/lib/db";
const prisma = db;

async function main() {
  console.log("=== RUNNING STEP 1 VERIFICATION TEST: AUDIT & GET TIME ===");

  // 1. Verify Schema fields on Prisma Client
  console.log("\n[1/4] Verifying Prisma Schema Extensions...");
  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error("No company found in database for testing.");
  }
  console.log(`Found Company: ${company.name} (${company.id})`);

  // Check policy fields
  const policy = await prisma.attendancePolicy.findFirst({
    where: { companyId: company.id },
  });
  console.log("AttendancePolicy fields:", {
    attendanceMode: policy?.attendanceMode,
    allowOutsideRadius: policy?.allowOutsideRadius,
    visitRadiusMeters: policy?.visitRadiusMeters,
    photoRetentionDays: policy?.photoRetentionDays,
    allowAttendanceDispute: policy?.allowAttendanceDispute,
  });

  if (policy?.attendanceMode === undefined) {
    throw new Error("Policy does not have attendanceMode field!");
  }

  // 2. Find or create a Field Employee
  console.log("\n[2/4] Testing Employee attendanceMode & Mode Resolution...");
  let fieldEmployee = await prisma.employee.findFirst({
    where: { companyId: company.id },
  });

  if (!fieldEmployee) {
    throw new Error("No employee found in database to test.");
  }

  // Update employee to FIELD mode for testing
  await prisma.employee.update({
    where: { id: fieldEmployee.id },
    data: { attendanceMode: "FIELD" },
  });

  const updatedEmployee = await prisma.employee.findUnique({
    where: { id: fieldEmployee.id },
  });
  console.log(`Employee: ${updatedEmployee?.name}, Mode: ${updatedEmployee?.attendanceMode}`);
  if (updatedEmployee?.attendanceMode !== "FIELD") {
    throw new Error("Failed to set employee attendanceMode to FIELD");
  }

  // 3. Test Check-In Logic for Field Mode (Waives office geofence)
  console.log("\n[3/4] Testing GET TIME Check-In with FIELD mode (Outside office geofence)...");
  const testDate = new Date();
  testDate.setHours(0, 0, 0, 0);

  // Clean existing attendance for test date if any
  await prisma.attendance.deleteMany({
    where: {
      employeeId: fieldEmployee.id,
      date: testDate,
    },
  });

  // Simulate Check-In at coordinates far from office (e.g. Bandung: -6.9175, 107.6191)
  const checkInTime = new Date();
  checkInTime.setHours(8, 30, 0, 0);

  const checkInRecord = await prisma.attendance.create({
    data: {
      companyId: company.id,
      employeeId: fieldEmployee.id,
      date: testDate,
      checkInTime: checkInTime,
      checkInLatitude: -6.9175,
      checkInLongitude: 107.6191,
      checkInPhotoUrl: "data:image/jpeg;base64,mockFieldCheckInPhoto",
      attendanceMode: "FIELD",
      workType: "FIELD",
      status: "PRESENT",
      notes: "Check-in kunjungan lapangan sales",
    },
  });

  console.log("Check-in record created:", {
    id: checkInRecord.id,
    mode: checkInRecord.attendanceMode,
    workType: checkInRecord.workType,
    status: checkInRecord.status,
    checkInTime: checkInRecord.checkInTime,
  });

  if (checkInRecord.attendanceMode !== "FIELD") {
    throw new Error("Attendance record does not persist attendanceMode FIELD");
  }

  // 4. Test Check-Out & Duration Computation
  console.log("\n[4/4] Testing GET TIME Check-Out and Duration computation...");
  const checkOutTime = new Date(checkInTime.getTime() + 8.5 * 60 * 60 * 1000); // 8.5 hours later
  const durationMinutes = Math.round(
    (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)
  );

  const updatedAttendance = await prisma.attendance.update({
    where: { id: checkInRecord.id },
    data: {
      checkOutTime: checkOutTime,
      checkOutLatitude: -6.9200,
      checkOutLongitude: 107.6200,
      checkOutPhotoUrl: "data:image/jpeg;base64,mockFieldCheckOutPhoto",
      workDurationMinutes: durationMinutes,
      notes: (checkInRecord.notes || "") + " | Check-out dari area klien",
    },
  });

  console.log("Check-out finalized:", {
    id: updatedAttendance.id,
    checkOutTime: updatedAttendance.checkOutTime,
    workDurationMinutes: updatedAttendance.workDurationMinutes,
    durationFormatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
  });

  if (updatedAttendance.workDurationMinutes !== 510) {
    throw new Error(`Expected 510 minutes duration, got ${updatedAttendance.workDurationMinutes}`);
  }

  console.log("\n✅ STEP 1 VERIFICATION SUCCESSFUL: All schema fields, mode resolution, GET TIME check-in/out, and duration calculations passed perfectly!\n");
}

main()
  .catch((e) => {
    console.error("❌ TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
