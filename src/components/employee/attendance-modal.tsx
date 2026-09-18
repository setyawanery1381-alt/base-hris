"use client";
import React, { useState, useEffect } from "react";
import { MapPin, Camera, Clock, ShieldCheck, AlertCircle, CheckCircle, Navigation } from "lucide-react";
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
  // Default coordinates: office location (as in Pro-Int screenshot: -6.189099, 106.738826)
  const defaultLat = officeLocation?.latitude || -6.189099;
  const defaultLng = officeLocation?.longitude || 106.738826;

  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);
  const [isOutside, setIsOutside] = useState(false);
  const [workType, setWorkType] = useState<"WFO" | "WFH">("WFO");
  const [selfieTaken, setSelfieTaken] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Live digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update coordinates when simulation toggle changes
  const toggleLocationSimulation = (simulateOutside: boolean) => {
    setIsOutside(simulateOutside);
    if (simulateOutside) {
      // 5km away from office
      setLatitude(defaultLat + 0.05);
      setLongitude(defaultLng + 0.05);
    } else {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
    }
  };

  const handleSubmit = async () => {
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
          photoUrl: selfieTaken ? "/selfie-avatar.jpg" : undefined,
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
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError("Kesalahan koneksi.");
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
      onClose={onClose}
      title={type === "checkin" ? "Rekam Kehadiran (Check-In)" : "Selesai Kerja (Check-Out)"}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Pro-Int Inspired Server Time Card */}
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

        {/* Status Alerts */}
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

        {/* GPS Geofence Simulation Tester */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Navigation className="w-3.5 h-3.5 text-teal-600" />
              <span>Lokasi & Geofence (Radius: {policy?.geofenceRadiusMeters || 150}m)</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                !isOutside
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {!isOutside ? "✓ Di Dalam Kantor" : "✗ Di Luar Kantor"}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Kantor: <strong>{officeLocation?.name || "Puri Indah, Jakarta"}</strong>
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => toggleLocationSimulation(false)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                !isOutside
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              📍 Dalam Geofence (0m)
            </button>
            <button
              type="button"
              onClick={() => toggleLocationSimulation(true)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                isOutside
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              🚗 Luar Geofence (5km)
            </button>
          </div>
        </div>

        {/* Selfie Camera Verification Box */}
        {policy?.isSelfieRequired && (
          <div className="bg-slate-900 rounded-2xl p-4 text-white text-center relative overflow-hidden">
            <div className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-teal-400 flex items-center justify-center bg-slate-800 relative">
              <Camera className="w-8 h-8 text-teal-400" />
              {selfieTaken && (
                <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-2">
              Kamera Verifikasi Wajah Aktif
            </p>
            <p className="text-[10px] text-slate-400">
              Foto selfie digunakan untuk validasi kehadiran
            </p>
          </div>
        )}

        {/* Work Type Selection */}
        <div className="flex items-center space-x-2 pt-1">
          <label className="text-xs font-semibold text-slate-700">Tipe:</label>
          <div className="flex space-x-2">
            {(["WFO", "WFH"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWorkType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  workType === t
                    ? "bg-teal-700 text-white border-teal-700"
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
          className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${
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