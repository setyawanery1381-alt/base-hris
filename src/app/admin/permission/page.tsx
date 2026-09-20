"use client";
import React, { useState, useEffect } from "react";
import {
  FileText,
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
  Search,
  Paperclip,
  Building2,
  Sliders,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

export default function AdminPermissionPage() {
  const [session, setSession] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [permissionTypes, setPermissionTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "policies">("requests");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Action Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [actionComment, setActionComment] = useState("");

  // Add/Edit Type Modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    category: "HOURLY",
    description: "",
    isPaid: true,
    requiresAttachment: false,
    maxHours: 2.0,
    maxDaysPerMonth: 2,
    isActive: true,
  });

  const loadData = async () => {
    try {
      const [authRes, permRes, typesRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/permission"),
        fetch("/api/v1/permission/types?all=true"),
      ]);
      if (authRes.ok) setSession((await authRes.json()).user);
      if (permRes.ok) {
        const data = await permRes.json();
        setRequests(data.requests || []);
      }
      if (typesRes.ok) {
        const tData = await typesRes.json();
        setPermissionTypes(tData.permissionTypes || []);
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
      const res = await fetch(`/api/v1/permission/${selectedReq.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, comments: actionComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || `Pengajuan izin berhasil di-${actionType === "APPROVE" ? "setujui" : "tolak"}!`);
        setActionModalOpen(false);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Gagal memproses aksi izin.");
      }
    } catch (e) {
      setErrorMsg("Terjadi gangguan server.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openTypeModal = (type?: any) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        code: type.code || "",
        category: type.category || "HOURLY",
        description: type.description || "",
        isPaid: type.isPaid !== false,
        requiresAttachment: Boolean(type.requiresAttachment),
        maxHours: type.maxHours || 2.0,
        maxDaysPerMonth: type.maxDaysPerMonth || 2,
        isActive: type.isActive !== false,
      });
    } else {
      setEditingType(null);
      setTypeForm({
        name: "",
        code: "",
        category: "HOURLY",
        description: "",
        isPaid: true,
        requiresAttachment: false,
        maxHours: 2.0,
        maxDaysPerMonth: 2,
        isActive: true,
      });
    }
    setTypeModalOpen(true);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingType
        ? `/api/v1/permission/types/${editingType.id}`
        : "/api/v1/permission/types";
      const method = editingType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || "Jenis izin berhasil disimpan.");
        setTypeModalOpen(false);
        loadData();
        setTimeout(() => setFeedbackMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Gagal menyimpan jenis izin.");
      }
    } catch (e) {
      setErrorMsg("Terjadi gangguan server.");
    }
  };

  const toggleTypeActive = async (type: any) => {
    try {
      const res = await fetch(`/api/v1/permission/types/${type.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !type.isActive }),
      });
      if (res.ok) {
        setFeedbackMsg(`Jenis izin '${type.name}' berhasil ${type.isActive ? "dinonaktifkan" : "diaktifkan"}.`);
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

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <AdminShell user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Izin Karyawan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pengajuan izin kerja (terlambat, pulang awal, izin keluar, urusan pribadi) & atur kebijakan izin tenant ({session?.companyName}).
            </p>
          </div>
          {activeTab === "policies" && (
            <button
              onClick={() => openTypeModal()}
              className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center space-x-1.5 shadow-md hover:bg-primary/95 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Izin Baru</span>
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
              <span className="text-xs font-bold text-slate-400 uppercase">Izin Disetujui</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{approvedCount}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Telah diverifikasi & disetujui</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Pengajuan</span>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-slate-800 mt-2">{requests.length}</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Tahun Berjalan 2026</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-400">
          {[
            { id: "requests", label: `Daftar Pengajuan Izin (${requests.length})` },
            { id: "policies", label: `Jenis & Kebijakan Izin (${permissionTypes.length})` },
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
                      <th className="px-6 py-3.5">Jenis Izin</th>
                      <th className="px-6 py-3.5">Tanggal</th>
                      <th className="px-6 py-3.5">Waktu / Durasi</th>
                      <th className="px-6 py-3.5">Alasan & Lampiran</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Aksi Persetujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          Tidak ada pengajuan izin yang sesuai filter.
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
                              {req.typeDefinition?.name || req.permissionType}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {req.permissionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {new Date(req.date).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {req.startTime} - {req.endTime}
                            <span className="block text-[11px] font-normal text-slate-500">
                              ({req.durationHours} Jam)
                            </span>
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
                                <span>Lihat Dokumen</span>
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

        {/* TAB 2: POLICIES */}
        {activeTab === "policies" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Katalog Jenis & Kebijakan Izin Perusahaan:</span>
                <p className="mt-0.5 text-[11px] text-blue-700 leading-relaxed">
                  Setiap jenis izin di bawah ini dapat diaktifkan atau dinonaktifkan sesuai kebutuhan perusahaan klien. Anda juga dapat menentukan batasan jam maksimal serta syarat dokumen pendukung.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissionTypes.map((pt) => (
                <div
                  key={pt.id}
                  className={`rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${
                    pt.isActive ? "bg-white border-slate-200" : "bg-slate-50/60 border-slate-200 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900 text-sm">{pt.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pt.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {pt.isActive ? "Aktif" : "Non-Aktif"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 min-h-[32px] mb-3 leading-relaxed">
                      {pt.description || "Kebijakan standar pengajuan izin."}
                    </p>

                    <div className="flex items-center justify-between mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Kategori</span>
                        <span className="font-bold text-slate-800">
                          {pt.category === "HOURLY" ? "⏱️ Jam-Jaman (Hourly)" : "📅 Harian (Daily)"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Batas Maksimal</span>
                        <span className="font-bold text-slate-800">
                          {pt.category === "HOURLY"
                            ? `${pt.maxHours || 4} Jam`
                            : `${pt.maxDaysPerMonth || 2} Hari / Bulan`}
                        </span>
                      </div>
                    </div>

                    {/* Attribute Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4 text-[10px] font-semibold">
                      <span className={`px-2 py-0.5 rounded-md border ${pt.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {pt.isPaid ? "Upah Dibayar" : "Potong Upah"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${pt.requiresAttachment ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {pt.requiresAttachment ? "Wajib Dokumen/Surat" : "Tanpa Lampiran"}
                      </span>
                      {pt.code && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono">
                          {pt.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleTypeActive(pt)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        pt.isActive
                          ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                          : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {pt.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => openTypeModal(pt)}
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

        {/* MODAL: APPROVE / REJECT */}
        {actionModalOpen && selectedReq && (
          <Modal
            isOpen={actionModalOpen}
            onClose={() => setActionModalOpen(false)}
            title={actionType === "APPROVE" ? "Setujui Permohonan Izin" : "Tolak Permohonan Izin"}
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">
                  {selectedReq.employee?.firstName} {selectedReq.employee?.lastName}
                </p>
                <p className="text-slate-600">
                  Jenis: <strong className="text-slate-800">{selectedReq.typeDefinition?.name || selectedReq.permissionType}</strong> • {selectedReq.startTime} - {selectedReq.endTime} ({selectedReq.durationHours} Jam)
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
                      ? "Contoh: Disetujui, harap tetap memperhatikan tugas harian."
                      : "Contoh: Mohon dijadwalkan ulang karena ada agenda rapat wajib."
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

        {/* MODAL: ADD / EDIT PERMISSION TYPE */}
        {typeModalOpen && (
          <Modal
            isOpen={typeModalOpen}
            onClose={() => setTypeModalOpen(false)}
            title={editingType ? "Edit Kebijakan Izin" : "Tambah Jenis Izin Baru"}
          >
            <form onSubmit={handleTypeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Nama Jenis Izin</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Contoh: Izin Datang Terlambat, Izin Keluar Kantor"
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
                  placeholder="Contoh: LATE_ARRIVAL, EARLY_LEAVE"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono focus:outline-none focus:border-primary disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Kategori Durasi Izin</label>
                <select
                  value={typeForm.category}
                  onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-primary"
                >
                  <option value="HOURLY">⏱️ Jam-Jaman (Hourly - ada jam mulai & selesai)</option>
                  <option value="DAILY">📅 Harian (Daily - 1 hari penuh)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Deskripsi / Penjelasan Kebijakan</label>
                <input
                  type="text"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Contoh: Maksimal 2 jam keterlambatan dengan alasan darurat"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              {typeForm.category === "HOURLY" ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Batas Maksimal Jam (Per Pengajuan)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={typeForm.maxHours}
                    onChange={(e) => setTypeForm({ ...typeForm, maxHours: parseFloat(e.target.value) || 2 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Batas Maksimal Hari per Bulan</label>
                  <input
                    type="number"
                    min="1"
                    value={typeForm.maxDaysPerMonth}
                    onChange={(e) => setTypeForm({ ...typeForm, maxDaysPerMonth: parseInt(e.target.value, 10) || 2 })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.isPaid}
                    onChange={(e) => setTypeForm({ ...typeForm, isPaid: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Upah Tetap Dibayar (Paid Permission)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeForm.requiresAttachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requiresAttachment: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="font-semibold text-slate-700">Wajib Lampiran Dokumen Bukti / Surat Tugas</span>
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
