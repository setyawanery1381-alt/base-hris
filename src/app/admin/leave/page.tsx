"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Check,
  X,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Plus,
  Edit2,
  Sliders,
  Search,
  FileText,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

export default function AdminLeavePage() {
  const [session, setSession] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "balances" | "policies">("requests");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal States
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [actionComment, setActionComment] = useState("");

  // Adjust Balance Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<any>(null);
  const [adjustmentValue, setAdjustmentValue] = useState("1");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Add/Edit Leave Type Modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    description: "",
    defaultEntitlement: 12,
    isPaid: true,
    requiresAttachment: false,
    minNoticeDays: 0,
    allowHalfDay: true,
    isActive: true,
  });

  const loadData = async () => {
    try {
      const [authRes, leaveRes, typesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/leave"),
        fetch("/api/v1/leave/types?all=true"),
      ]);
      if (authRes.ok) {
        const auth = await authRes.json();
        setSession(auth.user);
      }
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setRequests(data.requests || []);
        setBalances(data.balances || []);
      }
      if (typesRes.ok) {
        const tData = await typesRes.json();
        setLeaveTypes(tData.leaveTypes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionModal = (req: any, action: "APPROVE" | "REJECT") => {
    setSelectedReq(req);
    setActionType(action);
    setActionComment("");
    setActionModalOpen(true);
  };

  const handleActionSubmit = async () => {
    if (!selectedReq) return;
    setActionLoadingId(selectedReq.id);
    setFeedbackMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/v1/leave/${selectedReq.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, comments: actionComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || `Pengajuan cuti berhasil di-${actionType === "APPROVE" ? "setujui" : "tolak"}!`);
        setActionModalOpen(false);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Gagal memproses aksi cuti.");
      }
    } catch (e) {
      setErrorMsg("Terjadi gangguan server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAdjustModal = (balance: any) => {
    setSelectedBalance(balance);
    setAdjustmentValue("1");
    setAdjustmentReason("");
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalance) return;
    try {
      const res = await fetch("/api/v1/leave/balances/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedBalance.employeeId,
          leaveTypeId: selectedBalance.leaveTypeId,
          year: selectedBalance.year,
          adjustment: parseFloat(adjustmentValue),
          reason: adjustmentReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || "Saldo cuti berhasil disesuaikan.");
        setAdjustModalOpen(false);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Gagal menyesuaikan saldo.");
      }
    } catch (e) {
      setErrorMsg("Terjadi gangguan server.");
    }
  };

  const openTypeModal = (type?: any) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        code: type.code || "",
        description: type.description || "",
        defaultEntitlement: type.defaultEntitlement,
        isPaid: type.isPaid,
        requiresAttachment: type.requiresAttachment,
        minNoticeDays: type.minNoticeDays || 0,
        allowHalfDay: type.allowHalfDay !== false,
        isActive: type.isActive !== false,
      });
    } else {
      setEditingType(null);
      setTypeForm({
        name: "",
        code: "",
        description: "",
        defaultEntitlement: 12,
        isPaid: true,
        requiresAttachment: false,
        minNoticeDays: 0,
        allowHalfDay: true,
        isActive: true,
      });
    }
    setTypeModalOpen(true);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingType
        ? `/api/v1/leave/types/${editingType.id}`
        : "/api/v1/leave/types";
      const method = editingType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || "Jenis cuti berhasil disimpan.");
        setTypeModalOpen(false);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Gagal menyimpan jenis cuti.");
      }
    } catch (e) {
      setErrorMsg("Terjadi gangguan server.");
    }
  };

  const toggleTypeActive = async (type: any) => {
    try {
      const res = await fetch(`/api/v1/leave/types/${type.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !type.isActive }),
      });
      if (res.ok) {
        setFeedbackMsg(`Jenis cuti '${type.name}' berhasil ${type.isActive ? "dinonaktifkan" : "diaktifkan"}.`);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
    const matchesSearch = !searchQuery || empName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredBalances = balances.filter((b) => {
    const empName = `${b.employee?.firstName || ""} ${b.employee?.lastName || ""}`.toLowerCase();
    const nik = (b.employee?.employeeIdNumber || "").toLowerCase();
    return !searchQuery || empName.includes(searchQuery.toLowerCase()) || nik.includes(searchQuery.toLowerCase());
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Cuti & Izin Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola permohonan cuti, pantau saldo cuti karyawan, dan atur kebijakan jenis cuti opsional perusahaan.
            </p>
          </div>
          {activeTab === "policies" && (
            <button
              onClick={() => openTypeModal()}
              className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center space-x-1.5 shadow-md hover:bg-primary/95 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Cuti Baru</span>
            </button>
          )}
        </div>

        {feedbackMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Menunggu Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Perlu tindakan persetujuan HR</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Cuti Disetujui</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{approvedCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Telah disetujui & memotong kuota</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Pengajuan</span>
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{requests.length}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Tahun Berjalan 2026</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-400">
          {[
            { id: "requests", label: `Daftar Pengajuan Cuti (${requests.length})` },
            { id: "balances", label: `Saldo Cuti Karyawan (${balances.length})` },
            { id: "policies", label: `Jenis & Kebijakan Cuti (${leaveTypes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery("");
              }}
              className={`pb-3 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary font-extrabold"
                  : "hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      filterStatus === st
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {st === "ALL" ? "Semua Status" : st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Karyawan</th>
                      <th className="px-6 py-3.5">Jenis Cuti</th>
                      <th className="px-6 py-3.5">Tanggal Pelaksanaan</th>
                      <th className="px-6 py-3.5">Durasi</th>
                      <th className="px-6 py-3.5">Alasan & Dokumen</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Aksi Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          Tidak ada pengajuan cuti yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {req.employee?.firstName} {req.employee?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NIK: {req.employee?.employeeIdNumber} • {req.employee?.department?.name || "Umum"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 block">
                              {req.leaveType?.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {req.leaveType?.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {new Date(req.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(req.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {req.durationDays} Hari ({req.dayType})
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs">
                            <p className="truncate">{req.reason}</p>
                            {req.attachmentUrl && (
                              <a
                                href={req.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>Lihat Lampiran</span>
                              </a>
                            )}
                            {req.adminNotes && (
                              <p className="text-[10px] text-slate-400 mt-1 italic">
                                Note: {req.adminNotes}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
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
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => openActionModal(req, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() => openActionModal(req, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Selesai</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BALANCES */}
        {activeTab === "balances" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan / NIK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Karyawan</th>
                      <th className="px-6 py-3.5">Jenis Cuti</th>
                      <th className="px-6 py-3.5">Hak Cuti</th>
                      <th className="px-6 py-3.5">Terpakai</th>
                      <th className="px-6 py-3.5">Sisa Saldo</th>
                      <th className="px-6 py-3.5">Tahun Periode</th>
                      <th className="px-6 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBalances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          Tidak ada data saldo cuti yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredBalances.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {b.employee?.firstName} {b.employee?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NIK: {b.employee?.employeeIdNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{b.leaveType?.name}</td>
                          <td className="px-6 py-4">{b.entitlement} Hari</td>
                          <td className="px-6 py-4 text-rose-600 font-semibold">{b.used} Hari</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-extrabold text-xs border border-teal-200">
                              {b.remaining} Hari Sisa
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono">{b.year}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openAdjustModal(b)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1 ml-auto cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5 text-slate-400" />
                              <span>Sesuaikan</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POLICIES (12 Comprehensive Leave Types) */}
        {activeTab === "policies" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Katalog Kebijakan Cuti Opsional Perusahaan:</span>
                <p className="mt-0.5 text-[11px] text-blue-700 leading-relaxed">
                  Setiap jenis cuti di bawah ini bersifat opsional. Anda dapat mengaktifkan atau menonaktifkan jenis cuti sesuai kebijakan perusahaan masing-masing klien, serta menyesuaikan kuota hari dan persyaratannya.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveTypes.map((lt) => (
                <div
                  key={lt.id}
                  className={`rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${
                    lt.isActive ? "bg-white border-slate-200" : "bg-slate-50/60 border-slate-200 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-slate-900 text-sm">{lt.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lt.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {lt.isActive ? "Aktif" : "Non-Aktif"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 min-h-[32px] mb-3 leading-relaxed">
                      {lt.description || "Kebijakan standar permohonan cuti perusahaan."}
                    </p>

                    <div className="flex items-baseline space-x-1.5 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-2xl font-black text-slate-900">
                        {lt.defaultEntitlement}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">Hari / Tahun</span>
                      {lt.code && (
                        <span className="ml-auto font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {lt.code}
                        </span>
                      )}
                    </div>

                    {/* Attribute Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4 text-[10px] font-semibold">
                      <span className={`px-2 py-0.5 rounded-md border ${lt.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {lt.isPaid ? "Berbayar" : "Unpaid"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${lt.requiresAttachment ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {lt.requiresAttachment ? "Wajib Surat/Dokumen" : "Tanpa Syarat Surat"}
                      </span>
                      {lt.minNoticeDays > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          Min. {lt.minNoticeDays} Hari Sebelum
                        </span>
                      )}
                      {lt.allowHalfDay && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          Bisa Setengah Hari
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleTypeActive(lt)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        lt.isActive
                          ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                          : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {lt.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => openTypeModal(lt)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Kebijakan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: APPROVE / REJECT WITH COMMENTS */}
        {actionModalOpen && selectedReq && (
          <Modal
            isOpen={actionModalOpen}
            onClose={() => setActionModalOpen(false)}
            title={actionType === "APPROVE" ? "Setujui Permohonan Cuti" : "Tolak Permohonan Cuti"}
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">
                  {selectedReq.employee?.firstName} {selectedReq.employee?.lastName}
                </p>
                <p className="text-slate-600">
                  Jenis: <strong className="text-slate-800">{selectedReq.leaveType?.name}</strong> • {selectedReq.durationDays} Hari ({selectedReq.dayType})
                </p>
                <p className="text-slate-500">
                  Alasan: "{selectedReq.reason}"
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Catatan HR / Manager (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={
                    actionType === "APPROVE"
                      ? "Contoh: Disetujui sesuai kuota cuti tahunan."
                      : "Contoh: Mohon ajukan ulang karena ada deadline proyek mendesak."
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="secondary" onClick={() => setActionModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  variant={actionType === "APPROVE" ? "primary" : "danger"}
                  onClick={handleActionSubmit}
                  isLoading={actionLoadingId === selectedReq.id}
                >
                  {actionType === "APPROVE" ? "Konfirmasi Setujui" : "Konfirmasi Tolak"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: ADJUST BALANCE */}
        {adjustModalOpen && selectedBalance && (
          <Modal
            isOpen={adjustModalOpen}
            onClose={() => setAdjustModalOpen(false)}
            title="Sesuaikan Kuota Saldo Cuti"
          >
            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">
                  {selectedBalance.employee?.firstName} {selectedBalance.employee?.lastName}
                </p>
                <p className="text-slate-600">
                  Jenis: <strong>{selectedBalance.leaveType?.name}</strong> (Tahun {selectedBalance.year})
                </p>
                <p className="text-slate-500">
                  Saldo Saat Ini: <strong>{selectedBalance.remaining}</strong> hari sisa dari total {selectedBalance.entitlement} hari.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Penyesuaian Hari (+ untuk menambah, - untuk mengurangi)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Contoh: Isi <code>2</code> untuk menambah 2 hari, atau <code>-1</code> untuk memotong 1 hari.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Alasan Penyesuaian
                </label>
                <input
                  type="text"
                  required
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Contoh: Kompensasi kerja lembur weekend / kebijakan direksi"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  Simpan Penyesuaian
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL: ADD / EDIT LEAVE TYPE */}
        {typeModalOpen && (
          <Modal
            isOpen={typeModalOpen}
            onClose={() => setTypeModalOpen(false)}
            title={editingType ? "Edit Jenis Cuti" : "Tambah Jenis Cuti Baru"}
          >
            <form onSubmit={handleTypeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Nama Jenis Cuti</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Contoh: Cuti Bersalin, Cuti Menikah"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Kode Unik</label>
                <input
                  type="text"
                  value={typeForm.code}
                  disabled={Boolean(editingType)}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: MATERNITY, MARRIAGE"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono focus:outline-none focus:border-primary disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Deskripsi / Contoh Penggunaan</label>
                <input
                  type="text"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Contoh: Karyawan perempuan melahirkan (3 bulan)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Kuota Default (Hari)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={typeForm.defaultEntitlement}
                    onChange={(e) => setTypeForm({ ...typeForm, defaultEntitlement: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Min. Pengajuan (Hari Sebelum)</label>
                  <input
                    type="number"
                    min="0"
                    value={typeForm.minNoticeDays}
                    onChange={(e) => setTypeForm({ ...typeForm, minNoticeDays: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.isPaid}
                    onChange={(e) => setTypeForm({ ...typeForm, isPaid: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Cuti Berbayar (Mendapatkan Upah Penuh)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.requiresAttachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requiresAttachment: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Wajib Lampiran Surat Dokter / Dokumen Resmi</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.allowHalfDay}
                    onChange={(e) => setTypeForm({ ...typeForm, allowHalfDay: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Izinkan Pengajuan Setengah Hari (0.5 hari)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.isActive}
                    onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Aktifkan untuk Karyawan</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="secondary" onClick={() => setTypeModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  {editingType ? "Simpan Perubahan" : "Tambahkan"}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AdminShell>
  );
}