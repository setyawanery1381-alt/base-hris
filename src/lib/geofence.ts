/**
 * Geofence & GPS Anti-Spoofing Utilities for BASE HRIS
 */

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function isValidCoordinates(lat?: number, lng?: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export interface MockDetectionParams {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  isMockedFromDevice?: boolean;
  previousLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
  currentTime?: Date;
}

export interface MockDetectionResult {
  isMock: boolean;
  reason?: string;
  speedKmh?: number;
}

/**
 * Detect fake GPS, mock location apps, and impossible teleportation
 */
export function detectMockLocation(params: MockDetectionParams): MockDetectionResult {
  const { latitude, longitude, accuracyMeters, isMockedFromDevice, previousLocation, currentTime } = params;

  // 1. Device direct mock provider flag (e.g. Android mock provider)
  if (isMockedFromDevice) {
    return {
      isMock: true,
      reason: "Perangkat mengaktifkan Mock Location Provider (Aplikasi Fake GPS terdeteksi)",
    };
  }

  // 2. Suspicious zero or negative accuracy
  if (accuracyMeters !== undefined && accuracyMeters !== null) {
    if (accuracyMeters <= 0) {
      return {
        isMock: true,
        reason: "Akurasi GPS tidak wajar (0m / fixed mock feed)",
      };
    }
  }

  // 3. Impossible Travel / Speed calculation (> 200 km/h)
  if (previousLocation && previousLocation.timestamp) {
    const now = currentTime || new Date();
    const prevTime = new Date(previousLocation.timestamp);
    const diffMs = Math.max(1000, now.getTime() - prevTime.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);

    // Only evaluate teleportation if difference is within 4 hours
    if (diffHours < 4) {
      const distanceMeters = calculateDistanceMeters(
        previousLocation.latitude,
        previousLocation.longitude,
        latitude,
        longitude
      );
      const distanceKm = distanceMeters / 1000;
      const speedKmh = Math.round(distanceKm / diffHours);

      // If speed exceeds 200 km/h between check-ins, flag impossible travel
      if (distanceKm > 10 && speedKmh > 200) {
        return {
          isMock: true,
          speedKmh,
          reason: `Perpindahan lokasi ekstrem terdeteksi (${Math.round(distanceKm)} km dalam ${Math.round(diffMs / 60000)} menit, kecepatan ${speedKmh} km/jam)`,
        };
      }
    }
  }

  return { isMock: false };
}

export interface GeofenceEvaluationParams {
  effectiveMode: string; // OFFICE, FIELD, HYBRID
  workType?: string; // WFO, WFH, FIELD
  currentLat: number;
  currentLng: number;
  officeLat?: number | null;
  officeLng?: number | null;
  officeRadiusMeters?: number | null;
  policyRadiusMeters?: number | null;
  allowOutsideRadius?: boolean;
}

export interface GeofenceEvaluationResult {
  isAllowed: boolean;
  distanceMeters: number;
  maxRadius: number;
  isOutside: boolean;
  isFieldMode: boolean;
  noteTag?: string;
  errorMessage?: string;
}

/**
 * Evaluate geofence compliance according to attendanceMode & policy rules
 */
export function evaluateGeofence(params: GeofenceEvaluationParams): GeofenceEvaluationResult {
  const {
    effectiveMode,
    workType = "WFO",
    currentLat,
    currentLng,
    officeLat,
    officeLng,
    officeRadiusMeters,
    policyRadiusMeters,
    allowOutsideRadius = false,
  } = params;

  const isFieldMode = effectiveMode === "FIELD";
  const isHybridRemote = effectiveMode === "HYBRID" && (workType === "FIELD" || workType === "WFH");

  // Determine office coordinates and radius
  const targetOfficeLat = officeLat || -6.189099;
  const targetOfficeLng = officeLng || 106.738826;
  const maxRadius = officeRadiusMeters || policyRadiusMeters || 100;

  const distanceMeters = calculateDistanceMeters(
    currentLat,
    currentLng,
    targetOfficeLat,
    targetOfficeLng
  );

  // FIELD MODE: Mobile workers can check-in anywhere with valid GPS
  if (isFieldMode) {
    return {
      isAllowed: true,
      distanceMeters,
      maxRadius,
      isOutside: false,
      isFieldMode: true,
      noteTag: `[Mode: FIELD] [Jarak Kantor: ${distanceMeters}m]`,
    };
  }

  // HYBRID REMOTE
  if (isHybridRemote) {
    return {
      isAllowed: true,
      distanceMeters,
      maxRadius,
      isOutside: distanceMeters > maxRadius,
      isFieldMode: false,
      noteTag: `[Mode: HYBRID-${workType}] [Jarak Kantor: ${distanceMeters}m]`,
    };
  }

  // WFO / OFFICE MODE
  if (distanceMeters <= maxRadius) {
    return {
      isAllowed: true,
      distanceMeters,
      maxRadius,
      isOutside: false,
      isFieldMode: false,
      noteTag: `[Di Radius Kantor: ${distanceMeters}m]`,
    };
  }

  // Outside office radius
  if (allowOutsideRadius) {
    return {
      isAllowed: true,
      distanceMeters,
      maxRadius,
      isOutside: true,
      isFieldMode: false,
      noteTag: `[Luar Radius Ditoleransi: ${distanceMeters}m]`,
    };
  }

  return {
    isAllowed: false,
    distanceMeters,
    maxRadius,
    isOutside: true,
    isFieldMode: false,
    errorMessage: `Anda berada di luar radius kantor (${distanceMeters}m). Batas radius yang diizinkan adalah ${maxRadius}m.`,
  };
}
