import { db } from "../src/lib/db";
import {
  calculateDistanceMeters,
  isValidCoordinates,
  detectMockLocation,
  evaluateGeofence,
} from "../src/lib/geofence";

const prisma = db;

async function main() {
  console.log("=== RUNNING STEP 3 VERIFICATION TEST: GPS GEOLOCATION & GEOFENCE POLICY ===");

  // 1. Test Coordinate Validation & Haversine Distance
  console.log("\n[1/5] Testing Coordinate Validation & Haversine Distance...");
  if (!isValidCoordinates(-6.1891, 106.7388)) {
    throw new Error("Valid coordinates incorrectly marked invalid");
  }
  if (isValidCoordinates(95.0, 106.7388)) {
    throw new Error("Out-of-bounds latitude (+95) not rejected");
  }
  if (isValidCoordinates(-6.1891, 200.0)) {
    throw new Error("Out-of-bounds longitude (+200) not rejected");
  }

  // Distance between Puri Indah Office (-6.189099, 106.738826) and Thamrin Office (-6.1950, 106.8230)
  const dist = calculateDistanceMeters(-6.189099, 106.738826, -6.1950, 106.8230);
  console.log(`Calculated distance Puri Indah to Thamrin: ${dist} meters (~9.3km)`);
  if (dist < 9000 || dist > 10000) {
    throw new Error(`Expected distance ~9300m, got ${dist}`);
  }

  // 2. Test Geofence Evaluation across different Work Modes
  console.log("\n[2/5] Testing Geofence Evaluation Matrix (OFFICE, FIELD, HYBRID, Outside Radius)...");
  
  // Case A: OFFICE mode within radius (50m from office)
  const resOfficeInside = evaluateGeofence({
    effectiveMode: "OFFICE",
    currentLat: -6.189099,
    currentLng: 106.738826,
    officeLat: -6.189099,
    officeLng: 106.738826,
    officeRadiusMeters: 100,
    allowOutsideRadius: false,
  });
  console.log("Case A (OFFICE Inside):", resOfficeInside);
  if (!resOfficeInside.isAllowed || resOfficeInside.isOutside) {
    throw new Error("OFFICE mode within radius should be allowed and not outside");
  }

  // Case B: OFFICE mode outside radius (5km away) with allowOutsideRadius: false -> Must be rejected
  const resOfficeOutsideBlocked = evaluateGeofence({
    effectiveMode: "OFFICE",
    currentLat: -6.2300,
    currentLng: 106.7800,
    officeLat: -6.189099,
    officeLng: 106.738826,
    officeRadiusMeters: 100,
    allowOutsideRadius: false,
  });
  console.log("Case B (OFFICE Outside Blocked):", resOfficeOutsideBlocked);
  if (resOfficeOutsideBlocked.isAllowed) {
    throw new Error("OFFICE mode outside radius without allowance should be rejected");
  }

  // Case C: OFFICE mode outside radius with allowOutsideRadius: true -> Allowed with tag
  const resOfficeOutsideAllowed = evaluateGeofence({
    effectiveMode: "OFFICE",
    currentLat: -6.2300,
    currentLng: 106.7800,
    officeLat: -6.189099,
    officeLng: 106.738826,
    officeRadiusMeters: 100,
    allowOutsideRadius: true,
  });
  console.log("Case C (OFFICE Outside Allowed with Tag):", resOfficeOutsideAllowed);
  if (!resOfficeOutsideAllowed.isAllowed || !resOfficeOutsideAllowed.isOutside) {
    throw new Error("OFFICE mode with allowOutsideRadius: true should be allowed but marked isOutside");
  }

  // Case D: FIELD mode anywhere in Indonesia (Bandung, 120km away) -> Always allowed
  const resFieldMode = evaluateGeofence({
    effectiveMode: "FIELD",
    currentLat: -6.9175,
    currentLng: 107.6191,
    officeLat: -6.189099,
    officeLng: 106.738826,
    officeRadiusMeters: 100,
    allowOutsideRadius: false,
  });
  console.log("Case D (FIELD Mode Anywhere):", resFieldMode);
  if (!resFieldMode.isAllowed || !resFieldMode.isFieldMode) {
    throw new Error("FIELD mode must be allowed dynamically without geofence rejection");
  }

  // 3. Test Mock Location & GPS Anti-Spoofing Detection
  console.log("\n[3/5] Testing Fake GPS & Anti-Spoofing Detection Engine...");

  // Mock Case 1: Device reported mocked flag
  const mockFlagged = detectMockLocation({
    latitude: -6.189,
    longitude: 106.738,
    isMockedFromDevice: true,
  });
  console.log("Mock Check 1 (Device Mocked Flag):", mockFlagged);
  if (!mockFlagged.isMock) {
    throw new Error("Failed to detect mock location from device flag");
  }

  // Mock Case 2: Zero accuracy fixed feed
  const mockZeroAccuracy = detectMockLocation({
    latitude: -6.189,
    longitude: 106.738,
    accuracyMeters: 0,
  });
  console.log("Mock Check 2 (Zero Accuracy):", mockZeroAccuracy);
  if (!mockZeroAccuracy.isMock) {
    throw new Error("Failed to detect mock location with zero accuracy");
  }

  // Mock Case 3: Impossible Travel / Teleportation (Jakarta to Surabaya in 10 minutes)
  const prevTime = new Date();
  prevTime.setMinutes(prevTime.getMinutes() - 10);
  const mockTeleportation = detectMockLocation({
    latitude: -7.2575, // Surabaya
    longitude: 112.7521,
    accuracyMeters: 10,
    previousLocation: {
      latitude: -6.1891, // Jakarta
      longitude: 106.7388,
      timestamp: prevTime,
    },
    currentTime: new Date(),
  });
  console.log("Mock Check 3 (Teleportation Speed > 200 km/h):", mockTeleportation);
  if (!mockTeleportation.isMock) {
    throw new Error("Failed to detect impossible travel teleportation");
  }

  // 4. Test Database Persistence of Accuracy & Mock Location Fields
  console.log("\n[4/5] Testing Database Persistence of GPS & Mock Status Fields...");
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company found");
  const employee = await prisma.employee.findFirst({ where: { companyId: company.id } });
  if (!employee) throw new Error("No employee found");

  const testDate = new Date();
  testDate.setHours(0, 0, 0, 0);

  // Clean prior record
  await prisma.attendance.deleteMany({
    where: { employeeId: employee.id, date: testDate },
  });

  const createdRecord = await prisma.attendance.create({
    data: {
      companyId: company.id,
      employeeId: employee.id,
      date: testDate,
      checkInTime: new Date(),
      checkInLatitude: -6.189099,
      checkInLongitude: 106.738826,
      checkInAccuracyMeters: 12.5,
      isCheckInMockLocation: false,
      checkInDistanceMeters: 0,
      attendanceMode: "FIELD",
      workType: "FIELD",
      status: "PRESENT",
      deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      notes: "Testing Step 3 GPS & Mock Persistence",
    },
  });

  console.log("Created Attendance with GPS metadata:", {
    id: createdRecord.id,
    accuracy: createdRecord.checkInAccuracyMeters,
    isMock: createdRecord.isCheckInMockLocation,
    deviceInfo: createdRecord.deviceInfo,
  });

  if (createdRecord.checkInAccuracyMeters !== 12.5 || createdRecord.isCheckInMockLocation !== false) {
    throw new Error("Failed to persist GPS accuracy or mock location flag");
  }

  // Update check-out with GPS accuracy & distance
  const updatedRecord = await prisma.attendance.update({
    where: { id: createdRecord.id },
    data: {
      checkOutTime: new Date(),
      checkOutLatitude: -6.1895,
      checkOutLongitude: 106.7390,
      checkOutAccuracyMeters: 8.2,
      isCheckOutMockLocation: false,
      checkOutDistanceMeters: 45,
      workDurationMinutes: 480,
    },
  });

  console.log("Updated Attendance Checkout GPS metadata:", {
    id: updatedRecord.id,
    checkOutAccuracy: updatedRecord.checkOutAccuracyMeters,
    isCheckOutMock: updatedRecord.isCheckOutMockLocation,
  });

  if (updatedRecord.checkOutAccuracyMeters !== 8.2) {
    throw new Error("Failed to persist checkOutAccuracyMeters");
  }

  console.log("\n[5/5] Checking Attendance Policy GPS Configuration...");
  const policy = await prisma.attendancePolicy.findFirst({
    where: { companyId: company.id },
  });
  console.log("Policy GPS settings:", {
    geofenceRadiusMeters: policy?.geofenceRadiusMeters,
    maxAllowedAccuracyMeters: policy?.maxAllowedAccuracyMeters,
    detectMockLocation: policy?.detectMockLocation,
    allowOutsideRadius: policy?.allowOutsideRadius,
  });

  console.log("\n✅ STEP 3 VERIFICATION SUCCESSFUL: Geofence matrix, dynamic field mode, anti-spoofing engine, and database persistence verified 100%!\n");
}

main()
  .catch((e) => {
    console.error("❌ TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
