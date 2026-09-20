"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  MapPin,
  Camera,
  Calendar,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAYS_OF_WEEK = [
  { key: "MON", label: "Senin" },
  { key: "TUE", label: "Selasa" },
  { key: "WED", label: "Rabu" },
  { key: "THU", label: "Kamis" },
  { key: "FRI", label: "Jumat" },
  { key: "SAT", label: "Sabtu" },
  { key: "SUN", label: "Minggu" },
];

export default function AttendancePolicyPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "Kebijakan Kantor Utama",
    workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    workStartTime: "08:30",
    workEndTime: "17:30",
    checkInWindowStartMinutes: 60,
    checkInWindowEndMinutes: 240,
    lateToleranceMinutes: 15,
    earlyCheckoutToleranceMinutes: 0,
    geofenceRadiusMeters: 100,
    isSelfieRequired: true,
    isGpsRequired: true,
    breakDurationMinutes: 60,
    isOvertimeAllowed: true,
    minOvertimeMinutes: 30,
    isCorrectionAllowed: true,
    maxCorrectionDays: 7,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [authRes, policyRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/attendance/policy"),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSession(authData.user);
      }

      if (policyRes.ok) {
        const policyData = await policyRes.json();
        if (policyData.policy) {
          setFormData({
            name: policyData.policy.name || "Kebijakan Kantor Utama",
            workingDays: Array.isArray(policyData.policy.workingDays)
              ? policyData.policy.workingDays
              : ["MON", "TUE", "WED", "THU", "FRI"],
            workStartTime: policyData.policy.workStartTime || "08:30",
            workEndTime: policyData.policy.workEndTime || "17:30",
            checkInWindowStartMinutes: policyData.policy.checkInWindowStartMinutes ?? 60,
            checkInWindowEndMinutes: policyData.policy.checkInWindowEndMinutes ?? 240,
            lateToleranceMinutes: policyData.policy.lateToleranceMinutes ?? 15,
            earlyCheckoutToleranceMinutes: policyData.policy.earlyCheckoutToleranceMinutes ?? 0,
            geofenceRadiusMeters: policyData.policy.geofenceRadiusMeters ?? 100,
            isSelfieRequired: policyData.policy.isSelfieRequired ?? true,
            isGpsRequired: policyData.policy.isGpsRequired ?? true,
            breakDurationMinutes: policyData.policy.breakDurationMinutes ?? 60,
            isOvertimeAllowed: policyData.policy.isOvertimeAllowed ?? true,
            minOvertimeMinutes: policyData.policy.minOvertimeMinutes ?? 30,
            isCorrectionAllowed: policyData.policy.isCorrectionAllowed ?? true,
            maxCorrectionDays: policyData.policy.maxCorrectionDays ?? 7,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Gagal memuat konfigurasi kebijakan absensi." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleDay = (dayKey: string) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(dayKey);
      const newDays = exists
        ? prev.workingDays.filter((d) => d !== dayKey)
        : [...prev.workingDays, dayKey];
      return { ...prev, workingDays: newDays };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const res = await fetch("/api/v1/attendance/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ type: "error", message: data.error || "Gagal menyimpan kebijakan." });
        setSaving(false);
        return;
      }

      setToast({ type: "success", message: "Kebijakan absensi berhasil diperbarui dan diterapkan ke seluruh sistem!" });
    } catch (err) {
      setToast({ type: "error", message: "Terjadi gangguan jaringan atau server." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell user={session}>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Header with Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin/attendance" className="hover:text-primary transition-colors flex items-center">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Kembali ke Rekap Absensi
              </Link>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              <span>Konfigurasi Kebijakan Absensi</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur jam kerja, toleransi keterlambatan, batasan radius geofence, validasi selfie, dan pengajuan koreksi untuk {session?.companyName}.
            </p>
          </div>

          <Button
            onClick={handleSave}
            isLoading={saving}
            className="rounded-xl px-5 py-2.5 text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Simpan Perubahan</span>
          </Button>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center space-x-3 transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400 text-xs">
            Memuat konfigurasi kebijakan absensi...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Nama Kebijakan & Hari Kerja */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">1. Jadwal & Hari Kerja Perusahaan</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Kebijakan
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                    placeholder="Contoh: Kebijakan Kantor Utama"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Hari Kerja Aktif
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = formData.workingDays.includes(day.key);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleToggleDay(day.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hari yang tidak dipilih otomatis dianggap sebagai hari libur (Off-Day).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Jam Kerja & Jendela Absensi */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">2. Jam Kerja, Jendela Waktu & Toleransi</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jam Masuk Standar
                  </label>
                  <input
                    type="time"
                    value={formData.workStartTime}
                    onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Waktu mulai kerja</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jam Pulang Standar
                  </label>
                  <input
                    type="time"
                    value={formData.workEndTime}
                    onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Waktu selesai kerja</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Toleransi Telat (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={formData.lateToleranceMinutes}
                    onChange={(e) => setFormData({ ...formData, lateToleranceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Status tetap Present jika &le; toleransi</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Toleransi Pulang Awal (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={formData.earlyCheckoutToleranceMinutes}
                    onChange={(e) => setFormData({ ...formData, earlyCheckoutToleranceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Diizinkan pulang tanpa flag Early Leave</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jendela Mulai Check-In (Menit Sebelum Jam Kerja)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={formData.checkInWindowStartMinutes}
                    onChange={(e) => setFormData({ ...formData, checkInWindowStartMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Misal: 60 menit = absensi dibuka pukul {formData.workStartTime ? `${Math.floor(parseInt(formData.workStartTime.split(":")[0]) - 1).toString().padStart(2, '0')}:${formData.workStartTime.split(":")[1]}` : "07:30"}.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Batas Akhir Check-In / Cutoff (Menit Setelah Jam Kerja)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={formData.checkInWindowEndMinutes}
                    onChange={(e) => setFormData({ ...formData, checkInWindowEndMinutes: parseInt(e.target.value) || 240 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Setelah batas ini terlewati, check-in otomatis ditolak dan diarahkan ke permohonan Izin / Koreksi.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Validasi Geofence & Foto Selfie */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <MapPin className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">3. Validasi Lokasi Geofence & Kamera Selfie</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Wajibkan Verifikasi GPS</p>
                      <p className="text-[11px] text-slate-500">Mendeteksi koordinat GPS perangkat saat absensi</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isGpsRequired}
                        onChange={(e) => setFormData({ ...formData, isGpsRequired: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Radius Geofence Maksimal (Meter)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="5000"
                        value={formData.geofenceRadiusMeters}
                        onChange={(e) => setFormData({ ...formData, geofenceRadiusMeters: parseInt(e.target.value) || 100 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">meter</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Karyawan harus berada dalam radius ini dari titik koordinat kantor yang terdaftar.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Wajibkan Foto Selfie</p>
                      <p className="text-[11px] text-slate-500">Mengharuskan foto wajah langsung dari kamera saat check-in</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSelfieRequired}
                        onChange={(e) => setFormData({ ...formData, isSelfieRequired: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Durasi Istirahat Harian (Menit)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formData.breakDurationMinutes}
                        onChange={(e) => setFormData({ ...formData, breakDurationMinutes: parseInt(e.target.value) || 60 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">menit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Dipakai untuk menghitung jam kerja efektif (Work Duration = Out - In - Break).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Aturan Lembur & Koreksi Absensi */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Sliders className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">4. Aturan Lembur (Overtime) & Koreksi Absensi</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Izinkan Lembur Kerja</p>
                      <p className="text-[11px] text-slate-500">Karyawan dapat mengajukan atau dihitung lembur setelah jam pulang</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isOvertimeAllowed}
                        onChange={(e) => setFormData({ ...formData, isOvertimeAllowed: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Minimal Menit Lembur Dihitung
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="15"
                        max="180"
                        value={formData.minOvertimeMinutes}
                        onChange={(e) => setFormData({ ...formData, minOvertimeMinutes: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">menit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kelebihan jam kerja di bawah angka ini tidak dihitung sebagai lembur.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="font-bold text-xs text-slate-800">Izinkan Pengajuan Koreksi Absen</p>
                      <p className="text-[11px] text-slate-500">Karyawan dapat mengajukan koreksi jika lupa check-in / check-out</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isCorrectionAllowed}
                        onChange={(e) => setFormData({ ...formData, isCorrectionAllowed: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Batas Maksimal Pengajuan Koreksi (Hari ke Belakang)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={formData.maxCorrectionDays}
                        onChange={(e) => setFormData({ ...formData, maxCorrectionDays: parseInt(e.target.value) || 7 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">hari</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Koreksi tidak dapat diajukan untuk tanggal yang melebihi batas hari ini.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Link href="/admin/attendance">
                <Button variant="outline" type="button" className="rounded-xl px-5 py-2.5 text-xs font-bold">
                  Batal
                </Button>
              </Link>
              <Button
                type="submit"
                isLoading={saving}
                className="rounded-xl px-6 py-2.5 text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                <span>Simpan Kebijakan Absensi</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
