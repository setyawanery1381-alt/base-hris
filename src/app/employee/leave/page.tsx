"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  XCircle,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeLeavePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"apply" | "history">("apply");

  // Form states
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [dayType, setDayType] = useState("FULL_DAY");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split("T")[0];
  });
  const [reason, setReason] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [meRes, leaveRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/leave?mine=true"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setLeaveTypes(data.leaveTypes || []);
        setBalances(data.balances || []);
        setMyRequests(data.requests || []);
        if (data.leaveTypes?.length > 0 && !selectedTypeId) {
          setSelectedTypeId(data.leaveTypes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedType = leaveTypes.find((lt) => lt.id === selectedTypeId);
  const selectedBalance = balances.find((b) => b.leaveTypeId === selectedTypeId);

  // Approximate duration calculation for UI feedback
  const getEstimatedDays = () => {
    if (dayType === "FIRST_HALF" || dayType === "SECOND_HALF") return 0.5;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++; // exclude Sat & Sun in rough estimate
      cur.setDate(cur.getDate() + 1);
    }
    return count || 1;
  };

  const estimatedDuration = getEstimatedDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFeedback("");

    try {
      const res = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: selectedTypeId,
          startDate,
          endDate: dayType !== "FULL_DAY" ? startDate : endDate,
          dayType,
          reason,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengajukan cuti.");
        setIsLoading(false);
        return;
      }

      setFeedback(data.message || "Pengajuan cuti berhasil dikirim!");
      setReason("");
      setAttachmentUrl("");
      loadData();
      setActiveView("history");
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      setError("Kesalahan koneksi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan cuti ini?")) return;
    setCancellingId(id);
    setError("");
    try {
      const res = await fetch(`/api/v1/leave/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Dibatalkan oleh karyawan" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback("Pengajuan cuti berhasil dibatalkan.");
        loadData();
        setTimeout(() => setFeedback(""), 3000);
      } else {
        setError(data.error || "Gagal membatalkan pengajuan cuti.");
      }
    } catch (e) {
      setError("Terjadi gangguan koneksi.");
    } finally {
      setCancellingId(null);
    }
  };

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
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeView === "apply" ? "bg-white text-slate-900 shadow-xs" : "text-white/80"
                }`}
              >
                Ajukan Cuti
              </button>
              <button
                onClick={() => setActiveView("history")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeView === "history" ? "bg-white text-slate-900 shadow-xs" : "text-white/80"
                }`}
              >
                Riwayat ({myRequests.length})
              </button>
            </div>
          </div>
          <h1 className="text-lg font-black tracking-tight">Manajemen Cuti Karyawan</h1>
          <p className="text-[11px] text-white/80">
            Pantau kuota sisa cuti Anda dan ajukan permohonan secara mandiri.
          </p>
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

          {/* Leave Balances Carousel / Grid */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
              Sisa Kuota Cuti Anda ({new Date().getFullYear()})
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {balances.slice(0, 4).map((b) => {
                const percent = b.entitlement > 0 ? Math.round((b.remaining / b.entitlement) * 100) : 100;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedTypeId(b.leaveTypeId);
                      setActiveView("apply");
                    }}
                    className={`p-3 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs ${
                      selectedTypeId === b.leaveTypeId ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-slate-800 truncate">
                        {b.leaveType?.name}
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1 my-1">
                      <span className="text-xl font-black text-slate-900">{b.remaining}</span>
                      <span className="text-[10px] text-slate-400">/ {b.entitlement} Hari</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: theme.primaryColor || "#4f46e5",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIEW 1: APPLY FORM */}
          {activeView === "apply" && (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50/70 p-2.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Formulir Pengajuan Cuti Baru</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Jenis Cuti</label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none"
                >
                  {leaveTypes.map((lt: any) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} {lt.defaultEntitlement > 0 ? `(${lt.defaultEntitlement} Hari)` : "(Fleksibel)"}
                    </option>
                  ))}
                </select>
                {selectedType?.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ℹ️ {selectedType.description}
                  </p>
                )}
              </div>

              {/* Notice days & Requirements info */}
              {(selectedType?.requiresAttachment || (selectedType?.minNoticeDays && selectedType.minNoticeDays > 0)) && (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  {selectedType.requiresAttachment && (
                    <p className="flex items-center space-x-1">
                      <span>📎</span>
                      <span className="font-semibold">Wajib melampirkan surat dokter / dokumen resmi.</span>
                    </p>
                  )}
                  {selectedType.minNoticeDays > 0 && (
                    <p className="flex items-center space-x-1">
                      <span>⏰</span>
                      <span>Kebijakan mengharuskan pengajuan minimal {selectedType.minNoticeDays} hari sebelum tanggal cuti.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Day Type Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tipe Durasi Cuti</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "FULL_DAY", label: "Full Day" },
                    { id: "FIRST_HALF", label: "Setengah Hari (Pagi)" },
                    { id: "SECOND_HALF", label: "Setengah Hari (Siang)" },
                  ].map((dt) => {
                    const isDisabled = dt.id !== "FULL_DAY" && selectedType?.allowHalfDay === false;
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setDayType(dt.id)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          dayType === dt.id
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        }`}
                      >
                        {dt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    {dayType === "FULL_DAY" ? "Tanggal Mulai" : "Tanggal Cuti"}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (dayType !== "FULL_DAY" || new Date(e.target.value) > new Date(endDate)) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {dayType === "FULL_DAY" && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* Estimated Duration Badge */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-600">Estimasi Durasi Kerja:</span>
                <span className="font-black text-sm text-indigo-700 font-mono">
                  {estimatedDuration} Hari Kerja
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Alasan Cuti</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Keperluan keluarga / rawat inap di RS..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Attachment URL / Document */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Lampiran Dokumen / Surat Dokter {selectedType?.requiresAttachment && <span className="text-rose-500">* (Wajib)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={Boolean(selectedType?.requiresAttachment)}
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="URL atau link dokumen bukti (Google Drive, Cloudinary, dsb.)"
                    className="w-full p-2.5 pl-8 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <Paperclip className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor || "#4f46e5"}, ${
                    theme.secondaryColor || "#4338ca"
                  })`,
                }}
                className="w-full py-3 text-sm font-bold rounded-xl text-white shadow-md hover:opacity-95 cursor-pointer"
              >
                Kirim Pengajuan Cuti
              </Button>
            </form>
          )}

          {/* VIEW 2: MY LEAVE REQUESTS HISTORY */}
          {activeView === "history" && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Riwayat Pengajuan Cuti Saya
              </h2>

              {myRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Belum Ada Pengajuan</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Anda belum pernah mengajukan cuti pada tahun ini.
                  </p>
                  <button
                    onClick={() => setActiveView("apply")}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Ajukan Sekarang
                  </button>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        {req.leaveType?.name}
                      </span>
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
                        {req.status}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium">
                      📅 {new Date(req.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      {req.dayType === "FULL_DAY" && ` - ${new Date(req.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
                      {" • "}
                      <strong className="text-slate-800">{req.durationDays} Hari ({req.dayType})</strong>
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
