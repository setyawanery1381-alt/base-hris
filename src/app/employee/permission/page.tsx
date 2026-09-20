"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  FileText,
  Paperclip,
  XCircle,
  Sparkles,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeePermissionPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [permissionTypes, setPermissionTypes] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"apply" | "history">("apply");

  // Form states
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("10:30");
  const [reason, setReason] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [meRes, permRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/permission?mine=true"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (permRes.ok) {
        const data = await permRes.json();
        setPermissionTypes(data.permissionTypes || []);
        setMyRequests(data.requests || []);
        if (data.permissionTypes?.length > 0 && !selectedTypeId) {
          setSelectedTypeId(data.permissionTypes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedType = permissionTypes.find((pt) => pt.id === selectedTypeId);

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    if (eMin <= sMin) return 0;
    return Math.round(((eMin - sMin) / 60) * 10) / 10;
  };

  const calculatedDuration = selectedType?.category === "DAILY" ? 8.0 : calculateHours();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFeedback("");

    try {
      const res = await fetch("/api/v1/permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissionTypeId: selectedTypeId,
          date,
          startTime: selectedType?.category === "DAILY" ? "08:00" : startTime,
          endTime: selectedType?.category === "DAILY" ? "17:00" : endTime,
          reason,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengajukan izin.");
        setIsLoading(false);
        return;
      }

      setFeedback(data.message || "Pengajuan izin berhasil dikirim!");
      setReason("");
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
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan izin ini?")) return;
    setCancellingId(id);
    setError("");
    try {
      const res = await fetch(`/api/v1/permission/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Dibatalkan oleh karyawan" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback("Pengajuan izin berhasil dibatalkan.");
        loadData();
        setTimeout(() => setFeedback(""), 3000);
      } else {
        setError(data.error || "Gagal membatalkan pengajuan izin.");
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
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeView === "apply" ? "bg-white text-slate-900 shadow-xs" : "text-white/80"
                }`}
              >
                Ajukan Izin
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
          <h1 className="text-lg font-black tracking-tight">Manajemen Izin Karyawan</h1>
          <p className="text-[11px] text-white/80">
            Izin terlambat datang, pulang awal, izin keluar kantor, dan urusan pribadi.
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

          {/* VIEW 1: APPLY PERMISSION */}
          {activeView === "apply" && (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50/70 p-2.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Formulir Pengajuan Izin Baru</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Jenis Izin</label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none"
                >
                  {permissionTypes.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.category === "HOURLY" ? "Jam-Jaman" : "1 Hari"})
                    </option>
                  ))}
                </select>
                {selectedType?.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ℹ️ {selectedType.description}
                  </p>
                )}
              </div>

              {/* Policy constraints callout */}
              {selectedType && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Kategori Izin:</span>
                    <strong className="text-slate-800">
                      {selectedType.category === "HOURLY" ? "Jam-Jaman (Hourly)" : "Harian (1 Hari Penuh)"}
                    </strong>
                  </div>
                  {selectedType.category === "HOURLY" && selectedType.maxHours && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Maksimal Durasi Izin:</span>
                      <strong className="text-indigo-600">{selectedType.maxHours} Jam</strong>
                    </div>
                  )}
                  {selectedType.requiresAttachment && (
                    <p className="text-amber-700 font-semibold flex items-center space-x-1 pt-1">
                      <span>📎</span>
                      <span>Wajib melampirkan dokumen / surat bukti pendukung.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Date Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Tanggal Izin</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Time Pickers (If Hourly) */}
              {selectedType?.category === "HOURLY" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Jam Mulai Izin</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Jam Selesai Izin</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* Duration Preview */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-600">Estimasi Durasi Izin:</span>
                <span className="font-black text-sm text-indigo-700 font-mono">
                  {selectedType?.category === "DAILY" ? "1 Hari Penuh" : `${calculatedDuration} Jam`}
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Alasan Izin</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Mengantar orang tua kontrol dokter / perpanjangan SIM..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Lampiran Dokumen / Surat Bukti {selectedType?.requiresAttachment && <span className="text-rose-500">* (Wajib)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={Boolean(selectedType?.requiresAttachment)}
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="URL atau link dokumen bukti pendukung"
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
                Kirim Pengajuan Izin
              </Button>
            </form>
          )}

          {/* VIEW 2: MY REQUESTS HISTORY */}
          {activeView === "history" && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Riwayat Pengajuan Izin Saya
              </h2>

              {myRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Belum Ada Pengajuan Izin</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Anda belum pernah mengajukan izin kerja.
                  </p>
                  <button
                    onClick={() => setActiveView("apply")}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Ajukan Sekarang
                  </button>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        {req.typeDefinition?.name || req.permissionType}
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
                      📅 {new Date(req.date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" • "}
                      <strong className="text-slate-800">
                        {req.startTime} - {req.endTime} ({req.durationHours} Jam)
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
