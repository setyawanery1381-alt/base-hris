"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Camera,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Navigation,
  RotateCcw,
  RefreshCw,
  Crosshair,
  SwitchCamera,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { captureWithWatermark } from "@/lib/watermark";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "checkin" | "checkout";
  policy: any;
  officeLocation: any;
  todayRecord: any;
  onSuccess: () => void;
  attendanceMode?: string;
  employeeName?: string;
  employeeNumber?: string;
}

function computeDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  type,
  policy,
  officeLocation,
  todayRecord,
  onSuccess,
  attendanceMode,
  employeeName,
  employeeNumber,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const defaultLat = officeLocation?.latitude || -6.189099;
  const defaultLng = officeLocation?.longitude || 106.738826;

  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isOutside, setIsOutside] = useState(false);
  const [workType, setWorkType] = useState<"WFO" | "WFH" | "FIELD">("WFO");

  // Dual-Photo State: Selfie (wajib) & Area/Activity (opsional/rekomendasi lapangan)
  const [activePhotoTab, setActivePhotoTab] = useState<"selfie" | "area">("selfie");
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [areaPhoto, setAreaPhoto] = useState<string | null>(null);

  // Camera Controls
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDistance = computeDistance(latitude, longitude, defaultLat, defaultLng);
  const maxRadius = policy?.geofenceRadiusMeters || 150;
  const effectiveMode = attendanceMode || policy?.attendanceMode || "OFFICE";
  const isFieldMode = effectiveMode === "FIELD";
  const isWithinGeofence = isFieldMode || currentDistance <= maxRadius || Boolean(policy?.allowOutsideRadius);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  };

  const startCamera = async (preferredFacing?: "user" | "environment") => {
    setCameraError(null);
    setIsStartingCamera(true);

    const modeToUse = preferredFacing || facingMode;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser ini tidak mendukung akses kamera langsung.");
        setIsStartingCamera(false);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: modeToUse,
            width: { ideal: 1080 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      } catch (e) {
        // Fallback without constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: modeToUse },
          audio: false,
        });
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        try {
          await video.play();
        } catch (playErr) {
          console.log("Autoplay deferred:", playErr);
        }
      }

      setIsCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Izin kamera ditolak. Silakan izinkan akses kamera di peramban Anda.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setCameraError("Gagal menyalakan kamera: " + (err.message || "Kesalahan peramban"));
      }
    }
  };

  // Switch facing mode (Front vs Rear)
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Switch active tab (Selfie vs Area)
  const switchPhotoTab = (tab: "selfie" | "area") => {
    setActivePhotoTab(tab);
    const targetFacing = tab === "selfie" ? "user" : "environment";
    setFacingMode(targetFacing);
    const currentPhoto = tab === "selfie" ? selfiePhoto : areaPhoto;
    if (!currentPhoto) {
      startCamera(targetFacing);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      setSelfiePhoto(null);
      setAreaPhoto(null);
      setActivePhotoTab("selfie");
      setFacingMode("user");
      startCamera("user");
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const isFront = facingMode === "user";
      const catTitle = activePhotoTab === "selfie"
        ? (type === "checkin" ? "CHECK-IN SELFIE" : "CHECK-OUT SELFIE")
        : (type === "checkin" ? "CHECK-IN AREA KERJA" : "CHECK-OUT AREA KERJA");

      const compressedBase64 = captureWithWatermark(videoRef.current, {
        appName: "BASE HRIS",
        categoryTitle: catTitle,
        mode: effectiveMode,
        employeeName: employeeName || "Karyawan",
        employeeId: employeeNumber || undefined,
        latitude,
        longitude,
        accuracyMeters: accuracyMeters || undefined,
        address: officeLocation?.name || (isFieldMode ? "Area Lapangan Dinamis" : "Puri Indah Office"),
        timestamp: new Date(),
        isFrontCamera: isFront,
      });

      if (activePhotoTab === "selfie") {
        setSelfiePhoto(compressedBase64);
      } else {
        setAreaPhoto(compressedBase64);
      }

      stopCamera();
    } catch (err: any) {
      console.error("Capture photo error:", err);
      setError("Gagal memproses foto dan watermark: " + err.message);
    }
  };

  const retakePhoto = () => {
    if (activePhotoTab === "selfie") {
      setSelfiePhoto(null);
    } else {
      setAreaPhoto(null);
    }
    startCamera(facingMode);
  };

  const detectCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Browser tidak mendukung GPS Geolocation.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracyMeters(pos.coords.accuracy);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setError("Gagal membaca GPS: " + (err.message || "Izin lokasi tidak diberikan"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleLocationSimulation = (simulateOutside: boolean) => {
    setIsOutside(simulateOutside);
    if (simulateOutside) {
      setLatitude(defaultLat + 0.045);
      setLongitude(defaultLng + 0.045);
    } else {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
    }
  };

  const handleSubmit = async () => {
    if (policy?.isSelfieRequired !== false && !selfiePhoto) {
      setError("Foto selfie wajah wajib diambil untuk validasi bukti absensi!");
      setActivePhotoTab("selfie");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const endpoint = type === "checkin" ? "/api/v1/attendance/checkin" : "/api/v1/attendance/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracyMeters,
          photoUrl: selfiePhoto || undefined,
          areaPhotoUrl: areaPhoto || undefined,
          workType: isFieldMode ? "FIELD" : workType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses absensi.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(data.message || "Absensi & bukti foto berhasil diverifikasi!");
      setTimeout(() => {
        setIsLoading(false);
        stopCamera();
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError("Kesalahan koneksi: " + err.message);
      setIsLoading(false);
    }
  };

  const formattedDate = currentTime.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const activePhoto = activePhotoTab === "selfie" ? selfiePhoto : areaPhoto;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={type === "checkin" ? "GET TIME: Rekam Check-In Kerja" : "GET TIME: Rekam Check-Out Kerja"}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Server Time & Mode Badge Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold backdrop-blur-sm border border-white/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{effectiveMode} MODE</span>
          </div>
          <p className="text-xs text-indigo-200 mt-1">{formattedDate}</p>
          <p className="text-3xl font-black tracking-tight my-1 font-mono">{formattedTime}</p>
          <div className="flex items-center justify-center space-x-1 text-[11px] text-indigo-300 font-mono">
            <MapPin className="w-3 h-3 text-indigo-400" />
            <span>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
              {accuracyMeters ? ` (±${Math.round(accuracyMeters)}m)` : ""}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* DUAL PHOTO EVIDENCE TABS */}
        <div className="bg-slate-900 rounded-2xl p-3.5 text-white relative overflow-hidden shadow-lg border border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => switchPhotoTab("selfie")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activePhotoTab === "selfie"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>1. Selfie Wajah</span>
                {selfiePhoto && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => switchPhotoTab("area")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activePhotoTab === "area"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>2. Area / Lokasi</span>
                {areaPhoto && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />}
              </button>
            </div>

            {/* Switch Camera Button (Front / Rear) */}
            {!activePhoto && isCameraActive && (
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 flex items-center space-x-1 text-[10px] font-semibold"
                title="Ganti Kamera Depan / Belakang"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">
                  {facingMode === "user" ? "Kamera Depan" : "Kamera Belakang"}
                </span>
              </button>
            )}
          </div>

          {/* Video Viewport / Photo Preview */}
          <div className="relative w-full aspect-[4/3] max-h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              } ${
                !activePhoto && isCameraActive ? "opacity-100 block" : "opacity-0 hidden pointer-events-none"
              }`}
            />

            {/* Guides on Live Video */}
            {!activePhoto && isCameraActive && activePhotoTab === "selfie" && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-36 h-48 rounded-[50%] border-2 border-dashed border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"></div>
                </div>
                <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
                  <span className="bg-black/75 text-indigo-200 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    Posisikan wajah Anda di dalam lingkaran panduan
                  </span>
                </div>
              </>
            )}

            {!activePhoto && isCameraActive && activePhotoTab === "area" && (
              <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
                <span className="bg-black/75 text-sky-200 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  Arahkan kamera ke area storefront, kantor, atau lokasi kerja
                </span>
              </div>
            )}

            {/* Captured Photo Preview with Embedded Watermark */}
            {activePhoto && (
              <div className="relative w-full h-full">
                <img
                  src={activePhoto}
                  alt="Bukti Foto Terwatermark"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 backdrop-blur-md text-white rounded-full px-2.5 py-1 shadow-lg flex items-center space-x-1 text-[11px] font-bold border border-emerald-400/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Watermarked & Siap</span>
                </div>
              </div>
            )}

            {/* Camera Loading or Error State */}
            {!activePhoto && !isCameraActive && (
              <div className="p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                {cameraError ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow active:scale-95 transition-all"
                    >
                      Nyalakan Ulang Kamera
                    </button>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs text-slate-300">Menghubungkan ke kamera perangkat...</p>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="text-[11px] text-indigo-400 underline"
                    >
                      Klik di sini jika kamera belum aktif
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Controls Bar: Shutter & Retake */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {!activePhoto && isCameraActive && (
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {activePhotoTab === "selfie" ? "Ambil Foto Selfie Wajah" : "Ambil Foto Area Kerja"}
                </span>
              </button>
            )}

            {activePhoto && (
              <button
                type="button"
                onClick={retakePhoto}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Foto Ulang ({activePhotoTab === "selfie" ? "Selfie" : "Area"})</span>
              </button>
            )}
          </div>

          {/* Summary Thumbnails Checklist */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px]">
            <div
              onClick={() => switchPhotoTab("selfie")}
              className={`p-2 rounded-xl flex items-center space-x-2 cursor-pointer transition-all border ${
                selfiePhoto
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                {selfiePhoto ? (
                  <img src={selfiePhoto} alt="Thumb" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-200">Selfie Wajah</p>
                <p className={selfiePhoto ? "text-emerald-400" : "text-amber-400"}>
                  {selfiePhoto ? "✓ Siap" : "* Wajib"}
                </p>
              </div>
            </div>

            <div
              onClick={() => switchPhotoTab("area")}
              className={`p-2 rounded-xl flex items-center space-x-2 cursor-pointer transition-all border ${
                areaPhoto
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
                {areaPhoto ? (
                  <img src={areaPhoto} alt="Thumb" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-200">Foto Area</p>
                <p className={areaPhoto ? "text-emerald-400" : "text-slate-400"}>
                  {areaPhoto ? "✓ Siap" : "Opsional / Lapangan"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* GPS Geofence Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lokasi & Geofence GPS</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isFieldMode
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isWithinGeofence
                  ? policy?.allowOutsideRadius && currentDistance > maxRadius
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}
            >
              {isFieldMode
                ? `✓ Mode Lapangan Dinamis (${currentDistance}m)`
                : isWithinGeofence
                ? policy?.allowOutsideRadius && currentDistance > maxRadius
                  ? `⚠️ Luar Radius Ditoleransi (${currentDistance}m)`
                  : `✓ Valid Dalam Radius (${currentDistance}m)`
                : `✗ Luar Radius (${currentDistance}m / Max ${maxRadius}m)`}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Kantor / Area: <strong>{officeLocation?.name || "Puri Indah Office"}</strong>
            </span>
            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={isLocating}
              className="flex items-center space-x-1 text-indigo-700 hover:text-indigo-800 font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Crosshair className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Mencari GPS..." : "Deteksi GPS Saya"}</span>
            </button>
          </div>

          {accuracyMeters !== null && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Akurasi GPS: <strong>±{Math.round(accuracyMeters)}m</strong></span>
              <span className={`text-[10px] font-bold ${accuracyMeters <= 50 ? "text-emerald-600" : accuracyMeters <= 100 ? "text-amber-600" : "text-rose-600"}`}>
                {accuracyMeters <= 50 ? "✓ Sinyal GPS Kuat" : accuracyMeters <= 100 ? "⚠️ Sinyal Sedang" : "⚠️ Sinyal Lemah"}
              </span>
            </div>
          )}

          {/* Development / Testing GPS simulator buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => toggleLocationSimulation(false)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all cursor-pointer ${
                isWithinGeofence
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              📍 Di Radius Kantor (0m)
            </button>
            <button
              type="button"
              onClick={() => toggleLocationSimulation(true)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all cursor-pointer ${
                !isWithinGeofence
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              📍 Luar Kantor (5km)
            </button>
          </div>
        </div>

        {/* Work Type Selection */}
        {!isFieldMode && (
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-semibold text-slate-700">Tipe Kehadiran:</label>
            <div className="flex space-x-2">
              {(["WFO", "WFH"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWorkType(t)}
                  className={`px-3.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    workType === t
                      ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
            type === "checkin"
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-700/25"
              : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-700/25"
          }`}
        >
          {type === "checkin" ? "GET TIME • KIRIM CHECK-IN" : "GET TIME • KIRIM CHECK-OUT"}
        </Button>
      </div>
    </Modal>
  );
};