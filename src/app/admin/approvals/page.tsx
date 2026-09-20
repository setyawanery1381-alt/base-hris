"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Check,
  X,
  Clock,
  CalendarDays,
  FileText,
  Briefcase,
  Search,
  Filter,
  Layers,
  Settings,
  AlertCircle,
  ArrowRight,
  Shield,
  UserCheck,
  Users,
  ChevronRight,
  Plus,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";

export default function AdminApprovalsPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "history" | "workflows">("inbox");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data
  const [approvalData, setApprovalData] = useState<any>({
    items: [],
    directPending: { leaves: [], permissions: [], overtimes: [] },
    counts: { total: 0, leaves: 0, permissions: 0, overtimes: 0 },
  });
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Single Action Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "APPROVE" | "REJECT";
    item: any | null;
    comments: string;
  }>({
    isOpen: false,
    type: "APPROVE",
    item: null,
    comments: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, apprRes, wfRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/approvals?module=${moduleFilter}&status=ALL`),
        fetch("/api/v1/approvals/workflows"),
      ]);

      if (meRes.ok) setSession((await meRes.json()).user);
      if (apprRes.ok) setApprovalData(await apprRes.json());
      if (wfRes.ok) {
        const wfData = await wfRes.json();
        setWorkflows(wfData.workflows || []);
        setRoles(wfData.roles || []);
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: "error", text: "Gagal memuat pusat approval: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduleFilter]);

  const handleSingleAction = async () => {
    if (!actionModal.item) return;
    try {
      const res = await fetch(`/api/v1/approvals/${actionModal.item.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionModal.type,
          comments: actionModal.comments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses persetujuan.");

      setFeedback({ type: "success", text: data.message || "Aksi persetujuan berhasil!" });
      setActionModal({ isOpen: false, type: "APPROVE", item: null, comments: "" });
      loadData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleBatchAction = async (action: "APPROVE" | "REJECT") => {
    if (selectedIds.length === 0) return;
    const confirmMsg = `Apakah Anda yakin ingin me-${action === "APPROVE" ? "setujui" : "nolak"} ${selectedIds.length} permohonan terpilih sekaligus?`;
    if (!confirm(confirmMsg)) return;

    try {
      setBatchLoading(true);
      const res = await fetch("/api/v1/approvals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: selectedIds,
          action,
          comments: `Persetujuan massal oleh ${session?.name || "HR Admin"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses persetujuan massal.");

      setFeedback({ type: "success", text: data.message });
      setSelectedIds([]);
      loadData();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelectAll = (pendingItems: any[]) => {
    if (selectedIds.length === pendingItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingItems.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const allItems = approvalData.items || [];
  const pendingItems = allItems.filter((i: any) => i.status === "PENDING");
  const historyItems = allItems.filter((i: any) => i.status !== "PENDING");

  const filteredPending = pendingItems.filter((it: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (it.requester?.name || "").toLowerCase();
    const reason = (it.targetDetails?.reason || "").toLowerCase();
    return name.includes(q) || reason.includes(q);
  });

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center space-x-2.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              <span>Pusat Persetujuan Terpadu (Unified Approval Center)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manajemen alur persetujuan berjenjang (Multi-Level Approval) untuk Cuti, Izin, Lembur, dan Reimbursement.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === "inbox"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Inbox Antrean</span>
              {pendingItems.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  {pendingItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Keputusan</span>
            </button>
            <button
              onClick={() => setActiveTab("workflows")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === "workflows"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Alur Workflow</span>
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
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: INBOX PERSETUJUAN */}
        {/* ========================================================= */}
        {activeTab === "inbox" && (
          <div className="space-y-6">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Antrean</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{pendingItems.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permohonan Cuti</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{approvalData.counts?.leaves || 0}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permohonan Izin</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{approvalData.counts?.permissions || 0}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permohonan Lembur</span>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{approvalData.counts?.overtimes || 0}</p>
                </div>
              </div>
            </div>

            {/* Filters Bar & Batch Actions */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama karyawan / alasan..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {["ALL", "LEAVE", "PERMISSION", "OVERTIME"].map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setModuleFilter(mod)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        moduleFilter === mod
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {mod === "ALL" ? "Semua Modul" : mod === "LEAVE" ? "Cuti" : mod === "PERMISSION" ? "Izin" : "Lembur"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Action Toolbar */}
              {selectedIds.length > 0 && (
                <div className="flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-lg animate-fade-in">
                  <span>{selectedIds.length} dipilih:</span>
                  <button
                    disabled={batchLoading}
                    onClick={() => handleBatchAction("APPROVE")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui Semua</span>
                  </button>
                  <button
                    disabled={batchLoading}
                    onClick={() => handleBatchAction("REJECT")}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tolak Semua</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inbox Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredPending.length > 0 && selectedIds.length === filteredPending.length}
                          onChange={() => toggleSelectAll(filteredPending)}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                      </th>
                      <th className="px-5 py-3.5">Modul</th>
                      <th className="px-5 py-3.5">Karyawan Pemohon</th>
                      <th className="px-5 py-3.5">Rincian Permohonan</th>
                      <th className="px-5 py-3.5">Tahap Approval</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                          Memuat antrean persetujuan...
                        </td>
                      </tr>
                    ) : filteredPending.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          <p className="font-bold text-slate-700 text-sm">Semua Antrean Bersih!</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Tidak ada permohonan yang menunggu persetujuan Anda saat ini.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredPending.map((item: any) => {
                        const isSelected = selectedIds.includes(item.id);
                        const mod = item.referenceModule;
                        const details = item.targetDetails;
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isSelected ? "bg-primary/5" : "hover:bg-slate-50/80"
                            }`}
                          >
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectItem(item.id)}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                  mod === "LEAVE"
                                    ? "bg-blue-100 text-blue-800"
                                    : mod === "PERMISSION"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {mod === "LEAVE" ? "CUTI" : mod === "PERMISSION" ? "IZIN" : "LEMBUR"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {item.requester?.name?.[0] || "U"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{item.requester?.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {item.requester?.employee?.department?.name || "Dept"} • {item.requester?.employee?.position?.title || "Staff"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 max-w-sm">
                              {mod === "LEAVE" && details && (
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {details.leaveType?.name} ({details.durationDays} Hari)
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {new Date(details.startDate).toLocaleDateString("id-ID")} s/d {new Date(details.endDate).toLocaleDateString("id-ID")}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate italic">"{details.reason}"</p>
                                </div>
                              )}
                              {mod === "PERMISSION" && details && (
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {details.typeDefinition?.name || details.permissionType} ({details.durationHours} Jam)
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {new Date(details.date).toLocaleDateString("id-ID")} ({details.startTime} - {details.endTime})
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate italic">"{details.reason}"</p>
                                </div>
                              )}
                              {mod === "OVERTIME" && details && (
                                <div>
                                  <p className="font-bold text-slate-800">
                                    Lembur {details.durationHours || details.hours} Jam ({details.overtimeType === "HOLIDAY" ? "Hari Libur" : "Hari Kerja"})
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {new Date(details.date).toLocaleDateString("id-ID")} ({details.startTime} - {details.endTime})
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate italic">"{details.reason}"</p>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  Tahap {item.currentStepOrder} dari {item.totalSteps}
                                </span>
                                <p className="text-[11px] text-slate-500 font-semibold">
                                  {item.currentStep?.approverType === "DIRECT_MANAGER"
                                    ? "Atasan Langsung"
                                    : item.currentStep?.approverRole?.name || "HR Admin"}
                                </p>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <Badge variant="warning">Menunggu</Badge>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() =>
                                    setActionModal({
                                      isOpen: true,
                                      type: "APPROVE",
                                      item,
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
                                      item,
                                      comments: "",
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </div>
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
        {/* TAB 2: RIWAYAT KEPUTUSAN */}
        {/* ========================================================= */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Modul</th>
                    <th className="px-6 py-3.5">Karyawan</th>
                    <th className="px-6 py-3.5">Rincian</th>
                    <th className="px-6 py-3.5">Keputusan Akhir</th>
                    <th className="px-6 py-3.5">Riwayat Peninjau</th>
                    <th className="px-6 py-3.5">Tanggal Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        Belum ada riwayat keputusan approval.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{item.referenceModule}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{item.requester?.name}</td>
                        <td className="px-6 py-4 max-w-xs text-slate-600 truncate">
                          {item.targetDetails?.reason || "Tidak ada catatan"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={item.status === "APPROVED" ? "success" : "danger"}>
                            {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          {item.history?.map((h: any, idx: number) => (
                            <p key={idx} className="text-[11px] text-slate-500">
                              Langkah {h.stepOrder}: <strong className="text-slate-700">{h.actor?.name}</strong> ({h.action})
                              {h.comments && <span className="italic"> - "{h.comments}"</span>}
                            </p>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KONFIGURASI WORKFLOW */}
        {/* ========================================================= */}
        {activeTab === "workflows" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Alur Persetujuan Berjenjang Aktif</h2>
                <p className="text-xs text-slate-500">
                  Konfigurasi urutan langkah dan peninjau untuk setiap modul pengajuan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {workflows.map((wf) => (
                <div key={wf.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
                        {wf.module}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{wf.name}</h3>
                        <p className="text-xs text-slate-400">{wf.description}</p>
                      </div>
                    </div>
                    <Badge variant={wf.isActive ? "success" : "neutral"}>
                      {wf.isActive ? "Aktif" : "Non-Aktif"}
                    </Badge>
                  </div>

                  {/* Steps Pipeline */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {wf.steps?.map((step: any, idx: number) => (
                      <React.Fragment key={step.id}>
                        <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center">
                            {step.stepOrder}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              Peninjau Tahap {step.stepOrder}
                            </span>
                            <strong className="text-xs text-slate-800">
                              {step.approverType === "DIRECT_MANAGER"
                                ? "Atasan Langsung (Direct Manager)"
                                : step.approverType === "ROLE"
                                ? `Role: ${step.approverRole?.name || "HR Admin"}`
                                : `User: ${step.approverUser?.name || "Spesifik"}`}
                            </strong>
                          </div>
                        </div>
                        {idx < wf.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Modal */}
        {actionModal.isOpen && actionModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  {actionModal.type === "APPROVE" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Setujui Permohonan ({actionModal.item.referenceModule})</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-rose-600" />
                      <span>Tolak Permohonan ({actionModal.item.referenceModule})</span>
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
                  Pemohon: <strong className="text-slate-900">{actionModal.item.requester?.name}</strong>
                </p>
                <p className="text-slate-500">
                  Tahap Persetujuan:{" "}
                  <strong className="text-primary font-bold">
                    Langkah {actionModal.item.currentStepOrder} dari {actionModal.item.totalSteps}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Alasan: <span className="text-slate-800">{actionModal.item.targetDetails?.reason}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan / Komentar Persetujuan:
                </label>
                <textarea
                  rows={3}
                  value={actionModal.comments}
                  onChange={(e) => setActionModal({ ...actionModal, comments: e.target.value })}
                  placeholder={
                    actionModal.type === "APPROVE"
                      ? "Contoh: Disetujui, pekerjaan didelegasikan ke tim."
                      : "Contoh: Ditolak karena jadwal bentrok."
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleSingleAction}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                    actionModal.type === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionModal.type === "APPROVE" ? "Konfirmasi Setujui" : "Konfirmasi Tolak"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
