"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Briefcase,
  Paperclip,
  XCircle,
  Sparkles,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeOvertimePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [activeView, setActiveView] = useState<"apply" | "history">("apply");

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("17:30");
  const [endTime, setEndTime] = useState("20:30");
  const [reason, setReason] = useState("");
  const [projectName, setProjectName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [compensationType, setCompensationType] = useState("PAYABLE");

  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [meRes, otRes, polRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/overtime?mine=true"),
        fetch("/api/v1/overtime/policy"),
      ]);

      if (meRes.ok) setSession((await meRes.json()).user);
      if (otRes.ok) {
        const data = await otRes.json();
        setMyRequests(data.requests || []);
      }
      if (polRes.ok) {
        const polData = (await polRes.json()).policy;
        if (polData) {
          setPolicy(polData);
          if (polData.compensationType && polData.compensationType !== "BOTH") {
            setCompensationType(polData.compensationType);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    if (eMin <= sMin) return 0;

    const totalMinutes = eMin - sMin;
    const rounding = policy?.roundingMinutes || 30;
    if (rounding > 1) {
      const rounded = Math.floor(totalMinutes / rounding) * rounding;
      const res = Math.round((rounded / 60) * 100) / 100;
      return res > 0 ? res : Math.round((totalMinutes / 60) * 100) / 100;
    }
    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const calculatedDuration = calculateHours();

  // Determine workday vs holiday preview based on date
  const isWeekend = () => {
    if (!date) return false;
    const day = new Date(date).getUTCDay();
    return day === 0 || day === 6; // Sun or Sat
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFeedback("");

    try {
      const res = await fetch("/api/v1/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          reason,
          projectName: projectName.trim() || undefined,
          attachmentUrl: attachmentUrl.trim() || undefined,
          compensationType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengajukan lembur.");
        setIsLoading(false);
        return;
      }

      setFeedback(data.message || "Pengajuan lembur berhasil dikirim!");
      setReason("");
      setProjectName("");
      setAttachmentUrl("");
      loadData();
      setActiveView("history");
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      setError("Terjadi gangguan koneksi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan lembur ini?")) return;
    setCancellingId(id);
    setError("");
    try {
      const res = await fetch(`/api/v1/overtime/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Dibatalkan oleh karyawan" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback("Pengajuan lembur berhasil dibatalkan.");
        loadData();
        setTimeout(() => setFeedback(""), 3000);
      } else {
        setError(data.error || "Gagal membatalkan pengajuan lembur.");
      }
    } catch (e) {
      setError("Terjadi gangguan koneksi.");
    } finally {
      setCancellingId(null);
    }
  };

  const totalApprovedHours = myRequests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + (r.durationHours || r.hours || 0), 0);
  const totalPendingHours = myRequests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + (r.durationHours || r.hours || 0), 0);

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full pb-10">
        {/* Header */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/employee")}
              className="flex items-center space-x-1.5 text-xs text-white/80 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="flex bg-white/20 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setActiveView("apply")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeView === "apply" ? "bg-white text-slate-900 shadow-xs" : "text-white/80"
                }`}
              >
                Ajukan Lembur
              </button>
              <button
                onClick={() => setActiveView("history")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeView === "history" ? "bg-white text-slate-900 shadow-xs" : "text-white/80"
                }`}
              >
                Riwayat ({myRequests.length})
              </button>
            </div>
          </div>
          <h1 className="text-lg font-black tracking-tight">Manajemen Lembur (Overtime)</h1>
          <p className="text-[11px] text-white/80">
            Pengajuan tugas kerja tambahan, verifikasi jam lembur, dan kompensasi upah/cuti.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/20 text-xs">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="text-[10px] text-white/70 block uppercase font-bold">Lembur Disetujui</span>
              <strong className="text-sm font-black text-white">{totalApprovedHours} Jam</strong>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="text-[10px] text-white/70 block uppercase font-bold">Menunggu Approval</span>
              <strong className="text-sm font-black text-amber-300">{totalPendingHours} Jam</strong>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {feedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {/* VIEW 1: APPLY OVERTIME */}
          {activeView === "apply" && (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 p-2.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Formulir Pengajuan Lembur Baru</span>
              </div>

              {/* Policy Callout */}
              {policy && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Minimal Lembur:</span>
                    <strong className="text-slate-800">{policy.minOvertimeMinutes} Menit</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Batas Maksimal Harian:</span>
                    <strong className="text-primary">{policy.maxDailyHours} Jam / Hari</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Batas Maksimal Mingguan:</span>
                    <strong className="text-slate-800">{policy.maxWeeklyHours} Jam / Minggu</strong>
                  </div>
                  {policy.requiresAttachment && (
                    <p className="text-amber-700 font-semibold flex items-center space-x-1 pt-1">
                      <span>📎</span>
                      <span>Wajib melampirkan Surat Perintah Kerja (SPK) lembur.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tanggal Lembur</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-primary"
                  />
                  <span
                    className={`px-3 py-2.5 rounded-xl text-[10px] font-bold shrink-0 ${
                      isWeekend() ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isWeekend() ? "Hari Libur" : "Hari Kerja"}
                  </span>
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Jam Mulai Lembur</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Jam Selesai Lembur</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-600">Estimasi Durasi Lembur:</span>
                <span className="font-black text-sm text-primary font-mono">
                  {calculatedDuration} Jam
                </span>
              </div>

              {/* Compensation Type */}
              {policy?.compensationType === "BOTH" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Bentuk Kompensasi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCompensationType("PAYABLE")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        compensationType === "PAYABLE"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Uang Lembur
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompensationType("COMP_TIME")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        compensationType === "COMP_TIME"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Cuti Pengganti
                    </button>
                  </div>
                </div>
              )}

              {/* Project / Task Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Nama Proyek / Modul (Opsional)</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Contoh: Modul Payroll V2 / Server Migration"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Alasan / Deliverable Lembur</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Deskripsikan pekerjaan yang harus diselesaikan selama jam lembur..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Lampiran SPK / Bukti Tugas {policy?.requiresAttachment && <span className="text-rose-500">* (Wajib)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={Boolean(policy?.requiresAttachment)}
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="URL file dokumen SPK atau surat penugasan"
                    className="w-full p-2.5 pl-8 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                  <Paperclip className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor || "#1e40af"}, ${
                    theme.secondaryColor || "#3b82f6"
                  })`,
                }}
                className="w-full py-3 text-sm font-bold rounded-xl text-white shadow-md hover:opacity-95 cursor-pointer"
              >
                Kirim Pengajuan Lembur
              </Button>
            </form>
          )}

          {/* VIEW 2: MY REQUESTS HISTORY */}
          {activeView === "history" && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Riwayat Pengajuan Lembur Saya
              </h2>

              {myRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Belum Ada Pengajuan Lembur</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Anda belum pernah mengajukan lembur kerja.
                  </p>
                  <button
                    onClick={() => setActiveView("apply")}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs cursor-pointer"
                  >
                    Ajukan Sekarang
                  </button>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.overtimeType === "HOLIDAY"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {req.overtimeType === "HOLIDAY" ? "Hari Libur" : "Hari Kerja"}
                        </span>
                        {req.projectName && (
                          <span className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">
                            {req.projectName}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={
                          req.status === "APPROVED"
                            ? "success"
                            : req.status === "PENDING"
                            ? "warning"
                            : req.status === "CANCELLED"
                            ? "neutral"
                            : "danger"
                        }
                      >
                        {req.status === "PENDING"
                          ? "Menunggu"
                          : req.status === "APPROVED"
                          ? "Disetujui"
                          : req.status === "REJECTED"
                          ? "Ditolak"
                          : "Dibatalkan"}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium">
                      📅 {new Date(req.date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" • "}
                      <strong className="text-slate-800">
                        {req.startTime} - {req.endTime} ({req.durationHours || req.hours} Jam)
                      </strong>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Alasan: "{req.reason}"
                    </p>

                    {req.adminNotes && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded-lg">
                        Catatan Admin: {req.adminNotes}
                      </p>
                    )}

                    {req.status === "PENDING" && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          disabled={cancellingId === req.id}
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{cancellingId === req.id ? "Membatalkan..." : "Batalkan Permohonan"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
