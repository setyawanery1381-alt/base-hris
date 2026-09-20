"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";

export default function EmployeeApplyLeavePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [dayType, setDayType] = useState("FULL_DAY");
  const [startDate, setStartDate] = useState("2026-10-05");
  const [endDate, setEndDate] = useState("2026-10-06");
  const [durationDays, setDurationDays] = useState(2);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [meRes, leaveRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/leave?mine=true"),
      ]);
      if (meRes.ok) setSession((await meRes.json()).user);
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setLeaveTypes(data.leaveTypes || []);
        setBalances(data.balances || []);
        if (data.leaveTypes?.length > 0) setSelectedTypeId(data.leaveTypes[0].id);
      }
    }
    load();
  }, []);

  const selectedBalance = balances.find((b: any) => b.leaveTypeId === selectedTypeId);

  const handleSubmit = async (e: any) => {
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
          endDate,
          durationDays,
          dayType,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengajukan cuti.");
        setIsLoading(false);
        return;
      }

      setFeedback("Pengajuan cuti berhasil dikirim! Menunggu persetujuan Manager.");
      setTimeout(() => {
        router.push("/employee");
      }, 1500);
    } catch (err) {
      setError("Kesalahan koneksi.");
      setIsLoading(false);
    }
  };

  return (
    <MobileShell user={session}>
      <div className="bg-slate-50 min-h-full">
        {/* Header (Pro-Int Mobile Inspired) */}
        <div
          className="text-white p-5 rounded-b-3xl shadow-md transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor}, #0f172a)`,
          }}
        >
          <button onClick={() => router.push("/employee")} className="flex items-center space-x-1.5 text-xs text-white/80 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <h1 className="text-lg font-black tracking-tight">Apply Leave (Pengajuan Cuti)</h1>
          <p className="text-[11px] text-white/80">Pilih tanggal, kirim, langsung diproses oleh atasan.</p>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {feedback && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 p-2 rounded-xl text-center">
              Step 01. Rencana Tanggal Cuti
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Applying For (Jenis Cuti)</label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:border-teal-600 focus:outline-none"
              >
                {leaveTypes.map((lt: any) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
            </div>

            {/* Entitlement Balance Callout */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <span className="font-semibold text-slate-600">Sisa Hak Cuti (Entitlement):</span>
              <span className="font-black text-sm text-teal-700 font-mono">
                {selectedBalance ? selectedBalance.remaining : 8} Hari
              </span>
            </div>

            {/* Day Type Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Tipe Durasi Cuti</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "FULL_DAY", label: "Full Day" },
                  { id: "FIRST_HALF", label: "1st Half Day" },
                  { id: "SECOND_HALF", label: "2nd Half Day" },
                ].map(dt => (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => {
                      setDayType(dt.id);
                      setDurationDays(dt.id === "FULL_DAY" ? 2 : 0.5);
                    }}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-colors ${dayType === dt.id ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Mulai Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Alasan Pengajuan Cuti *</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="cth: Keperluan keluarga di kampung halaman..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold shadow-md">
              Kirim Pengajuan Cuti
            </Button>
          </form>
        </div>
      </div>
    </MobileShell>
  );
}
