"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Settings,
  Calendar,
  FileText,
  DollarSign,
  Briefcase,
  ExternalLink,
  Shield,
  Save,
  Ban,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminOvertimePage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "policy">("requests");
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "APPROVE" | "REJECT" | "CANCEL";
    request: any | null;
    comments: string;
  }>({
    isOpen: false,
    type: "APPROVE",
    request: null,
    comments: "",
  });

  // Policy Form State
  const [policyForm, setPolicyForm] = useState({
    minOvertimeMinutes: 60,
    maxDailyHours: 4.0,
    maxWeeklyHours: 18.0,
    requiresPreApproval: true,
    compensationType: "PAYABLE",
    roundingMinutes: 30,
    requiresAttachment: false,
    workdayMultiplier: 1.5,
    holidayMultiplier: 2.0,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, otRes, policyRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/overtime?month=${selectedMonth}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`),
        fetch("/api/v1/overtime/policy"),
      ]);

      if (meRes.ok) setSession((await meRes.json()).user);
      if (otRes.ok) {
        const data = await otRes.json();
        setOvertimes(data.requests || []);
      }
      if (policyRes.ok) {
        const polData = (await policyRes.json()).policy;
        if (polData) {
          setPolicy(polData);
          setPolicyForm({
            minOvertimeMinutes: polData.minOvertimeMinutes ?? 60,
            maxDailyHours: polData.maxDailyHours ?? 4.0,
            maxWeeklyHours: polData.maxWeeklyHours ?? 18.0,
            requiresPreApproval: polData.requiresPreApproval ?? true,
            compensationType: polData.compensationType || "PAYABLE",
            roundingMinutes: polData.roundingMinutes ?? 30,
            requiresAttachment: polData.requiresAttachment ?? false,
            workdayMultiplier: polData.workdayMultiplier ?? 1.5,
            holidayMultiplier: polData.holidayMultiplier ?? 2.0,
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: "error", text: "Gagal memuat data lembur: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, statusFilter]);

  const handleActionSubmit = async () => {
    if (!actionModal.request) return;
    try {
      const { id } = actionModal.request;
      let url = `/api/v1/overtime/${id}/action`;
      let payload: any = { action: actionModal.type, comments: actionModal.comments };

      if (actionModal.type === "CANCEL") {
        url = `/api/v1/overtime/${id}/cancel`;
        payload = { reason: actionModal.comments || "Dibatalkan oleh HR Administrator" };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses aksi.");
      }

      setFeedback({
        type: "success",
        text: data.message || `Lembur berhasil di-${actionModal.type === "APPROVE" ? "setujui" : actionModal.type === "REJECT" ? "tolak" : "batalkan"}!`,
      });
      setActionModal({ isOpen: false, type: "APPROVE", request: null, comments: "" });
      loadData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPolicy(true);
      const res = await fetch("/api/v1/overtime/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kebijakan lembur.");

      setPolicy(data.policy);
      setFeedback({ type: "success", text: "Kebijakan lembur berhasil disimpan dan diperbarui!" });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSavingPolicy(false);
    }
  };

  // Metrics
  const totalApprovedHours = overtimes
    .filter((o) => o.status === "APPROVED")
    .reduce((acc, curr) => acc + (curr.durationHours || curr.hours || 0), 0);
  const pendingCount = overtimes.filter((o) => o.status === "PENDING").length;
  const workdayCount = overtimes.filter((o) => o.overtimeType === "WORKDAY").length;
  const holidayCount = overtimes.filter((o) => o.overtimeType === "HOLIDAY").length;

  const filteredOvertimes = overtimes.filter((ot) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = `${ot.employee?.firstName || ""} ${ot.employee?.lastName || ""}`.toLowerCase();
    const nik = (ot.employee?.employeeIdNumber || "").toLowerCase();
    const reason = (ot.reason || "").toLowerCase();
    return empName.includes(q) || nik.includes(q) || reason.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2.5">
              <Clock className="w-7 h-7 text-primary" />
              <span>Manajemen Lembur (Overtime)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi permohonan lembur staf, monitoring realisasi jam kerja tambahan, dan konfigurasi kebijakan lembur perusahaan.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === "requests"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Permohonan Lembur</span>
              {pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("policy")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === "policy"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Kebijakan Lembur</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: PERMOHONAN LEMBUR */}
        {/* ========================================================= */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jam Disetujui</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{totalApprovedHours} Jam</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Approval</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{pendingCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hari Kerja (Workday)</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{workdayCount}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hari Libur (Holiday)</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{holidayCount}</p>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari karyawan / alasan..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === st
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st === "ALL" ? "Semua" : st === "PENDING" ? "Menunggu" : st === "APPROVED" ? "Disetujui" : st === "REJECTED" ? "Ditolak" : "Dibatalkan"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <label className="text-xs font-bold text-slate-500">Bulan:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Karyawan</th>
                      <th className="px-6 py-3.5">Tanggal</th>
                      <th className="px-6 py-3.5">Tipe & Jam</th>
                      <th className="px-6 py-3.5">Durasi</th>
                      <th className="px-6 py-3.5">Kompensasi</th>
                      <th className="px-6 py-3.5">Alasan & SPK</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                          Memuat data pengajuan lembur...
                        </td>
                      </tr>
                    ) : filteredOvertimes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                          Tidak ada data permohonan lembur untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredOvertimes.map((ot: any) => {
                        const duration = ot.durationHours || ot.hours || 0;
                        return (
                          <tr key={ot.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {ot.employee?.firstName?.[0] || "E"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {ot.employee?.firstName} {ot.employee?.lastName}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {ot.employee?.employeeIdNumber} • {ot.employee?.department?.name || "Dept"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">
                              {new Date(ot.date).toLocaleDateString("id-ID", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    ot.overtimeType === "HOLIDAY"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {ot.overtimeType === "HOLIDAY" ? "Hari Libur" : "Hari Kerja"}
                                </span>
                                <p className="font-mono text-xs text-slate-800">
                                  {ot.startTime} - {ot.endTime}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-black text-primary text-sm">{duration} Jam</span>
                              {ot.actualHours && (
                                <p className="text-[10px] text-slate-400">Realisasi: {ot.actualHours} jam</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                <DollarSign className="w-3 h-3 text-emerald-600" />
                                <span>{ot.compensationType === "PAYABLE" ? "Uang Lembur" : "Cuti Pengganti"}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <p className="text-slate-800 truncate" title={ot.reason}>
                                {ot.reason}
                              </p>
                              {ot.attachmentUrl && (
                                <a
                                  href={ot.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-primary hover:underline text-[11px] font-semibold mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Lampiran SPK</span>
                                </a>
                              )}
                              {ot.adminNotes && (
                                <p className="text-[10px] text-slate-400 italic mt-0.5">
                                  Catatan: {ot.adminNotes}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  ot.status === "APPROVED"
                                    ? "success"
                                    : ot.status === "PENDING"
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {ot.status === "PENDING"
                                  ? "Menunggu"
                                  : ot.status === "APPROVED"
                                  ? "Disetujui"
                                  : ot.status === "REJECTED"
                                  ? "Ditolak"
                                  : "Dibatalkan"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {ot.status === "PENDING" ? (
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    onClick={() =>
                                      setActionModal({
                                        isOpen: true,
                                        type: "APPROVE",
                                        request: ot,
                                        comments: "",
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Setujui</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      setActionModal({
                                        isOpen: true,
                                        type: "REJECT",
                                        request: ot,
                                        comments: "",
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </div>
                              ) : ot.status === "APPROVED" ? (
                                <button
                                  onClick={() =>
                                    setActionModal({
                                      isOpen: true,
                                      type: "CANCEL",
                                      request: ot,
                                      comments: "",
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center space-x-1 border border-slate-200 transition-all ml-auto"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Batalkan</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs font-semibold">Selesai</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: KEBIJAKAN LEMBUR (OVERTIME POLICY) */}
        {/* ========================================================= */}
        {activeTab === "policy" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-4xl">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Konfigurasi Aturan & Kebijakan Lembur</h2>
                <p className="text-xs text-slate-500">
                  Pengaturan batas jam lembur, pembulatan, dan persetujuan sesuai regulasi Depnaker / UU Ketenagakerjaan.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Min Overtime Minutes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Minimal Durasi Lembur (Menit)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={policyForm.minOvertimeMinutes}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, minOvertimeMinutes: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Minimal durasi agar kerja ekstra dihitung sebagai lembur resmi (default: 60 menit).
                  </p>
                </div>

                {/* Rounding Minutes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pembulatan Waktu (Menit)
                  </label>
                  <select
                    value={policyForm.roundingMinutes}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, roundingMinutes: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={1}>Tanpa Pembulatan (Menit Aktual)</option>
                    <option value={15}>15 Menit</option>
                    <option value={30}>30 Menit (Default)</option>
                    <option value={60}>60 Menit (1 Jam Penuh)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pembulatan jam lembur ke bawah sesuai kelipatan interval.
                  </p>
                </div>

                {/* Max Daily Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Batas Maksimal Lembur Harian (Jam)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.5}
                    value={policyForm.maxDailyHours}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, maxDailyHours: parseFloat(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sesuai UU Ketenagakerjaan: maksimal 4 jam per hari.
                  </p>
                </div>

                {/* Max Weekly Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Batas Maksimal Lembur Mingguan (Jam)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={40}
                    step={1}
                    value={policyForm.maxWeeklyHours}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, maxWeeklyHours: parseFloat(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sesuai UU Ketenagakerjaan: maksimal 18 jam per minggu.
                  </p>
                </div>

                {/* Multiplier Workday */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pengali Upah Lembur Hari Kerja (Multiplier)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={policyForm.workdayMultiplier}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, workdayMultiplier: parseFloat(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standar tarif jam pertama: 1.5x upah per jam.
                  </p>
                </div>

                {/* Multiplier Holiday */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pengali Upah Lembur Hari Libur (Multiplier)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={policyForm.holidayMultiplier}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, holidayMultiplier: parseFloat(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standar hari libur: 2.0x upah per jam.
                  </p>
                </div>

                {/* Compensation Type */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bentuk Kompensasi Lembur
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "PAYABLE", label: "Uang Lembur (Payable)", desc: "Dihitung dan dibayarkan pada payroll bulanan" },
                      { id: "COMP_TIME", label: "Cuti Pengganti (Comp Time)", desc: "Dikonversi menjadi tambahan kuota cuti" },
                      { id: "BOTH", label: "Keduanya (Fleksibel)", desc: "Karyawan dapat memilih uang atau cuti" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          policyForm.compensationType === opt.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="compensationType"
                            checked={policyForm.compensationType === opt.id}
                            onChange={() => setPolicyForm({ ...policyForm, compensationType: opt.id })}
                            className="text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-bold">{opt.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5 pl-5">{opt.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="sm:col-span-2 space-y-3 pt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.requiresPreApproval}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, requiresPreApproval: e.target.checked })
                      }
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Wajib Pre-Approval (Pengajuan lembur harus disetujui sebelum pekerjaan dilaksanakan)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.requiresAttachment}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, requiresAttachment: e.target.checked })
                      }
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Wajib Surat Perintah Kerja (SPK) / Bukti Penugasan Lembur
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center space-x-2 shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPolicy ? "Menyimpan..." : "Simpan Kebijakan Lembur"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Modal (Approve / Reject / Cancel) */}
        {actionModal.isOpen && actionModal.request && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  {actionModal.type === "APPROVE" ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Setujui Permohonan Lembur</span>
                    </>
                  ) : actionModal.type === "REJECT" ? (
                    <>
                      <X className="w-4 h-4 text-rose-600" />
                      <span>Tolak Permohonan Lembur</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 text-amber-600" />
                      <span>Batalkan Permohonan Lembur</span>
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5">
                <p className="text-slate-500">
                  Karyawan:{" "}
                  <strong className="text-slate-900">
                    {actionModal.request.employee?.firstName} {actionModal.request.employee?.lastName}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Tanggal:{" "}
                  <strong className="text-slate-900">
                    {new Date(actionModal.request.date).toLocaleDateString("id-ID")} (
                    {actionModal.request.startTime} - {actionModal.request.endTime})
                  </strong>
                </p>
                <p className="text-slate-500">
                  Durasi Lembur:{" "}
                  <strong className="text-primary font-bold">
                    {actionModal.request.durationHours || actionModal.request.hours} Jam
                  </strong>
                </p>
                <p className="text-slate-500">
                  Alasan: <span className="text-slate-800">{actionModal.request.reason}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Admin / Alasan:
                </label>
                <textarea
                  rows={3}
                  value={actionModal.comments}
                  onChange={(e) => setActionModal({ ...actionModal, comments: e.target.value })}
                  placeholder={
                    actionModal.type === "APPROVE"
                      ? "Contoh: Disetujui, harap selesaikan milestone tepat waktu."
                      : "Contoh: Ditolak karena jam lembur belum terverifikasi."
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Kembali
                </button>
                <button
                  onClick={handleActionSubmit}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : actionModal.type === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {actionModal.type === "APPROVE"
                    ? "Konfirmasi Setujui"
                    : actionModal.type === "REJECT"
                    ? "Konfirmasi Tolak"
                    : "Konfirmasi Batalkan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
