"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function EmployeeAttendanceHistoryPage() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Correction Modal state
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split("T")[0],
    requestedCheckIn: "08:30",
    requestedCheckOut: "17:30",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionMsg, setCorrectionMsg] = useState("");
  const [correctionErr, setCorrectionErr] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [authRes, histRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/attendance/history?month=${selectedMonth}`),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setSessionUser(authData.user);
      }
      if (histRes.ok) {
        const hist = await histRes.json();
        setHistoryData(hist);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    setSelectedMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleOpenCorrection = (record?: any) => {
    if (record) {
      setCorrectionForm({
        date: record.date ? record.date.split("T")[0] : new Date().toISOString().split("T")[0],
        requestedCheckIn: record.checkInTime
          ? new Date(record.checkInTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }).replace(".", ":")
          : "08:30",
        requestedCheckOut: record.checkOutTime
          ? new Date(record.checkOutTime).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }).replace(".", ":")
          : "17:30",
        reason: "",
      });
    } else {
      setCorrectionForm({
        date: new Date().toISOString().split("T")[0],
        requestedCheckIn: "08:30",
        requestedCheckOut: "17:30",
        reason: "",
      });
    }
    setCorrectionMsg("");
    setCorrectionErr("");
    setIsCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!correctionForm.reason) {
      setCorrectionErr("Alasan permohonan koreksi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setCorrectionErr("");
    setCorrectionMsg("");

    try {
      const res = await fetch("/api/v1/attendance/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(correctionForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setCorrectionErr(data.error || "Gagal mengajukan koreksi.");
        setIsSubmitting(false);
        return;
      }

      setCorrectionMsg(
        "Permohonan koreksi absensi berhasil dikirim ke HR Admin!"
      );
      setTimeout(() => {
        setIsSubmitting(false);
        setIsCorrectionModalOpen(false);
        loadData();
      }, 1200);
    } catch (err: any) {
      setCorrectionErr("Terjadi kesalahan: " + err.message);
      setIsSubmitting(false);
    }
  };

  const monthDisplay = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  })();

  const summary = historyData?.summary || {
    totalDays: 0,
    presentCount: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    totalWorkHours: 0,
  };

  return (
    <MobileShell
      user={sessionUser}
      pendingApprovalsCount={0}
      unreadNotificationsCount={0}
    >
      <div className="bg-slate-50 min-h-full pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white px-5 pt-5 pb-8 rounded-b-[28px] shadow-md">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/employee"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </Link>
            <h1 className="text-base font-black tracking-tight text-white">
              Riwayat Absensi
            </h1>
            <button
              onClick={() => handleOpenCorrection()}
              className="p-1.5 rounded-full bg-teal-500/30 hover:bg-teal-500/50 text-teal-200"
              title="Ajukan Koreksi"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/15 text-xs">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold tracking-wide uppercase">
              {monthDisplay}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div className="px-4 -mt-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                Hadir
              </span>
              <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                {summary.totalDays}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                Tepat
              </span>
              <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                {summary.presentCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-600 block uppercase">
                Terlambat
              </span>
              <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
                {summary.lateCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] font-bold text-blue-600 block uppercase">
                Total Jam
              </span>
              <span className="text-base font-black text-blue-700 font-mono mt-0.5 block">
                {summary.totalWorkHours}j
              </span>
            </div>
          </div>
        </div>

        {/* List of Attendance Records */}
        <div className="px-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Presensi Harian
            </h2>
            <button
              onClick={() => handleOpenCorrection()}
              className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
            >
              + Ajukan Koreksi
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Memuat data kehadiran...
            </div>
          ) : !historyData?.records || historyData.records.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm text-xs text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Belum ada catatan absensi di bulan {monthDisplay}.</p>
            </div>
          ) : (
            historyData.records.map((rec: any) => {
              const recDate = new Date(rec.date);
              const dayName = recDate.toLocaleDateString("id-ID", {
                weekday: "short",
              });
              const dateStr = recDate.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              });

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                        {dayName}
                      </span>
                      <span className="text-xs font-black text-slate-800 font-mono leading-tight mt-0.5">
                        {recDate.getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          {dateStr}
                        </span>
                        <Badge
                          variant={
                            rec.status === "PRESENT"
                              ? "success"
                              : rec.status === "LATE"
                              ? "warning"
                              : "neutral"
                          }
                          className="text-[9px] px-1.5 py-0"
                        >
                          {rec.status === "PRESENT"
                            ? "Tepat Waktu"
                            : rec.status === "LATE"
                            ? "Terlambat"
                            : "Pulang Awal"}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>
                          In:{" "}
                          {rec.checkInTime
                            ? new Date(rec.checkInTime).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "-"}
                        </span>
                        <span>•</span>
                        <span>
                          Out:{" "}
                          {rec.checkOutTime
                            ? new Date(rec.checkOutTime).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "-"}
                        </span>
                      </div>

                      {rec.workDurationMinutes && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Durasi kerja:{" "}
                          {Math.floor(rec.workDurationMinutes / 60)}j{" "}
                          {rec.workDurationMinutes % 60}m
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <button
                      onClick={() => handleOpenCorrection(rec)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-300 transition-colors"
                      title="Koreksi data ini"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Correction Request Modal */}
        <Modal
          isOpen={isCorrectionModalOpen}
          onClose={() => setIsCorrectionModalOpen(false)}
          title="Ajukan Koreksi Absensi"
        >
          <div className="space-y-3.5 text-xs">
            {correctionErr && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                {correctionErr}
              </div>
            )}
            {correctionMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                {correctionMsg}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tanggal yang Dikoreksi:
              </label>
              <input
                type="date"
                value={correctionForm.date}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, date: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jam Masuk (In):
                </label>
                <input
                  type="time"
                  value={correctionForm.requestedCheckIn}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      requestedCheckIn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jam Keluar (Out):
                </label>
                <input
                  type="time"
                  value={correctionForm.requestedCheckOut}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      requestedCheckOut: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Alasan Koreksi:
              </label>
              <textarea
                value={correctionForm.reason}
                onChange={(e) =>
                  setCorrectionForm({
                    ...correctionForm,
                    reason: e.target.value,
                  })
                }
                rows={3}
                placeholder="Contoh: Lupa melakukan check-out karena meeting dengan klien sampai larut malam."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 placeholder-slate-400 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCorrectionModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitCorrection}
                isLoading={isSubmitting}
              >
                Kirim Permohonan
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MobileShell>
  );
}
