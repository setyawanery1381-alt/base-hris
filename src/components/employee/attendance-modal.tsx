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
  Upload,
  RefreshCw,
  Crosshair,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "checkin" | "checkout";
  policy: any;
  officeLocation: any;
  todayRecord: any;
  onSuccess: () => void;
}

// Haversine formula to compute distance in meters
function computeDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
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

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  type,
  policy,
  officeLocation,
  todayRecord,
  onSuccess,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const defaultLat = officeLocation?.latitude || -6.189099;
  const defaultLng = officeLocation?.longitude || 106.738826;

  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);
  const [isOutside, setIsOutside] = useState(false);
  const [workType, setWorkType] = useState<"WFO" | "WFH">("WFO");

  // Camera state
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // GPS state
  const [isLocating, setIsLocating] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live distance from office location
  const currentDistance = computeDistance(latitude, longitude, defaultLat, defaultLng);
  const maxRadius = policy?.geofenceRadiusMeters || 150;
  const isWithinGeofence = currentDistance <= maxRadius;

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  };

  // Start camera helper
  const startCamera = async () => {
    setCameraError(null);
    setIsStartingCamera(true);
    stopCamera();

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser tidak mendukung WebRTC Camera. Gunakan tombol 'Pilih Foto' di bawah.");
        setIsStartingCamera(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Izin kamera ditolak. Silakan izinkan akses kamera di setelan browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Perangkat kamera tidak ditemukan pada laptop/HP ini.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("Kamera sedang digunakan oleh aplikasi lain.");
      } else {
        setCameraError("Gagal mengaktifkan kamera: " + (err.message || "Kesalahan tidak diketahui"));
      }
    }
  };

  // Lifecycle: open/close camera
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      setPhotoData(null);
      if (policy?.isSelfieRequired !== false) {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, policy?.isSelfieRequired]);

  // Capture frame to canvas
  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const width = video.videoWidth || 480;
      const height = video.videoHeight || 360;

      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = Math.round((height / width) * 480);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror horizontally to match selfie preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Watermark: timestamp and lat/long
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.fillText(
          `${new Date().toLocaleTimeString("id-ID")} • ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          8,
          canvas.height - 8
        );

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setPhotoData(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error("Capture photo error:", err);
      setError("Gagal mengambil foto.");
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setPhotoData(null);
    startCamera();
  };

  // Fallback: upload from gallery / camera
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotoData(ev.target.result as string);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fallback: use demo avatar photo
  const useDemoPhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 320, 320);
      grad.addColorStop(0, "#0f766e");
      grad.addColorStop(1, "#115e59");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 320);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SELFIE DEMO", 160, 140);
      ctx.font = "14px monospace";
      ctx.fillText(new Date().toLocaleTimeString("id-ID"), 160, 175);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#99f6e4";
      ctx.fillText("Verifikasi Kehadiran BASE HRIS", 160, 205);

      setPhotoData(canvas.toDataURL("image/jpeg", 0.8));
      stopCamera();
    }
  };

  // Real GPS detection
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
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setError("Gagal membaca GPS: " + (err.message || "Izin lokasi tidak diberikan"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Simulation toggle
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
    if (type === "checkin" && policy?.isSelfieRequired !== false && !photoData) {
      setError("Silakan ambil foto selfie wajah terlebih dahulu!");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const endpoint =
        type === "checkin"
          ? "/api/v1/attendance/checkin"
          : "/api/v1/attendance/checkout";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          photoUrl: photoData || undefined,
          workType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses absensi.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(data.message || "Absensi berhasil dicatat!");
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={type === "checkin" ? "Rekam Kehadiran (Check-In)" : "Selesai Kerja (Check-Out)"}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Server Time Card */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl p-4 text-white shadow-md text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] backdrop-blur-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span>Server Time</span>
          </div>
          <p className="text-xs text-teal-200 mt-1">{formattedDate}</p>
          <p className="text-3xl font-black tracking-tight my-1 font-mono">{formattedTime}</p>
          <div className="flex items-center justify-center space-x-1 text-[11px] text-teal-200/90 font-mono">
            <MapPin className="w-3 h-3" />
            <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* REAL CAMERA SELFIE SECTION */}
        {(type === "checkin" || policy?.isSelfieRequired) && (
          <div className="bg-slate-900 rounded-2xl p-3.5 text-white relative overflow-hidden shadow-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                <span>Kamera Verifikasi Wajah</span>
              </span>
              {isCameraActive && !photoData && (
                <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE CAMERA</span>
                </span>
              )}
            </div>

            {/* Video Viewport / Photo Preview */}
            <div className="relative w-full aspect-[4/3] max-h-60 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
              {photoData ? (
                // Captured Photo
                <div className="relative w-full h-full">
                  <img
                    src={photoData}
                    alt="Selfie Berhasil Diambil"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white rounded-full px-2.5 py-1 shadow-lg flex items-center space-x-1 text-[11px] font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Foto Siap</span>
                  </div>
                </div>
              ) : isCameraActive ? (
                // Live Stream
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Face outline guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-36 h-44 rounded-[50%] border-2 border-dashed border-teal-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"></div>
                  </div>
                  <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
                    <span className="bg-black/70 text-teal-200 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                      Posisikan wajah Anda di dalam lingkaran
                    </span>
                  </div>
                </div>
              ) : (
                // Loading or Error Fallback
                <div className="p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                  {cameraError ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow"
                        >
                          Nyalakan Ulang Kamera
                        </button>
                        <button
                          type="button"
                          onClick={useDemoPhoto}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-600"
                        >
                          Gunakan Foto Demo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                      <p className="text-xs text-slate-300">Menghubungkan ke kamera...</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="text-[11px] text-teal-400 underline"
                      >
                        Klik di sini jika kamera belum menyala
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {!photoData && isCameraActive && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-teal-500/25 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto Selfie</span>
                </button>
              )}

              {photoData && (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Foto Ulang</span>
                </button>
              )}

              <label className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {!photoData && !isCameraActive && (
                <button
                  type="button"
                  onClick={useDemoPhoto}
                  className="flex items-center space-x-1 bg-teal-950/80 hover:bg-teal-900 text-teal-300 px-3.5 py-2 rounded-xl text-xs font-semibold border border-teal-800/50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Foto Demo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* GPS Geofence Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-teal-600" />
              <span>Lokasi & Geofence (Radius: {maxRadius}m)</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isWithinGeofence
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isWithinGeofence ? `✓ Valid (${currentDistance}m)` : `✗ Luar Radius (${currentDistance}m)`}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Kantor: <strong>{officeLocation?.name || "Puri Indah, Jakarta"}</strong></span>
            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={isLocating}
              className="flex items-center space-x-1 text-teal-700 hover:text-teal-800 font-semibold disabled:opacity-50"
            >
              <Crosshair className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Mencari GPS..." : "Deteksi GPS Saya"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => toggleLocationSimulation(false)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                isWithinGeofence
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              📍 Di Kantor (0m)
            </button>
            <button
              type="button"
              onClick={() => toggleLocationSimulation(true)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                !isWithinGeofence
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              🚗 Luar Kantor (5km)
            </button>
          </div>
        </div>

        {/* Work Type Selection */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs font-semibold text-slate-700">Tipe Kehadiran:</label>
          <div className="flex space-x-2">
            {(["WFO", "WFH"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWorkType(t)}
                className={`px-3.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  workType === t
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
            type === "checkin"
              ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-700/25"
              : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-700/25"
          }`}
        >
          {type === "checkin" ? "KIRIM ABSEN MASUK" : "KIRIM ABSEN KELUAR"}
        </Button>
      </div>
    </Modal>
  );
};